import json
import re
from typing import List, Dict, Any, Union
from nom.llm.ollama import Ollama
from nom.resolution.schema import NghiQuyetBase, GenerateResolutionRequest
from nom.resolution.graph_rag import SimpleGraphRAG

import json
import re
from typing import List, Dict, Any, Union
from nom.llm.ollama import Ollama
from nom.resolution.schema import GenerateResolutionRequest
from nom.resolution.graph_rag import SimpleGraphRAG

LAYOUT_SCHEMA = {
    "type": "object",
    "properties": {
        "blocks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string", 
                        "enum": ["header_split", "title", "paragraph", "list_item", "signature_split", "table", "divider"]
                    },
                    "text": {"type": "string"},
                    "left": {"type": "string"},
                    "right": {"type": "string"},
                    "align": {"type": "string", "enum": ["left", "center", "right", "justify"]},
                    "bold": {"type": "boolean"},
                    "italic": {"type": "boolean"},
                    "font_size": {"type": "integer"},
                    "headers": {"type": "array", "items": {"type": "string"}},
                    "rows": {
                        "type": "array",
                        "items": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "required": ["type"]
            }
        }
    },
    "required": ["blocks"]
}

def _extract_json(text: str) -> dict:
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    text = re.sub(r'/no_think|/think', '', text)
    m = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if m:
        return json.loads(m.group(1))
    m = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text, re.DOTALL)
    if m:
        return json.loads(m.group(0))
    return json.loads(text.strip())

def _clean_ocr_text(text: str) -> str:
    """Clean repetitive OCR hallucinations caused by dotted form lines."""
    # Remove repeated phrase patterns (e.g. "gồm có ... người, " repeating 5+ times)
    text = re.sub(r'(.{4,30}?)\1{2,}', r'\1', text)
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        words = line.split()
        if len(words) > 8:
            phrase = " ".join(words[:3])
            if line.count(phrase) > 2:
                line = phrase + " ..."
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines)

from nom.resolution.advanced_rag import AdvancedRAG
from nom.resolution.evaluator import RAGEvaluator

