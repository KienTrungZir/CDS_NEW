"""
Query Transformer for RAG Pipeline.

Phase 2: Takes a raw user query and rewrites it into multiple refined queries
for better semantic retrieval from the vector store.
"""

import re
import unicodedata
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


def _normalize(text: str) -> str:
    """Strip Vietnamese diacritics for matching."""
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    ).lower()


class QueryTransformer:
    """
    Transforms raw user queries into refined legal queries for better retrieval.
    
    Strategies:
    1. Rule-based expansion (fast, no LLM needed)
    2. LLM-based rewriting (optional, higher quality)
    """

    # Mapping of common terms to legal search queries
    EXPANSION_RULES = {
        # Incident / tường trình keywords
        "tuong trinh": [
            "Cấu trúc bắt buộc bản tường trình theo Nghị định 30",
            "Thông tin cá nhân bắt buộc trong văn bản hành chính",
        ],
        "va cham": [
            "Bản tường trình sự cố va chạm giao thông",
            "Thể thức văn bản hành chính theo Điều 8",
        ],
        "tai nan": [
            "Bản tường trình tai nạn",
            "Quy định về soạn thảo văn bản hành chính",
        ],
        "lam hu": [
            "Bản tường trình sự cố làm hư hỏng tài sản",
            "Quy định ký ban hành văn bản",
        ],
        "su co": [
            "Bản tường trình sự cố",
            "Diễn biến chi tiết sự việc theo trình tự thời gian",
        ],
        # Document type keywords
        "nghi quyet": [
            "Cấu trúc nghị quyết theo Nghị định 30 Phụ lục I Mẫu 1.1",
            "Thẩm quyền ký nghị quyết TM Chủ tịch",
        ],
        "quyet dinh": [
            "Cấu trúc quyết định theo Nghị định 30 Phụ lục I Mẫu 1.2",
            "Căn cứ ban hành quyết định",
        ],
        "cong van": [
            "Thể thức công văn hành chính không có tên loại",
            "Kính gửi và nơi nhận công văn",
        ],
        "bao cao": [
            "Cấu trúc báo cáo theo Nghị định 30",
            "Bố cục báo cáo tình hình thực hiện kết quả đạt được",
        ],
        "to trinh": [
            "Cấu trúc tờ trình trình cấp trên phê duyệt",
            "Lý do và căn cứ trình",
        ],
        "bien ban": [
            "Cấu trúc biên bản cuộc họp",
            "Thành phần tham dự chủ tọa thư ký biên bản",
        ],
        "giay moi": [
            "Cấu trúc giấy mời họp theo Nghị định 30",
            "Thời gian địa điểm nội dung cuộc họp",
        ],
        # Formatting keywords
        "le trang": [
            "Kỹ thuật trình bày văn bản Điều 9 định lề trang",
        ],
        "phong chu": [
            "Phông chữ Times New Roman TCVN 6909:2001",
        ],
        "quoc hieu": [
            "Quốc hiệu và Tiêu ngữ theo Điều 8 Khoản 1",
        ],
        "ky ban hanh": [
            "Ký ban hành văn bản Điều 13 thẩm quyền ký",
            "Hình thức ký TM KT TL TUQ",
        ],
        "noi nhan": [
            "Nơi nhận văn bản Điều 8 Khoản 9 cỡ chữ 11pt",
        ],
        "dau": [
            "Dấu chữ ký số cơ quan Điều 8 Khoản 8",
        ],
    }

    # General queries always included
    GENERAL_QUERIES = [
        "Thể thức văn bản hành chính các thành phần bắt buộc",
        "Kỹ thuật trình bày định lề phông chữ khổ giấy",
    ]

    def __init__(self, llm=None):
        self.llm = llm

    def transform(
        self,
        query: str,
        doc_type: Optional[str] = None,
        use_llm: bool = False,
        max_queries: int = 5,
    ) -> List[str]:
        """
        Transform a raw query into multiple refined queries.
        
        Args:
            query: Raw user input
            doc_type: Detected document type (if known)
            use_llm: Whether to use LLM for query rewriting (slower but better)
            max_queries: Maximum number of queries to return
            
        Returns:
            List of refined query strings for vector search
        """
        queries = []

        # Strategy 1: Rule-based expansion
        queries.extend(self._rule_based_expand(query, doc_type))

        # Strategy 2: LLM rewriting (optional)
        if use_llm and self.llm:
            try:
                llm_queries = self._llm_rewrite(query, doc_type)
                queries.extend(llm_queries)
            except Exception as e:
                logger.warning(f"LLM query transformation failed: {e}")

        # Always include the original query
        if query not in queries:
            queries.insert(0, query)

        # Deduplicate while preserving order
        seen = set()
        unique = []
        for q in queries:
            q_norm = _normalize(q)
            if q_norm not in seen:
                seen.add(q_norm)
                unique.append(q)

        return unique[:max_queries]

    def _rule_based_expand(self, query: str, doc_type: Optional[str] = None) -> List[str]:
        """Expand query using predefined rules."""
        query_norm = _normalize(query)
        expanded = []

        # Match against expansion rules
        for keyword, expansions in self.EXPANSION_RULES.items():
            if keyword in query_norm:
                expanded.extend(expansions)

        # Add doc_type-specific queries
        if doc_type:
            dt_norm = _normalize(doc_type)
            for keyword, expansions in self.EXPANSION_RULES.items():
                if keyword in dt_norm and keyword not in query_norm:
                    expanded.extend(expansions)

        # If no matches, add general queries
        if not expanded:
            expanded.extend(self.GENERAL_QUERIES)

        return expanded

    def _llm_rewrite(self, query: str, doc_type: Optional[str] = None) -> List[str]:
        """Use LLM to rewrite query into refined legal queries."""
        doc_type_hint = f" cho loại văn bản {doc_type}" if doc_type else ""
        prompt = f"""Bạn là chuyên gia pháp lý Việt Nam. Viết lại câu hỏi sau thành 3 câu truy vấn pháp lý chuẩn{doc_type_hint}:

Câu hỏi gốc: "{query}"

Trả về DUY NHẤT 3 dòng, mỗi dòng 1 câu truy vấn. KHÔNG giải thích thêm."""

        response = self.llm.complete(prompt, max_tokens=300)
        lines = [l.strip() for l in response.strip().split("\n") if l.strip()]
        # Clean up numbering
        cleaned = []
        for line in lines:
            line = re.sub(r"^\d+[\.\)]\s*", "", line)
            line = re.sub(r"^[-•]\s*", "", line)
            if len(line) > 10:
                cleaned.append(line)
        return cleaned[:3]
