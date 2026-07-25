import re
from typing import List, Dict, Any, Optional

class ND30KnowledgeGraph:
    """
    Knowledge Graph & Rule Engine for Decree 30/2020/NĐ-CP (Nghị định về công tác văn thư).
    Stores knowledge nodes for Document Types, Mandatory Layout Rules, Technical Format Specifications,
    Signing Authorities, and File/Registry Rules.
    """

    DOCUMENT_TYPES = {
        "NGHỊ QUYẾT": {
            "cite": "Điều 7 NĐ 30/2020/NĐ-CP & Phụ lục I (Mẫu 1.1)",
            "mandatory": [
                "Quốc hiệu & Tiêu ngữ (Phía trên bên phải, in hoa đậm & in thường đậm)",
                "Tên cơ quan ban hành (Phía trên bên trái)",
                "Số/Ký hiệu văn bản (Ví dụ: Số: 01/NQ-HĐND)",
                "Tên loại văn bản: NGHỊ QUYẾT (In hoa đậm, căn giữa)",
                "Trích yếu nội dung (In thường đậm, căn giữa)",
                "Căn cứ ban hành (In nghiêng, kết thúc bằng dấu chấm phẩy ;)",
                "Quyết nghị: Các Điều cụ thể",
                "Thẩm quyền ký: Thay mặt tập thể (TM.) hoặc Chủ tịch",
                "Nơi nhận (Góc dưới bên trái, 11pt, Lưu: VT...)"
            ]
        },
        "QUYẾT ĐỊNH": {
            "cite": "Điều 7 NĐ 30/2020/NĐ-CP & Phụ lục I (Mẫu 1.2 & 1.3)",
            "mandatory": [
                "Quốc hiệu & Tiêu ngữ (Bên phải)",
                "Tên cơ quan ban hành (Bên trái)",
                "Số/Ký hiệu văn bản (Ví dụ: Số: 15/QĐ-UBND)",
                "Tên loại văn bản: QUYẾT ĐỊNH (In hoa đậm, căn giữa)",
                "Trích yếu nội dung: Về việc... (In thường đậm)",
                "Căn cứ ban hành (In nghiêng)",
                "Quyết định: Điều 1, Điều 2...",
                "Chữ ký & Dấu cơ quan",
                "Nơi nhận: Như Điều..., Lưu: VT"
            ]
        },
        "CÔNG VĂN": {
            "cite": "Điều 7, Điều 8 & Phụ lục I (Mẫu 1.5)",
            "mandatory": [
                "Quốc hiệu & Tiêu ngữ (Bên phải trang đầu)",
                "Tên cơ quan/chủ quản (Bên trái trang đầu)",
                "Số và Ký hiệu công văn (Ví dụ: Số: 123/UBND-VP)",
                "Trích yếu nội dung sau chữ V/v (12-13pt, in thường)",
                "Kính gửi: Tên cơ quan/cá nhân trực tiếp giải quyết",
                "Nội dung công văn (Dòng đơn đến 1.5 lines, phông Times New Roman 13-14pt)",
                "Nơi nhận: Như trên, Lưu: VT",
                "Chữ ký người có thẩm quyền (Mực màu xanh đối với bản giấy)"
            ]
        },
        "BẢN TƯỜNG TRÌNH": {
            "cite": "Điều 7, Điều 8, Điều 10 NĐ 30/2020/NĐ-CP",
            "mandatory": [
                "Quốc hiệu & Tiêu ngữ: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM / Độc lập - Tự do - Hạnh phúc",
                "Tên loại văn bản: BẢN TƯỜNG TRÌNH (In hoa đậm, 14pt, căn giữa)",
                "Trích yếu: Về việc... (Ví dụ: Va chạm giao thông, Sự cố công việc...)",
                "Kính gửi: Người đứng đầu hoặc Cơ quan có thẩm quyền giải quyết",
                "Thông tin cá nhân tường trình (Họ tên, Ngày sinh, Chức vụ/Nghề nghiệp, CCCD, Địa chỉ)",
                "Diễn biến chi tiết sự việc theo trình tự thời gian",
                "Cam kết thông tin tường trình hoàn toàn đúng sự thật",
                "Chữ ký và họ tên người làm bản tường trình (Góc dưới bên phải)"
            ]
        },
        "BÁO CÁO": {
            "cite": "Điều 7 NĐ 30/2020/NĐ-CP & Phụ lục I (Mẫu 1.4)",
            "mandatory": [
                "Quốc hiệu & Tiêu ngữ",
                "Tên cơ quan/đơn vị báo cáo",
                "Tên loại văn bản: BÁO CÁO (In hoa đậm)",
                "Trích yếu nội dung báo cáo",
                "Bố cục: I. Tình hình thực hiện, II. Kết quả đạt được, III. Đề xuất kiến nghị",
                "Chữ ký người báo cáo & Nơi nhận"
            ]
        },
        "TỜ TRÌNH": {
            "cite": "Điều 7 NĐ 30/2020/NĐ-CP & Phụ lục I (Mẫu 1.4)",
            "mandatory": [
                "Quốc hiệu & Tiêu ngữ",
                "Tên cơ quan tờ trình",
                "Tên loại văn bản: TỜ TRÌNH (In hoa đậm)",
                "Kính gửi: Cơ quan cấp trên có thẩm quyền phê duyệt",
                "Lý do & Căn cứ trình",
                "Nội dung đề xuất / Đề án trình",
                "Nơi nhận & Chữ ký thủ trưởng"
            ]
        },
        "BIÊN BẢN": {
            "cite": "Điều 7 NĐ 30/2020/NĐ-CP & Phụ lục I (Mẫu 1.9)",
            "mandatory": [
                "Quốc hiệu & Tiêu ngữ",
                "Tên loại văn bản: BIÊN BẢN (In hoa đậm)",
                "Thời gian bắt đầu & Địa điểm cuộc họp/sự việc",
                "Thành phần tham dự, Chủ tọa & Thư ký ghi biên bản",
                "Nội dung chi tiết theo diễn biến",
                "Thời gian kết thúc cuộc họp",
                "Chữ ký của Thư ký & Chủ tọa (Góc dưới)"
            ]
        },
        "GIẤY MỜI": {
            "cite": "Điều 7 NĐ 30/2020/NĐ-CP & Phụ lục I (Mẫu 1.7)",
            "mandatory": [
                "Quốc hiệu & Tiêu ngữ",
                "Tên cơ quan mời",
                "Tên loại văn bản: GIẤY MỜI (In hoa đậm)",
                "Trân trọng kính mời: Họ tên/Cơ quan được mời",
                "Nội dung cuộc họp, Thời gian & Địa điểm cụ thể",
                "Chữ ký & Nơi nhận"
            ]
        }
    }

    TECHNICAL_SPECS = {
        "font_family": "Times New Roman (TCVN 6909:2001)",
        "paper_size": "Khổ A4 (210mm x 297mm)",
        "margins": "Lề trên: 20-25mm, Lề dưới: 20-25mm, Lề trái: 30-35mm, Lề phải: 15-20mm",
        "national_motto": "Quốc hiệu: 12-13pt in hoa đậm; Tiêu ngữ: 13-14pt in thường đậm",
        "signing_authority": "TM. (Thay mặt tập thể), KT. (Ký thay), TL. (Ký thừa lệnh), TUQ. (Ký thừa ủy quyền), Q. (Quyền cấp trưởng)",
        "ink_color": "Mực màu xanh đối với chữ ký trực tiếp trên văn bản giấy",
        "page_number": "Đánh từ số 1, cỡ chữ 13-14, đặt canh giữa lề trên, không hiển thị trang 1"
    }

    def __init__(self):
        pass

    def detect_document_type(self, text: str) -> str:
        """Identify the document type from user input string."""
        t = text.lower()
        if "tường trình" in t or "va chạm" in t or "tai nạn" in t or "sự cố" in t:
            return "BẢN TƯỜNG TRÌNH"
        elif "nghị quyết" in t:
            return "NGHỊ QUYẾT"
        elif "quyết định" in t:
            return "QUYẾT ĐỊNH"
        elif "báo cáo" in t:
            return "BÁO CÁO"
        elif "tờ trình" in t:
            return "TỜ TRÌNH"
        elif "biên bản" in t:
            return "BIÊN BẢN"
        elif "giấy mời" in t or "kính mời" in t:
            return "GIẤY MỜI"
        else:
            return "CÔNG VĂN"

    def query_mandatory_conditions(self, text: str, doc_type_override: Optional[str] = None) -> Dict[str, Any]:
        """Extract mandatory legal conditions, citations, and structural rules."""
        doc_type = doc_type_override or self.detect_document_type(text)
        type_info = self.DOCUMENT_TYPES.get(doc_type, self.DOCUMENT_TYPES["CÔNG VĂN"])

        legal_citations = [
            type_info["cite"],
            "Điều 8 NĐ 30/2020/NĐ-CP (Các thành phần thể thức chính)",
            "Điều 9 NĐ 30/2020/NĐ-CP (Kỹ thuật trình bày & Định lề trang)",
            "Điều 13 NĐ 30/2020/NĐ-CP (Ký ban hành văn bản)"
        ]

        mandatory_conditions = list(type_info["mandatory"])
        mandatory_conditions.extend([
            f"Định lề trang: {self.TECHNICAL_SPECS['margins']}",
            f"Phông chữ: {self.TECHNICAL_SPECS['font_family']}",
            f"Đánh số trang: {self.TECHNICAL_SPECS['page_number']}"
        ])

        return {
            "document_type": doc_type,
            "legal_citations": legal_citations,
            "mandatory_conditions": mandatory_conditions,
            "technical_specs": self.TECHNICAL_SPECS
        }

    def generate_context_rag_prompt(self, input_text: str, doc_type_override: Optional[str] = None) -> Dict[str, Any]:
        """Synthesize an engineered Generative RAG Prompt tailored to the context."""
        cond_data = self.query_mandatory_conditions(input_text, doc_type_override)
        doc_type = cond_data["document_type"]
        conditions_str = "\n".join([f"- {c}" for c in cond_data["mandatory_conditions"]])
        citations_str = ", ".join(cond_data["legal_citations"])

        engineered_prompt = f"""[HỆ THỐNG GENERATIVE RAG PROMPT ENGINEERING - NGHỊ ĐỊNH 30/2020/NĐ-CP]

Bạn là Chuyên gia Số hóa & Dàn trang Văn bản Hành chính Chính phủ Việt Nam.
Nhiệm vụ của bạn là chuyển đổi thông tin đầu vào thành cấu trúc khối JSON chuẩn Nghị định 30/2020/NĐ-CP đối với loại văn bản: {doc_type}.

CÁC ĐIỀU KIỆN BẮT BUỘC RÚT TRÍCH TỪ KNOWLEDGE GRAPH ({citations_str}):
{conditions_str}

THÔNG TIN ĐẦU VÀO CẦN XỬ LÝ:
\"\"\"
{input_text}
\"\"\"

YÊU CẦU ĐẦU RA (JSON BLOCK LAYOUT):
Trả về DUY NHẤT một đối tượng JSON theo cấu trúc blocks:
{{
  "blocks": [
    {{
      "type": "header_split",
      "left": "",
      "right": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\\nĐộc lập - Tự do - Hạnh phúc\\n———————————"
    }},
    {{
      "type": "paragraph",
      "text": "Hà Nội, ngày 09 tháng 03 năm 2020",
      "align": "right",
      "italic": true
    }},
    {{
      "type": "title",
      "text": "{doc_type}",
      "bold": true,
      "align": "center",
      "size": 14
    }},
    {{
      "type": "paragraph",
      "text": "Về việc: Va chạm giao thông",
      "align": "center",
      "italic": true
    }},
    {{
      "type": "paragraph",
      "text": "Kính gửi: Văn phòng Chi nhánh."
    }},
    {{
      "type": "paragraph",
      "text": "Tôi tên là: Lê Trung Kiên\\nSinh ngày: 15/08/1995\\nCăn cước công dân số: 001095012345, cấp ngày 10/10/2021 tại Cục Cảnh sát QLHC về TTXH\\nNơi cư trú: Số 12 phố Huế, quận Hoàn Kiếm, thành phố Hà Nội"
    }},
    {{
      "type": "paragraph",
      "text": "Nay tôi làm bản tường trình này kính gửi Văn phòng Chi nhánh để trình bày sự việc như sau:"
    }},
    {{
      "type": "paragraph",
      "text": "Vào hồi 16 giờ 04 phút, ngày 09/03/2020, tại khu vực phố Huế, quận Hoàn Kiếm, thành phố Hà Nội, tôi điều khiển xe máy biển kiểm soát 29B1-123.45 lưu thông trên đường thì xảy ra va chạm giao thông với một xe máy khác đi cùng chiều."
    }},
    {{
      "type": "paragraph",
      "text": "Tôi xin tường trình toàn bộ sự việc nêu trên với Văn phòng Chi nhánh để được xem xét, giải quyết theo quy định."
    }},
    {{
      "type": "paragraph",
      "text": "Tôi xin cam đoan những nội dung tường trình trên đây là hoàn toàn đúng sự thật và xin chịu trách nhiệm trước pháp luật về nội dung đã tường trình."
    }},
    {{
      "type": "signature_split",
      "left": "",
      "right": "NGƯỜI LÀM TƯỜNG TRÌNH\\n(Ký, ghi rõ họ tên)\\n\\n\\n\\nLê Trung Kiên"
    }}
  ]
}}
"""
        return {
            "document_type": doc_type,
            "mandatory_conditions": cond_data["mandatory_conditions"],
            "legal_citations": cond_data["legal_citations"],
            "technical_specs": cond_data["technical_specs"],
            "context_rag_prompt": engineered_prompt.strip()
        }