class ResolutionGenerator:
    def __init__(self, model_name: str = "qwen3:8b"):
        self.llm = Ollama(model=model_name, think=False, timeout=45.0)
        self.rag = AdvancedRAG(llm=self.llm)
        self.evaluator = RAGEvaluator()

    def generate(self, request: GenerateResolutionRequest) -> Dict[str, Any]:
        clean_prompt = _clean_ocr_text(request.prompt)
        
        # BƯỚC 1: Truy vấn Advanced RAG Pipeline (Query Transform -> Vector Store -> Filter -> Rerank)
        rag_data = self.rag.retrieve(clean_prompt)
        doc_type = rag_data["document_type"]
        conditions_str = "\n".join([f"- {c}" for c in rag_data["mandatory_conditions"]])
        citations_str = ", ".join(rag_data["legal_citations"])
        vector_context_str = rag_data.get("context", "")

        # BƯỚC 2: Kỹ sư hóa Generative RAG Prompt Ngữ Cảnh với Vector Context
        engineered_system_prompt = f"""[HỆ THỐNG GENERATIVE RAG PROMPT ENGINEERING - NGHỊ ĐỊNH 30/2020/NĐ-CP]

Bạn là Chuyên gia Số hóa & Dàn trang Văn bản Hành chính Chính phủ Việt Nam.
Nhiệm vụ: Đọc THÔNG TIN ĐẦU VÀO bên dưới, trích xuất các trường dữ liệu, rồi TẠO HOÀN TOÀN MỚI một văn bản hành chính loại [{doc_type}] theo chuẩn Nghị định 30/2020/NĐ-CP.

{vector_context_str}

CÁC ĐIỀU KIỆN BẮT BUỘC RÚT TRÍCH TỪ KNOWLEDGE GRAPH ({citations_str}):
{conditions_str}

QUY TẮC SINH 11 KHỐI BẮT BUỘC cho [{doc_type}]:
 Khối 1 - header_split: left = tên cơ quan (nếu có), right = Quốc hiệu + Tiêu ngữ + dòng kẻ ———
 Khối 2 - paragraph: Địa danh + ngày tháng năm (lấy từ input, nếu không có dùng ngày hiện tại), align right, italic
 Khối 3 - title: Tên loại văn bản IN HOA ĐẬM, căn giữa, size 14
 Khối 4 - paragraph: Trích yếu "Về việc: [chủ đề sự việc]", căn giữa, italic
 Khối 5 - paragraph: "Kính gửi: [tên cơ quan/người nhận]"
 Khối 6 - paragraph: Thông tin cá nhân người làm đơn (họ tên, ngày sinh, CCCD, địa chỉ, chức vụ nếu có)
 Khối 7 - paragraph: Câu mở đầu nội dung ("Nay tôi làm bản tường trình..." hoặc tương đương)
 Khối 8 - paragraph: Diễn biến chi tiết sự việc theo trình tự thời gian (trích từ input)
 Khối 9 - paragraph: Đề nghị/kết luận sự việc
 Khối 10 - paragraph: Cam kết nội dung đúng sự thật và chịu trách nhiệm pháp luật
 Khối 11 - signature_split: left = Nơi nhận hoặc để trống, right = chức danh ký + họ tên

QUY TẮC QUAN TRỌNG:
- TUYỆT ĐỐI KHÔNG dùng dữ liệu ví dụ cứng ("Lê Trung Kiên", "29B1-123.45", v.v.) nếu input không chứa thông tin đó.
- PHẢI rút trích thông tin thực tế từ THÔNG TIN ĐẦU VÀO để điền vào các khối.
- Nếu input thiếu thông tin nào (ví dụ không có CCCD), để trống trường đó hoặc ghi "[chưa có thông tin]".
- Phải tạo đủ 11 khối, không ít hơn.
- Chỉ trả về JSON, KHÔNG giải thích thêm.

THÔNG TIN ĐẦU VÀO CẦN XỬ LÝ:
\"\"\"
{clean_prompt}
\"\"\"

ĐỊNH DẠNG JSON ĐẦU RA (thay thế [...] bằng nội dung thực từ input):
{{
  "blocks": [
    {{"type": "header_split", "left": "[Tên cơ quan nếu có, hoặc để trống]", "right": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\\nĐộc lập - Tự do - Hạnh phúc\\n———————————"}},
    {{"type": "paragraph", "text": "[Địa danh], ngày [DD] tháng [MM] năm [YYYY]", "align": "right", "italic": true}},
    {{"type": "title", "text": "{doc_type}", "bold": true, "align": "center", "font_size": 14}},
    {{"type": "paragraph", "text": "Về việc: [trích yếu nội dung sự việc]", "align": "center", "italic": true}},
    {{"type": "paragraph", "text": "Kính gửi: [tên cơ quan hoặc người nhận]."}},
    {{"type": "paragraph", "text": "Tôi tên là: [họ tên đầy đủ]\\nSinh ngày: [ngày sinh]\\nSố CCCD: [số CCCD nếu có]\\nChức vụ/Nghề nghiệp: [chức vụ hoặc nghề nghiệp nếu có]\\nNơi cư trú: [địa chỉ thường trú]"}},
    {{"type": "paragraph", "text": "Nay tôi làm {doc_type} này kính gửi [cơ quan nhận] để trình bày sự việc như sau:"}},
    {{"type": "paragraph", "text": "[Diễn biến chi tiết sự việc được trích xuất và tổng hợp từ thông tin đầu vào, theo trình tự thời gian, địa điểm, sự việc xảy ra]"}},
    {{"type": "paragraph", "text": "[Đề nghị / kết luận sự việc — ví dụ: Kính mong cơ quan xem xét, giải quyết theo đúng quy định pháp luật.]"}},
    {{"type": "paragraph", "text": "Tôi xin cam đoan những nội dung nêu trên là hoàn toàn đúng sự thật và xin chịu trách nhiệm trước pháp luật về nội dung đã tường trình."}},
    {{"type": "signature_split", "left": "", "right": "NGƯỜI LÀM {doc_type}\\n(Ký, ghi rõ họ tên)\\n\\n\\n\\n[Họ tên người ký]"}}
  ]
}}
"""
        # BƯỚC 3: Trích xuất và sinh khối JSON chuẩn từ LLM
        response_text = ""
        res_data = None
        try:
            response_text = self.llm.complete(engineered_system_prompt, max_tokens=4096)
            data = _extract_json(response_text)
            if data and "blocks" in data and len(data["blocks"]) >= 8:
                res_data = data
        except Exception:
            pass
                
        if not res_data:
            res_data = self._smart_rule_fallback(clean_prompt, doc_type, rag_data)
            
        if "blocks" in res_data:
            res_data["nd30_data"] = blocks_to_nd30(res_data["blocks"])

        # BƯỚC 4: RAG Evaluation & Dynamic Citations Metadata
        eval_result = self.evaluator.evaluate(
            blocks=res_data.get("blocks", []),
            doc_type=doc_type,
            query=clean_prompt,
            retrieved_chunks=rag_data.get("chunks", []),
            retrieval_scores=rag_data.get("retrieval_scores", {}),
        )

        res_data["rag_metadata"] = {
            "document_type": doc_type,
            "legal_citations": rag_data.get("legal_citations", []),
            "evaluation": eval_result,
            "retrieved_chunks_count": len(rag_data.get("chunks", [])),
        }
            
        return res_data

    def _smart_rule_fallback(self, raw_text: str, doc_type: str = "BẢN TƯỜNG TRÌNH", rag_data: dict = None) -> dict:
        """Smart rule-based fallback that produces all 11 required blocks per NĐ 30/2020."""
        import re as _re
        text = _clean_ocr_text(raw_text)
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        
        # --- Parse header elements from input ---
        header_left_lines, header_right_lines, body_lines = [], [], []
        header_keywords = ["UBND", "ỦY BAN", "BỘ", "SỞ", "CÔNG TY", "HỘI ĐỒNG", "TRƯỜNG", "BAN", "ĐƠN VỊ", "CHI NHÁNH", "CỤC", "CHÍNH PHỦ", "VĂN PHÒNG"]
        title_keywords = ["BẢN TƯỜNG TRÌNH", "NGHỊ QUYẾT", "QUYẾT ĐỊNH", "THÔNG BÁO", "BÁO CÁO", "TỜ TRÌNH", "ĐƠN XIN", "BIÊN BẢN", "GIẤY MỜI", "CÔNG VĂN"]
        
        for idx, line in enumerate(lines):
            line_u = line.upper()
            if any(kw in line_u for kw in title_keywords):
                body_lines.extend(lines[idx:])
                break
            elif any(kw in line_u for kw in ["CỘNG HÒA", "ĐỘC LẬP", "HẠNH PHÚC", "VIỆT NAM"]):
                header_right_lines.append(line)
            elif any(kw in line_u for kw in header_keywords):
                header_left_lines.append(line)
            else:
                body_lines.append(line)
        
        # --- Extract key information using regex ---
        full_text = raw_text
        
        # --- Helper: normalize Vietnamese (strip diacritics) ---
        def _norm(s: str) -> str:
            import unicodedata
            return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()
        
        full_text_norm = _norm(full_text)
        
        # Detect date — support both "ngay 20/07/2026" and "20/07/2026"
        date_match = _re.search(
            r'(?:ngay|hoi|vao|ngày|hồi|vào)[\s,]*(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})',
            full_text_norm, _re.IGNORECASE
        )
        if not date_match:
            date_match = _re.search(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})', full_text)
        date_str = ""
        if date_match:
            g = date_match.groups()
            nums = [x for x in g if x and _re.match(r'^\d+$', x)]
            if len(nums) >= 3:
                date_str = f"ngày {nums[0]} tháng {nums[1]} năm {nums[2]}"
        
        # Detect location — support "tai Ha Noi" or "tại Hà Nội"
        loc_match = _re.search(r'(?:tai|tại)\s+([^,\.\n]{3,40}?)(?:\s*,|\s*\.\s|\s*\n|$)', full_text_norm, _re.IGNORECASE)
        if loc_match:
            location = loc_match.group(1).strip()
        else:
            # Try to find office/company name as location reference
            off_match = _re.search(r'(?:van phong|van phong|cong ty|co quan)[\s]+([^,\.\n]{3,40})', full_text_norm, _re.IGNORECASE)
            location = off_match.group(1).strip() if off_match else "Hà Nội"
        
        # Detect person name — handle "ten la Nguyen Van An" or "tôi tên là Nguyễn Văn An"
        name_match = _re.search(
            r'(?:ten(?:\s+la)?|ho(?:\s+va)?\s+ten|tôi tên là|tên là)[:\s]+([A-Za-zÀ-ỹĐđ][A-Za-zÀ-ỹĐđ\s]{2,40}?)(?:[,\n]|\s{2,}|$)',
            full_text, _re.IGNORECASE
        )
        if not name_match:
            # Try normalized version
            nm2 = _re.search(
                r'(?:ten(?:\s+la)?|ho(?:\s+va)?\s+ten)[:\s]+([A-Za-z][A-Za-z\s]{2,40}?)(?:[,\n]|\s{2,}|$)',
                full_text_norm, _re.IGNORECASE
            )
            name_match = nm2
        person_name = name_match.group(1).strip() if name_match else "[Họ và tên người làm đơn]"
        # Clean up person_name — remove trailing noise
        person_name = _re.sub(r'[,\.;].*', '', person_name).strip()
        
        # Detect DOB — "sinh ngay 12/05/1990" or "ngay sinh: 12/05/1990"
        dob_match = _re.search(
            r'(?:sinh\s*ngay|ngay\s*sinh|sinh\s*ngày|ngày\s*sinh)[:\s]*(\d{1,2}[/\-]\d{1,2}[/\-]\d{4})',
            full_text_norm, _re.IGNORECASE
        )
        dob_str = dob_match.group(1) if dob_match else "[Ngày sinh]"
        
        # Detect CCCD/CMND
        cccd_match = _re.search(r'(?:cccd|cmnd|can cuoc|chung minh|căn cước|chứng minh)[^\d]*(\d{9,12})', full_text_norm, _re.IGNORECASE)
        if not cccd_match:
            cccd_match = _re.search(r'(?:CCCD|CMND)[^\d]*(\d{9,12})', full_text)
        cccd_str = cccd_match.group(1) if cccd_match else "[Số CCCD/CMND]"
        
        # Detect address — "noi cu tru tai 45 Nguyen Trai" or "địa chỉ: ..."
        addr_match = _re.search(
            r'(?:noi cu tru|dia chi|cu tru|thuong tru|địa chỉ|cư trú|thường trú)[:\s]+([^\n\.]{5,80})',
            full_text_norm, _re.IGNORECASE
        )
        if addr_match:
            address_str = addr_match.group(1).strip().rstrip(',;')
        else:
            # Try after CCCD line
            addr_match2 = _re.search(r'\d{9,12}[^\n]*\n([^\n]+)', full_text)
            address_str = addr_match2.group(1).strip() if addr_match2 else "[Địa chỉ thường trú]"
        
        # Detect recipient — "Kinh gui Giam doc..." or "Kính gửi: ..."
        kg_match = _re.search(
            r'(?:kinh\s*gui|kính\s*gửi)[:\s]+([^\n\.]{3,80})',
            full_text_norm, _re.IGNORECASE
        )
        if not kg_match:
            kg_match = _re.search(r'(?:kính\s*gửi)[:\s]+([^\n\.]{3,80})', full_text, _re.IGNORECASE)
        recipient = kg_match.group(1).strip().rstrip('.,;') if kg_match else "[Cơ quan/Người có thẩm quyền]"
        
        # Detect subject — "ve viec" or "về việc"
        vv_match = _re.search(r'(?:ve\s*viec|về\s*việc|v/v)[:\s]+([^\n\.]{3,80})', full_text_norm, _re.IGNORECASE)
        subject = vv_match.group(1).strip() if vv_match else "[Trích yếu nội dung]"
        
        # Smart subject: if no explicit v/v, infer from event keywords
        if subject == "[Trích yếu nội dung]":
            event_kw_map = [
                (r'lam hu|hu hong|pha vo|phá vỡ|làm hư|hư hỏng', "Sự cố làm hư hỏng tài sản"),
                (r'va cham|tai nan|va chạm|tai nạn', "Va chạm giao thông"),
                (r'mat tien|mat vi|mat ví|mất tiền', "Mất tài sản"),
                (r'vang mat|nghi phep|vắng mặt|nghỉ phép', "Vắng mặt không phép"),
            ]
            for pattern, label in event_kw_map:
                if _re.search(pattern, full_text_norm, _re.IGNORECASE):
                    subject = label
                    break
        
        # Detect event description lines (body)
        event_lines = []
        skip_norm = [_norm(kw) for kw in (title_keywords + ["KÍNH GỬI", "VỀ VIỆC", "V/V", "TÔI TÊN", "HỌ TÊN", "SINH NGÀY", "CCCD", "CMND", "CAM ĐOAN", "XIN CAM"])]
        for line in body_lines:
            ln = _norm(line)
            if not any(kw in ln for kw in skip_norm) and len(line) > 15:
                event_lines.append(line)
        event_text = " ".join(event_lines) if event_lines else raw_text.strip()
        
        # Determine conclusion text
        conclusion_kw_norm = ["de nghi", "kinh de nghi", "yeu cau", "kinh mong", "xin duoc"]
        conclusion_lines = [l for l in body_lines if any(kw in _norm(l) for kw in conclusion_kw_norm)]
        conclusion_text = conclusion_lines[0] if conclusion_lines else f"Kính mong {recipient} xem xét, giải quyết theo đúng quy định."
        
        # Determine signing role based on doc type  
        signing_roles = {
            "BẢN TƯỜNG TRÌNH": "NGƯỜI LÀM TƯỜNG TRÌNH",
            "TỜ TRÌNH": "NGƯỜI TRÌNH",
            "BÁO CÁO": "NGƯỜI BÁO CÁO",
            "BIÊN BẢN": "CHỦ TỌA / THƯ KÝ",
            "GIẤY MỜI": "THỦ TRƯỞNG CƠ QUAN",
            "CÔNG VĂN": "NGƯỜI KÝ",
            "NGHỊ QUYẾT": "TM. HỘI ĐỒNG\nCHỦ TỊCH",
            "QUYẾT ĐỊNH": "THỦ TRƯỞNG CƠ QUAN",
        }
        signing_role = signing_roles.get(doc_type, "NGƯỜI KÝ")
        
        loc_date_str = f"{location}, {date_str}" if date_str else f"{location}, ngày ...... tháng ...... năm ......"
        header_left = "\n".join(header_left_lines) if header_left_lines else ""
        
        # Build 11 required blocks
        blocks = [
            # Khối 1: Phần đầu 2 cột
            {
                "type": "header_split",
                "left": header_left,
                "right": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n———————————"
            },
            # Khối 2: Địa danh + Ngày tháng
            {
                "type": "paragraph",
                "text": loc_date_str,
                "align": "right",
                "italic": True
            },
            # Khối 3: Tên loại văn bản
            {
                "type": "title",
                "text": doc_type,
                "bold": True,
                "align": "center",
                "font_size": 14
            },
            # Khối 4: Trích yếu
            {
                "type": "paragraph",
                "text": f"Về việc: {subject}",
                "align": "center",
                "italic": True
            },
            # Khối 5: Kính gửi
            {
                "type": "paragraph",
                "text": f"Kính gửi: {recipient}."
            },
            # Khối 6: Thông tin cá nhân
            {
                "type": "paragraph",
                "text": (
                    f"Tôi tên là: {person_name}\n"
                    f"Sinh ngày: {dob_str}\n"
                    f"Số CCCD/CMND: {cccd_str}\n"
                    f"Nơi cư trú: {address_str}"
                )
            },
            # Khối 7: Mở đầu nội dung
            {
                "type": "paragraph",
                "text": f"Nay tôi xin làm {doc_type} này kính gửi {recipient} để trình bày sự việc như sau:"
            },
            # Khối 8: Diễn biến sự việc
            {
                "type": "paragraph",
                "text": event_text,
                "align": "justify"
            },
            # Khối 9: Đề nghị / Kết luận
            {
                "type": "paragraph",
                "text": conclusion_text
            },
            # Khối 10: Cam kết
            {
                "type": "paragraph",
                "text": "Tôi xin cam đoan những nội dung nêu trên là hoàn toàn đúng sự thật và xin chịu trách nhiệm trước pháp luật về những nội dung đã trình bày."
            },
            # Khối 11: Chữ ký
            {
                "type": "signature_split",
                "left": "",
                "right": f"{signing_role}\n(Ký, ghi rõ họ tên)\n\n\n\n{person_name}"
            }
        ]

        return {"blocks": blocks}

