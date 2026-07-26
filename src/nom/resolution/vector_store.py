"""
Vector Store for Decree 30/2020/NĐ-CP using ChromaDB + sentence-transformers.

Phase 1: Ingestion — Embeds legal text chunks into a persistent vector database
for semantic retrieval in the RAG pipeline.
"""

import json
import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Lazy-loaded globals to avoid import cost on startup
_chroma_client = None
_collection = None
_embedder = None
_EMBED_MODEL = "paraphrase-multilingual-mpnet-base-v2"
_COLLECTION_NAME = "nd30_decree"
_CHROMA_DIR = os.path.join(os.path.dirname(__file__), ".chroma_db")
_CHUNKS_PATH = os.path.join(os.path.dirname(__file__), "nd30_chunks.json")


def _get_embedder():
    """Lazy-load and pre-warm the sentence-transformer model."""
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer(_EMBED_MODEL)
            # Pre-warm PyTorch JIT execution
            _embedder.encode(["Khởi tạo Nghị định 30"], show_progress_bar=False)
            logger.info(f"Loaded & warmed embedding model: {_EMBED_MODEL}")
        except Exception as e:
            logger.warning(f"Cannot load sentence-transformers: {e}. Using fallback.")
            _embedder = "FALLBACK"
    return _embedder


def _get_collection():
    """Lazy-load the ChromaDB collection, creating and populating if needed."""
    global _chroma_client, _collection
    if _collection is not None:
        return _collection

    try:
        import chromadb
        _chroma_client = chromadb.PersistentClient(path=_CHROMA_DIR)

        # Check if collection exists and has data
        try:
            _collection = _chroma_client.get_collection(name=_COLLECTION_NAME)
            if _collection.count() > 0:
                logger.info(f"Loaded existing ChromaDB collection '{_COLLECTION_NAME}' with {_collection.count()} docs.")
                return _collection
        except Exception:
            pass

        # Create and populate collection
        _collection = _chroma_client.get_or_create_collection(
            name=_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )
        _ingest_chunks(_collection)
        logger.info(f"Created ChromaDB collection with {_collection.count()} docs.")
        return _collection

    except Exception as e:
        logger.warning(f"ChromaDB unavailable: {e}. Will use fallback search.")
        return None


def _ingest_chunks(collection):
    """Load nd30_chunks.json and embed into ChromaDB collection."""
    if not os.path.exists(_CHUNKS_PATH):
        logger.warning(f"Chunks file not found: {_CHUNKS_PATH}")
        return

    with open(_CHUNKS_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    embedder = _get_embedder()

    ids = []
    documents = []
    metadatas = []

    for chunk in chunks:
        chunk_id = chunk["id"]
        # Build a rich text representation for embedding
        text_parts = []
        if chunk.get("article"):
            text_parts.append(chunk["article"])
        if chunk.get("clause"):
            text_parts.append(chunk["clause"])
        if chunk.get("title"):
            text_parts.append(chunk["title"])
        text_parts.append(chunk["text"])
        full_text = " — ".join(text_parts)

        # Metadata for filtering
        meta = {
            "article": chunk.get("article", ""),
            "clause": chunk.get("clause", ""),
            "title": chunk.get("title", ""),
            "doc_types": ",".join(chunk.get("doc_types", ["ALL"])),
            "chapter": chunk.get("metadata", {}).get("chapter", ""),
            "topic": chunk.get("metadata", {}).get("topic", ""),
        }

        ids.append(chunk_id)
        documents.append(full_text)
        metadatas.append(meta)

    if embedder and embedder != "FALLBACK":
        # Use sentence-transformers for embedding
        embeddings = embedder.encode(documents, show_progress_bar=False).tolist()
        collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings,
        )
    else:
        # Let ChromaDB use its default embedding
        collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )


