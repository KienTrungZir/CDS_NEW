"""
Evaluator for RAG Pipeline Output.

Phase 3: Evaluates the quality of generated output:
  - Faithfulness: Does the output follow the retrieved context?
  - Relevance: Is the retrieved context relevant to the query?
  - Completeness: Are all mandatory blocks present?
"""

import re
import unicodedata
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


def _normalize(text: str) -> str:
    """Strip Vietnamese diacritics."""
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    ).lower()


class RAGEvaluator:
    """
    Lightweight rule-based evaluator for RAG output quality.
    No LLM judge needed — uses heuristics and pattern matching.
    """

    # Required block types for a complete document
    REQUIRED_BLOCK_TYPES = {
        "BẢN TƯỜNG TRÌNH": ["header_split", "paragraph", "title", "signature_split"],
        "NGHỊ QUYẾT": ["header_split", "title", "paragraph", "signature_split"],
        "QUYẾT ĐỊNH": ["header_split", "title", "paragraph", "signature_split"],
        "CÔNG VĂN": ["header_split", "paragraph", "signature_split"],
        "BÁO CÁO": ["header_split", "title", "paragraph", "signature_split"],
        "TỜ TRÌNH": ["header_split", "title", "paragraph", "signature_split"],
        "BIÊN BẢN": ["header_split", "title", "paragraph", "signature_split"],
        "GIẤY MỜI": ["header_split", "title", "paragraph", "signature_split"],
    }

    # Key phrases that should appear in certain document types
    FAITHFULNESS_MARKERS = {
        "BẢN TƯỜNG TRÌNH": [
            "cam đoan", "cam doan",  # commitment phrase
            "sự thật", "su that",  # truth statement
            "tường trình", "tuong trinh",  # document reference
            "kính gửi", "kinh gui",  # recipient
        ],
        "NGHỊ QUYẾT": [
            "quyết nghị", "quyet nghi",
            "căn cứ", "can cu",
        ],
        "QUYẾT ĐỊNH": [
            "quyết định", "quyet dinh",
            "căn cứ", "can cu",
            "điều", "dieu",
        ],
    }

    def evaluate(
        self,
        blocks: List[Dict],
        doc_type: str,
        query: str,
        retrieved_chunks: Optional[List[Dict]] = None,
        retrieval_scores: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate the quality of generated blocks.
        
        Returns:
            {
                "overall_score": float (0-1),
                "completeness": {"score": float, "missing": [str], "details": str},
                "faithfulness": {"score": float, "markers_found": int, "details": str},
                "relevance": {"score": float, "avg_retrieval_score": float, "details": str},
                "block_count": int,
                "grade": str ("A"/"B"/"C"/"D"/"F"),
            }
        """
        completeness = self._evaluate_completeness(blocks, doc_type)
        faithfulness = self._evaluate_faithfulness(blocks, doc_type)
        relevance = self._evaluate_relevance(query, retrieved_chunks, retrieval_scores)

        # Weighted overall score
        overall = (
            completeness["score"] * 0.4
            + faithfulness["score"] * 0.35
            + relevance["score"] * 0.25
        )

        # Letter grade
        if overall >= 0.9:
            grade = "A"
        elif overall >= 0.75:
            grade = "B"
        elif overall >= 0.6:
            grade = "C"
        elif overall >= 0.4:
            grade = "D"
        else:
            grade = "F"

        return {
            "overall_score": round(overall, 3),
            "completeness": completeness,
            "faithfulness": faithfulness,
            "relevance": relevance,
            "block_count": len(blocks),
            "grade": grade,
        }

    def _evaluate_completeness(self, blocks: List[Dict], doc_type: str) -> Dict[str, Any]:
        """Check if all required block types are present."""
        required = self.REQUIRED_BLOCK_TYPES.get(doc_type, ["header_split", "title", "paragraph", "signature_split"])
        present_types = set(b.get("type") for b in blocks)

        missing = [t for t in required if t not in present_types]
        score = 1.0 - (len(missing) / max(len(required), 1))

        # Bonus for having many blocks (11 is ideal)
        block_bonus = min(len(blocks) / 11.0, 1.0) * 0.1
        score = min(score + block_bonus, 1.0)

        details = f"{len(blocks)} blocks generated, {len(missing)} required types missing."
        if missing:
            details += f" Missing: {', '.join(missing)}"

        return {"score": round(score, 3), "missing": missing, "details": details}

    def _evaluate_faithfulness(self, blocks: List[Dict], doc_type: str) -> Dict[str, Any]:
        """Check if the output follows the expected document structure."""
        markers = self.FAITHFULNESS_MARKERS.get(doc_type, [])
        if not markers:
            return {"score": 0.7, "markers_found": 0, "details": "No specific markers for this document type."}

        # Collect all text from blocks
        all_text = ""
        for block in blocks:
            text = block.get("text", "") + " " + block.get("left", "") + " " + block.get("right", "")
            all_text += text + " "
        all_text_norm = _normalize(all_text)

        found = 0
        for marker in markers:
            if marker in all_text_norm:
                found += 1

        # Deduplicate markers (some are accented/non-accented pairs)
        unique_markers = len(set(_normalize(m) for m in markers))
        score = found / max(unique_markers, 1)

        # Check for Quốc hiệu
        if "cong hoa xa hoi chu nghia viet nam" in all_text_norm:
            score = min(score + 0.1, 1.0)

        details = f"{found}/{unique_markers} faithfulness markers found in output."
        return {"score": round(score, 3), "markers_found": found, "details": details}

    def _evaluate_relevance(
        self,
        query: str,
        chunks: Optional[List[Dict]],
        retrieval_scores: Optional[Dict],
    ) -> Dict[str, Any]:
        """Evaluate the relevance of retrieved chunks to the query."""
        if not chunks:
            return {"score": 0.5, "avg_retrieval_score": 0.0, "details": "No chunks to evaluate."}

        # Average retrieval score
        scores = [c.get("rerank_score", c.get("score", 0)) for c in chunks]
        avg_score = sum(scores) / max(len(scores), 1)

        # Check if any chunk is highly relevant
        max_score = max(scores) if scores else 0
        has_high_relevance = max_score > 0.6

        score = avg_score
        if has_high_relevance:
            score = min(score + 0.15, 1.0)

        # Check query-chunk overlap (simple)
        query_norm = _normalize(query)
        query_words = set(query_norm.split())
        chunk_text_combined = _normalize(" ".join(c.get("text", "") for c in chunks))
        chunk_words = set(chunk_text_combined.split())
        word_overlap = len(query_words & chunk_words) / max(len(query_words), 1)
        score = (score + word_overlap) / 2

        details = f"Avg retrieval score: {avg_score:.3f}, max: {max_score:.3f}, word overlap: {word_overlap:.2f}"
        return {"score": round(score, 3), "avg_retrieval_score": round(avg_score, 3), "details": details}
