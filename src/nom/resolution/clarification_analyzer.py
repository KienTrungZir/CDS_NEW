"""
Field Clarification Analyzer for Decree 30 Administrative Documents.

Analyzes input text against mandatory fields required by Decree 30 for each document type,
and generates targeted clarifying questions for missing mandatory information.
"""

import re
import unicodedata
from typing import List, Dict, Any


def _normalize(text: str) -> str:
    """Strip Vietnamese diacritics for matching."""
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    ).lower()


# Mandatory field definitions per document type
MANDATORY_FIELDS = {
    "BẢN TƯỜNG TRÌNH": [
        {
            "key": "person_name",
            "label": "Họ và tên người làm đơn",
            "question": "Họ và tên đầy đủ của bạn là gì?",
            "placeholder": "Nguyễn Văn A",
            "patterns": [r"tên là", r"họ tên", r"tôi tên", r"ho va ten"],
        },
        {
            "key": "dob",
            "label": "Ngày tháng năm sinh",
            "question": "Ngày tháng năm sinh của bạn?",
            "placeholder": "15/08/1995",
            "patterns": [r"sinh ngày", r"ngày sinh", r"sinh nam", r"sinh nhat"],
        },
        {
            "key": "id_card",
            "label": "Số CCCD / CMND",
            "question": "Số CCCD hoặc CMND của bạn là gì?",
            "placeholder": "001095012345",
            "patterns": [r"cccd", r"cmnd", r"căn cước", r"chứng minh", r"\d{9,12}"],
        },
        {
            "key": "address",
            "label": "Nơi cư trú / Địa chỉ",
            "question": "Địa chỉ thường trú / nơi cư trú hiện tại?",
            "placeholder": "Số 12 phố Huế, Hoàn Kiếm, Hà Nội",
            "patterns": [r"cư trú", r"địa chỉ", r"thường trú", r"trọ tại", r"ở tại"],
        },
        {
            "key": "recipient",
            "label": "Cơ quan / Người kính gửi",
            "question": "Văn bản này bạn kính gửi cho ai / cơ quan nào?",
            "placeholder": "Ban Giám đốc Công ty TNHH ABC",
            "patterns": [r"kính gửi", r"kinh gui", r"gửi cho", r"gửi ban"],
        },
        {
            "key": "event_time_place",
            "label": "Thời gian & Địa điểm xảy ra sự việc",
            "question": "Sự việc xảy ra vào lúc mấy giờ, ngày nào và ở đâu?",
            "placeholder": "16h04 ngày 09/03/2020 tại phố Huế",
            "patterns": [r"vào hồi", r"ngày \d", r"tại", r"lúc \d", r"xảy ra ở"],
        },
        {
            "key": "reason_detail",
            "label": "Diễn biến / Lý do chi tiết",
            "question": "Diễn biến chi tiết của sự việc xảy ra như thế nào?",
            "placeholder": "Tôi điều khiển xe máy va chạm với...",
            "patterns": [r"do", r"bị", r"vì", r"xảy ra", r"dẫn đến", r"dẫn tới"],
        },
    ],
    "CÔNG VĂN": [
        {
            "key": "recipient",
            "label": "Cơ quan kính gửi",
            "question": "Công văn này kính gửi cơ quan / đơn vị nào?",
            "placeholder": "Bộ Nội vụ",
            "patterns": [r"kính gửi", r"kinh gui"],
        },
        {
            "key": "subject",
            "label": "Trích yếu nội dung (Về việc)",
            "question": "Trích yếu nội dung công văn (Về việc gì)?",
            "placeholder": "V/v phối hợp tổ chức hội thảo",
            "patterns": [r"về việc", r"v/v"],
        },
        {
            "key": "issuing_body",
            "label": "Tên cơ quan ban hành",
            "question": "Tên cơ quan / đơn vị gửi công văn?",
            "placeholder": "Ủy ban nhân dân tỉnh X",
            "patterns": [r"ubnd", r"bộ", r"sở", r"công ty", r"ủy ban"],
        },
    ],
    "NGHỊ QUYẾT": [
        {
            "key": "issuing_body",
            "label": "Cơ quan ban hành (HĐND, Hội đồng...)",
            "question": "Nghị quyết do cơ quan nào ban hành?",
            "placeholder": "Hội đồng nhân dân tỉnh X",
            "patterns": [r"hđnd", r"hội đồng", r"ban chấp hành"],
        },
        {
            "key": "legal_bases",
            "label": "Căn cứ pháp lý",
            "question": "Căn cứ pháp lý nào để ban hành Nghị quyết?",
            "placeholder": "Căn cứ Luật Tổ chức chính quyền địa phương...",
            "patterns": [r"căn cứ", r"can cu"],
        },
    ],
    "QUYẾT ĐỊNH": [
        {
            "key": "issuing_body",
            "label": "Cơ quan / Người ra Quyết định",
            "question": "Ai hoặc cơ quan nào ra Quyết định này?",
            "placeholder": "Giám đốc Công ty ABC",
            "patterns": [r"giám đốc", r"ubnd", r"chủ tịch", r"trưởng ban"],
        },
        {
            "key": "subject",
            "label": "Trích yếu Quyết định (Về việc)",
            "question": "Quyết định về việc gì?",
            "placeholder": "V/v bổ nhiệm Trưởng phòng",
            "patterns": [r"về việc", r"v/v", r"bổ nhiệm", r"khen thưởng", r"xử phạt"],
        },
    ],
}


class FieldClarificationAnalyzer:
    """Analyzes text for missing mandatory Decree 30 fields and builds clarifying questions."""

    def analyze(self, text: str, doc_type: str = "BẢN TƯỜNG TRÌNH") -> Dict[str, Any]:
        """
        Analyze input text against mandatory fields.
        
        Returns:
            {
                "doc_type": str,
                "total_fields": int,
                "found_fields": [{key, label, value}],
                "missing_fields": [{key, label, question, placeholder}],
                "completion_rate": float (0.0 to 1.0)
            }
        """
        norm_text = _normalize(text)
        fields_def = MANDATORY_FIELDS.get(doc_type, MANDATORY_FIELDS["BẢN TƯỜNG TRÌNH"])

        found_fields = []
        missing_fields = []

        for field in fields_def:
            is_found = False
            found_val = ""
            for pat in field["patterns"]:
                if re.search(pat, norm_text, re.IGNORECASE):
                    is_found = True
                    break

            if is_found:
                found_fields.append({
                    "key": field["key"],
                    "label": field["label"],
                })
            else:
                missing_fields.append({
                    "key": field["key"],
                    "label": field["label"],
                    "question": field["question"],
                    "placeholder": field["placeholder"],
                })

        total = len(fields_def)
        found_count = len(found_fields)
        rate = round(found_count / max(total, 1), 2)

        return {
            "doc_type": doc_type,
            "total_fields": total,
            "found_fields": found_fields,
            "missing_fields": missing_fields,
            "completion_rate": rate,
        }
