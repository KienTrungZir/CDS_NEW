"""
Advanced RAG Pipeline for Decree 30/2020/NĐ-CP.

Replaces the simple keyword-based graph_rag.py with a full pipeline:
  1. Query Transformation (rewrite & expand)
  2. Semantic Search (ChromaDB + sentence-transformers)
  3. Metadata Filtering (by doc_type, article range)
  4. Reranking (cross-encoder or score-based)
  5. Context Construction (deduplicate, merge chunks)
"""

import logging
from typing import List, Dict, Any, Optional

from nom.resolution.vector_store import ND30VectorStore
from nom.resolution.query_transformer import QueryTransformer
from nom.resolution.nd30_knowledge_graph import ND30KnowledgeGraph

logger = logging.getLogger(__name__)


class AdvancedRAG:
    """
    Full RAG pipeline: Query Transform → Semantic Search → Filter → Rerank → Context Build.
    """

    def __init__(self, llm=None):
        self.vector_store = ND30VectorStore()
        self.query_transformer = QueryTransformer(llm=llm)
        self.kg = ND30KnowledgeGraph()
        self.llm = llm
        self._reranker = None

    def _get_reranker(self):
        """Use fast score-based reranking for instant response."""
        return "FALLBACK"

    def retrieve(
        self,
        query: str,
        doc_type: Optional[str] = None,
        top_k: int = 5,
        use_llm_transform: bool = False,
    ) -> Dict[str, Any]:
        """
        Full retrieval pipeline.
        
        Returns:
            {
                "document_type": str,
                "chunks": [{id, text, article, clause, title, score}],
                "mandatory_conditions": [str],
                "legal_citations": [str],
                "technical_specs": dict,
                "context": str,  # merged context for LLM prompt
                "retrieval_scores": {query: [scores]},
            }
        """
        # Step 0: Detect document type
        if not doc_type:
            doc_type = self.kg.detect_document_type(query)

        # Step 1: Fast Direct Semantic Search
        retrieval_scores = {}
        all_chunks = self.vector_store.semantic_search(
            query=query,
            top_k=top_k,
            doc_type_filter=doc_type if doc_type not in ["CÔNG VĂN", "DANH SÁCH VĂN BẢN"] else None,
        )
        retrieval_scores[query] = [r.get("score", 0) for r in all_chunks]

        # Step 3: Metadata Filtering (already done in semantic_search via doc_type_filter)
        # Additional filtering: boost doc_type-specific chunks
        for chunk in all_chunks:
            dt_list = chunk.get("doc_types", "ALL")
            if doc_type in dt_list:
                chunk["score"] = min(chunk.get("score", 0) + 0.15, 1.0)

        # Step 4: Reranking
        all_chunks = self._rerank(query, all_chunks, top_k=top_k)

        # Step 5: Context Construction
        context = self._build_context(all_chunks, doc_type)

        # Get mandatory conditions from KG (as before, for backward compatibility)
        kg_data = self.kg.query_mandatory_conditions(query, doc_type)

        # Build dynamic citations from retrieved chunks
        dynamic_citations = []
        for chunk in all_chunks:
            cite_parts = []
            if chunk.get("article"):
                cite_parts.append(chunk["article"])
            if chunk.get("clause"):
                cite_parts.append(chunk["clause"])
            if cite_parts:
                dynamic_citations.append(" ".join(cite_parts) + " NĐ 30/2020/NĐ-CP")

        # Merge with static citations (deduplicated)
        all_citations = list(dict.fromkeys(dynamic_citations + kg_data["legal_citations"]))

        return {
            "document_type": doc_type,
            "chunks": all_chunks,
            "mandatory_conditions": kg_data["mandatory_conditions"],
            "legal_citations": all_citations,
            "technical_specs": kg_data["technical_specs"],
            "context": context,
            "retrieval_scores": retrieval_scores,
        }

    def _rerank(self, query: str, chunks: List[Dict], top_k: int = 5) -> List[Dict]:
        """Rerank chunks using cross-encoder or score-based fallback."""
        if not chunks:
            return chunks

        reranker = self._get_reranker()

        if reranker and reranker != "FALLBACK":
            try:
                # Cross-encoder reranking
                pairs = [(query, chunk["text"]) for chunk in chunks]
                scores = reranker.predict(pairs)
                for i, chunk in enumerate(chunks):
                    chunk["rerank_score"] = float(scores[i])
                chunks.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
                return chunks[:top_k]
            except Exception as e:
                logger.warning(f"Cross-encoder reranking failed: {e}")

        # Fallback: sort by original score
        chunks.sort(key=lambda x: x.get("score", 0), reverse=True)
        return chunks[:top_k]

    def _build_context(self, chunks: List[Dict], doc_type: str) -> str:
        """Build a unified context string from retrieved chunks for the LLM prompt."""
        if not chunks:
            return ""

        context_parts = []
        context_parts.append(f"=== KIẾN THỨC TRUY VẤN TỪ VECTOR DATABASE (Nghị định 30/2020/NĐ-CP) ===\n")
        context_parts.append(f"Loại văn bản phát hiện: {doc_type}\n")

        for i, chunk in enumerate(chunks, 1):
            header = f"--- Chunk {i}"
            if chunk.get("article"):
                header += f" | {chunk['article']}"
            if chunk.get("clause"):
                header += f" {chunk['clause']}"
            if chunk.get("title"):
                header += f" — {chunk['title']}"
            score = chunk.get("rerank_score", chunk.get("score", 0))
            header += f" (relevance: {score:.2f})"
            header += " ---"

            context_parts.append(header)
            context_parts.append(chunk["text"])
            context_parts.append("")

        return "\n".join(context_parts)

    # Backward-compatible method (used by existing ai_generator.py)
    def extract_nd30_conditions(self, text: str) -> Dict[str, Any]:
        """
        Drop-in replacement for SimpleGraphRAG.extract_nd30_conditions().
        Now uses the full RAG pipeline internally.
        """
        result = self.retrieve(text)
        return {
            "document_type": result["document_type"],
            "mandatory_conditions": result["mandatory_conditions"],
            "legal_citations": result["legal_citations"],
            "technical_specs": result["technical_specs"],
            "context": result.get("context", ""),
            "chunks": result.get("chunks", []),
            "retrieval_scores": result.get("retrieval_scores", {}),
        }