DECREE_30_SCHEMA = {
    "type": "object",
    "properties": {
        "header": {
            "type": "object",
            "properties": {
                "issuing_body_parent": {"type": "string"},
                "issuing_body": {"type": "string"},
                "national_motto": {"type": "string"},
                "motto": {"type": "string"},
                "document_number": {"type": "string"},
                "location": {"type": "string"},
                "date": {
                    "type": "object",
                    "properties": {
                        "day": {"type": "string"},
                        "month": {"type": "string"},
                        "year": {"type": "string"}
                    }
                }
            },
            "required": ["issuing_body"]
        },
        "title_and_bases": {
            "type": "object",
            "properties": {
                "document_name": {"type": "string"},
                "subject": {"type": "string"},
                "legal_bases": {"type": "array", "items": {"type": "string"}},
                "promulgation_statement": {"type": "string"}
            },
            "required": ["document_name", "subject"]
        },
        "body": {
            "type": "object",
            "properties": {
                "chapters": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "chapter_number": {"type": "string"},
                            "chapter_title": {"type": "string"},
                            "articles": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "article_number": {"type": "string"},
                                        "article_title": {"type": "string"},
                                        "content": {"type": "string"},
                                        "clauses": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "properties": {
                                                    "clause_number": {"type": "string"},
                                                    "content": {"type": "string"},
                                                    "points": {
                                                        "type": "array",
                                                        "items": {
                                                            "type": "object",
                                                            "properties": {
                                                                "point_letter": {"type": "string"},
                                                                "content": {"type": "string"}
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "footer": {
            "type": "object",
            "properties": {
                "recipients": {"type": "array", "items": {"type": "string"}},
                "signatory": {
                    "type": "object",
                    "properties": {
                        "role": {"type": "string"},
                        "position": {"type": "string"},
                        "name": {"type": "string"}
                    }
                }
            }
        }
    },
    "required": ["header", "title_and_bases", "footer"]
}

def nd30_to_blocks(nd30_data: dict) -> list:
    blocks = []
    header = nd30_data.get("header", {})
    left_parts = []
    if header.get("issuing_body_parent"):
        left_parts.append(header["issuing_body_parent"])
    if header.get("issuing_body"):
        left_parts.append(header["issuing_body"])
    if header.get("document_number"):
        left_parts.append(f"Số: {header['document_number']}")
        
    right_parts = []
    right_parts.append(header.get("national_motto", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"))
    right_parts.append(header.get("motto", "Độc lập - Tự do - Hạnh phúc"))
    loc = header.get("location", "Hà Nội")
    dt = header.get("date") or {}
    day = dt.get("day", "..") if isinstance(dt, dict) else ".."
    month = dt.get("month", "..") if isinstance(dt, dict) else ".."
    year = dt.get("year", "....") if isinstance(dt, dict) else "...."
    right_parts.append(f"{loc}, ngày {day} tháng {month} năm {year}")

    blocks.append({
        "type": "header_split",
        "left": "\n".join(left_parts),
        "right": "\n".join(right_parts)
    })

    tb = nd30_data.get("title_and_bases", {})
    if tb.get("document_name"):
        blocks.append({"type": "title", "text": tb["document_name"].upper(), "align": "center", "bold": True})
    if tb.get("subject"):
        blocks.append({"type": "paragraph", "text": tb["subject"], "align": "center", "bold": True})
    for base in tb.get("legal_bases", []):
        blocks.append({"type": "paragraph", "text": base, "align": "left", "italic": True})
    if tb.get("promulgation_statement"):
        blocks.append({"type": "paragraph", "text": tb["promulgation_statement"], "align": "left"})

    body = nd30_data.get("body", {})
    chapters = body.get("chapters", [])
    if chapters:
        for ch in chapters:
            ch_num = ch.get("chapter_number", "")
            ch_title = ch.get("chapter_title", "")
            blocks.append({"type": "paragraph", "text": f"Chương {ch_num}\n{ch_title.upper()}", "align": "center", "bold": True})
            for art in ch.get("articles", []):
                art_num = art.get("article_number", "")
                art_title = art.get("article_title", "")
                head = f"Điều {art_num}." + (f" {art_title}" if art_title else "")
                blocks.append({"type": "paragraph", "text": head, "align": "left", "bold": True})
                if art.get("content"):
                    blocks.append({"type": "paragraph", "text": art["content"], "align": "left"})
                for cl in art.get("clauses", []):
                    blocks.append({"type": "list_item", "text": f"{cl.get('clause_number', '')}. {cl.get('content', '')}"})
                    for pt in cl.get("points", []):
                        blocks.append({"type": "list_item", "text": f"{pt.get('point_letter', '')}) {pt.get('content', '')}"})
    else:
        for art in body.get("articles", []):
            art_num = art.get("article_number", "")
            art_title = art.get("article_title", "")
            head = f"Điều {art_num}." + (f" {art_title}" if art_title else "")
            blocks.append({"type": "paragraph", "text": head, "align": "left", "bold": True})
            if art.get("content"):
                blocks.append({"type": "paragraph", "text": art["content"], "align": "left"})
            for cl in art.get("clauses", []):
                blocks.append({"type": "list_item", "text": f"{cl.get('clause_number', '')}. {cl.get('content', '')}"})

    footer = nd30_data.get("footer", {})
    recipients = footer.get("recipients", [])
    rec_str = "\n".join([f"- {r}" for r in recipients]) if recipients else "Nơi nhận:\n- Như trên;\n- Lưu: VT."
    sig = footer.get("signatory", {})
    sig_parts = []
    if sig.get("role"):
        sig_parts.append(sig["role"].upper())
    if sig.get("position"):
        sig_parts.append(sig["position"].upper())
    if sig.get("name"):
        sig_parts.append(sig["name"])
    sig_str = "\n\n\n\n".join(sig_parts) if sig_parts else "THỦ TƯỚNG\n\n\n\nNguyễn Xuân Phúc"

    blocks.append({
        "type": "signature_split",
        "left": rec_str,
        "right": sig_str
    })
    return blocks

def blocks_to_nd30(blocks: list) -> dict:
    header = {
        "issuing_body": "CHÍNH PHỦ",
        "national_motto": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "motto": "Độc lập - Tự do - Hạnh phúc",
        "location": "Hà Nội",
        "date": {"day": "", "month": "", "year": ""}
    }
    title_and_bases = {
        "document_name": "VĂN BẢN HÀNH CHÍNH",
        "subject": "",
        "legal_bases": []
    }
    articles = []
    recipients = []
    signatory = {"position": "NGƯỜI KÝ", "name": ""}

    for b in blocks:
        b_type = b.get("type")
        if b_type == "header_split":
            left = b.get("left", "")
            right = b.get("right", "")
            if left:
                lines = [l.strip() for l in left.split("\n") if l.strip()]
                if lines:
                    header["issuing_body"] = lines[0]
                if len(lines) > 1 and "Số:" in lines[1]:
                    header["document_number"] = lines[1].replace("Số:", "").strip()
            if right:
                m = re.search(r'([^\n,]+),\s*ngày\s*(\d+|\.\.)\s*tháng\s*(\d+|\.\.)\s*năm\s*(\d+|\.\.\.\.)', right, re.IGNORECASE)
                if m:
                    header["location"] = m.group(1).strip()
                    header["date"] = {"day": m.group(2), "month": m.group(3), "year": m.group(4)}
        elif b_type == "title":
            title_and_bases["document_name"] = b.get("text", "").strip()
        elif b_type == "paragraph":
            text = b.get("text", "").strip()
            if text.startswith("Căn cứ"):
                title_and_bases["legal_bases"].append(text)
            elif not title_and_bases["subject"] and b.get("bold"):
                title_and_bases["subject"] = text
            elif text.startswith("Điều "):
                m = re.match(r'Điều\s*(\d+)\.\s*(.*)', text)
                if m:
                    articles.append({"article_number": m.group(1), "article_title": m.group(2), "clauses": []})
                else:
                    articles.append({"article_number": str(len(articles)+1), "article_title": "", "content": text, "clauses": []})
            else:
                if articles:
                    articles[-1]["content"] = (articles[-1].get("content", "") + "\n" + text).strip()
        elif b_type == "list_item":
            text = b.get("text", "").strip()
            if articles:
                m_cl = re.match(r'^(\d+)\.\s*(.*)', text)
                if m_cl:
                    articles[-1]["clauses"].append({"clause_number": m_cl.group(1), "content": m_cl.group(2)})
                else:
                    m_pt = re.match(r'^([a-z])\)\s*(.*)', text)
                    if m_pt and articles[-1]["clauses"]:
                        articles[-1]["clauses"][-1].setdefault("points", []).append({"point_letter": m_pt.group(1), "content": m_pt.group(2)})
                    else:
                        articles[-1]["clauses"].append({"clause_number": str(len(articles[-1]["clauses"])+1), "content": text})
        elif b_type == "signature_split":
            left = b.get("left", "")
            right = b.get("right", "")
            if left:
                recipients = [l.strip().lstrip("-;• ") for l in left.split("\n") if l.strip() and "Nơi nhận" not in l]
            if right:
                r_lines = [l.strip() for l in right.split("\n") if l.strip()]
                if r_lines:
                    signatory["position"] = r_lines[0]
                if len(r_lines) > 1:
                    signatory["name"] = r_lines[-1]

    return {
        "document_metadata": {"schema_version": "1.0", "standard": "Nghị định 30/2020/NĐ-CP"},
        "header": header,
        "title_and_bases": title_and_bases,
        "body": {"articles": articles},
        "footer": {"recipients": recipients, "signatory": signatory}
    }