class ND30VectorStore:
    """
    Semantic vector store for Decree 30/2020/NĐ-CP.
    Supports: semantic_search, metadata filtering, and raw chunk retrieval.
    """

    def __init__(self):
        self._collection = None
        self._embedder = None
        self._chunks_cache = None

    @property
    def collection(self):
        if self._collection is None:
            self._collection = _get_collection()
        return self._collection

    @property
    def embedder(self):
        if self._embedder is None:
            self._embedder = _get_embedder()
        return self._embedder

    def _load_chunks_fallback(self) -> List[Dict]:
        """Load raw chunks for keyword fallback."""
        if self._chunks_cache is None:
            if os.path.exists(_CHUNKS_PATH):
                with open(_CHUNKS_PATH, "r", encoding="utf-8") as f:
                    self._chunks_cache = json.load(f)
            else:
                self._chunks_cache = []
        return self._chunks_cache

    def semantic_search(
        self,
        query: str,
        top_k: int = 5,
        doc_type_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search over NĐ 30 chunks.
        Returns list of {id, text, article, clause, title, score, doc_types}.
        """
        collection = self.collection

        if collection is None:
            # Fallback: keyword matching on raw chunks
            return self._keyword_fallback(query, top_k, doc_type_filter)

        try:
            # Build where filter for doc_type
            where_filter = None
            if doc_type_filter and doc_type_filter != "ALL":
                where_filter = {
                    "$or": [
                        {"doc_types": {"$contains": doc_type_filter}},
                        {"doc_types": {"$contains": "ALL"}},
                    ]
                }

            # Embed query
            query_embedding = None
            if self.embedder and self.embedder != "FALLBACK":
                query_embedding = self.embedder.encode([query], show_progress_bar=False).tolist()

            # Search
            if query_embedding:
                results = collection.query(
                    query_embeddings=query_embedding,
                    n_results=top_k,
                    where=where_filter,
                    include=["documents", "metadatas", "distances"],
                )
            else:
                results = collection.query(
                    query_texts=[query],
                    n_results=top_k,
                    where=where_filter,
                    include=["documents", "metadatas", "distances"],
                )

            # Format results
            output = []
            if results and results.get("ids") and results["ids"][0]:
                for i, doc_id in enumerate(results["ids"][0]):
                    distance = results["distances"][0][i] if results.get("distances") else 0
                    meta = results["metadatas"][0][i] if results.get("metadatas") else {}
                    doc_text = results["documents"][0][i] if results.get("documents") else ""
                    output.append({
                        "id": doc_id,
                        "text": doc_text,
                        "article": meta.get("article", ""),
                        "clause": meta.get("clause", ""),
                        "title": meta.get("title", ""),
                        "topic": meta.get("topic", ""),
                        "doc_types": meta.get("doc_types", "ALL"),
                        "score": round(1.0 - distance, 4),  # cosine distance → similarity
                    })
            return output

        except Exception as e:
            logger.warning(f"ChromaDB search error: {e}. Using fallback.")
            return self._keyword_fallback(query, top_k, doc_type_filter)

    def _keyword_fallback(
        self, query: str, top_k: int, doc_type_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Simple keyword matching fallback when vector DB is unavailable."""
        import unicodedata

        def normalize(s):
            return "".join(
                c for c in unicodedata.normalize("NFD", s)
                if unicodedata.category(c) != "Mn"
            ).lower()

        chunks = self._load_chunks_fallback()
        query_norm = normalize(query)
        query_words = set(query_norm.split())

        scored = []
        for chunk in chunks:
            # Filter by doc_type
            if doc_type_filter and doc_type_filter != "ALL":
                if doc_type_filter not in chunk.get("doc_types", []) and "ALL" not in chunk.get("doc_types", []):
                    continue

            chunk_text = normalize(chunk.get("text", "") + " " + chunk.get("title", ""))
            chunk_words = set(chunk_text.split())
            overlap = len(query_words & chunk_words)
            if overlap > 0:
                score = overlap / max(len(query_words), 1)
                scored.append((score, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, chunk in scored[:top_k]:
            results.append({
                "id": chunk.get("id", ""),
                "text": chunk.get("text", ""),
                "article": chunk.get("article", ""),
                "clause": chunk.get("clause", ""),
                "title": chunk.get("title", ""),
                "topic": chunk.get("metadata", {}).get("topic", ""),
                "doc_types": ",".join(chunk.get("doc_types", ["ALL"])),
                "score": round(score, 4),
            })
        return results

    def get_all_chunks(self) -> List[Dict]:
        """Return all raw chunks."""
        return self._load_chunks_fallback()
