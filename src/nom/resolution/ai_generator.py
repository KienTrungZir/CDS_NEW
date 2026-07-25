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

class ResolutionGenerator:
    def __init__(self, model_name: str = "qwen3:8b"):
        self.llm = Ollama(model=model_name, think=False, timeout=45.0)
        self.graph_rag = SimpleGraphRAG()

    def generate(self, request: GenerateResolutionRequest) -> Dict[str, Any]:
        clean_prompt = _clean_ocr_text(request.prompt)
        
        # BƯỚC 1: Truy vấn Knowledge Graph Nghị định 30/2020/NĐ-CP & Rút trích Điều kiện Bắt buộc
        rag_data = self.graph_rag.extract_nd30_conditions(clean_prompt)
        doc_type = rag_data["document_type"]
        conditions_str = "\n".join([f"- {c}" for c in rag_data["mandatory_conditions"]])
        citations_str = ", ".join(rag_data["legal_citations"])

        # BƯỚC 2: Kỹ sư hóa Generative RAG Prompt Ngữ Cảnh
        engineered_system_prompt = f"""[HỆ THỐNG GENERATIVE RAG PROMPT ENGINEERING - NGHỊ ĐỊNH 30/2020/NĐ-CP]

Bạn là Chuyên gia Số hóa & Dàn trang Văn bản Hành chính Chính phủ Việt Nam.
Nhiệm vụ của bạn là chuyển đổi thông tin đầu vào thành cấu trúc khối JSON chuẩn Nghị định 30/2020/NĐ-CP đối với loại văn bản: {doc_type}.

CÁC ĐIỀU KIỆN BẮT BUỘC RÚT TRÍCH TỪ KNOWLEDGE GRAPH ({citations_str}):
{conditions_str}

THÔNG TIN ĐẦU VÀO CẦN XỬ LÝ:
\"\"\"
{clean_prompt}
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
        # BƯỚC 3: Trích xuất và sinh khối JSON chuẩn
        response_text = ""
        res_data = None
        try:
            response_text = self.llm.complete(engineered_system_prompt, max_tokens=4096)
            data = _extract_json(response_text)
            if data and "blocks" in data and len(data["blocks"]) > 1:
                res_data = data
        except Exception:
            pass
                
        if not res_data:
            res_data = self._smart_rule_fallback(clean_prompt)
            
        if "blocks" in res_data:
            res_data["nd30_data"] = blocks_to_nd30(res_data["blocks"])
            
        return res_data

    def _smart_rule_fallback(self, raw_text: str) -> dict:
        text = _clean_ocr_text(raw_text)
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        blocks = []
        
        header_left, header_right, body_lines = [], [], []
        header_keywords = ["UBND", "ỦY BÀN", "BỘ", "SỞ", "CÔNG TY", "HỘI ĐỒNG", "TRƯỜNG", "BAN", "ĐƠN VỊ", "CHI NHÁNH", "CỤC", "CHÍNH PHỦ", "VĂN PHÒNG"]
        
        for idx, line in enumerate(lines):
            line_u = line.upper()
            if any(kw in line_u for kw in ["BẢN TƯỜNG TRÌNH", "NGHỊ QUYẾT", "QUYẾT ĐỊNH", "THÔNG BÁO", "BÁO CÁO", "TỜ TRÌNH", "ĐƠN XIN", "ĐƠN NGHỊ ĐỊNH"]):
                body_lines.extend(lines[idx:])
                break
            elif any(kw in line_u for kw in ["CỘNG HÒA", "ĐỘC LẬP", "HẠNH PHÚC", "VIỆT NAM"]):
                header_right.append(line)
            elif any(kw in line_u for kw in header_keywords):
                header_left.append(line)
            else:
                body_lines.append(line)
                
        blocks.append({
            "type": "header_split",
            "left": "\n".join(header_left) if header_left else "CƠ QUAN / ĐƠN VỊ",
            "right": "\n".join(header_right) if header_right else "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc"
        })
            
        has_title = False
        for line in body_lines:
            line_u = line.upper()
            if any(kw in line_u for kw in ["BẢN TƯỜNG TRÌNH", "NGHỊ QUYẾT", "QUYẾT ĐỊNH", "THÔNG BÁO", "BÁO CÁO", "TỜ TRÌNH", "ĐƠN XIN"]):
                blocks.append({"type": "title", "text": line, "align": "center", "bold": True})
                has_title = True
            elif re.match(r'^(\d+[\.\)]|[-+*•]|a\)|b\)|c\))\s*', line):
                blocks.append({"type": "list_item", "text": line})
            elif any(kw in line_u for kw in ["XÁC NHẬN", "NGƯỜI LÀM ĐƠN", "KÝ TÊN", "NGƯỜI TƯỜNG TRÌNH", "NGƯỜI KÝ"]):
                blocks.append({
                    "type": "signature_split",
                    "left": "Nơi nhận:\n- Như trên;\n- Lưu: VT.",
                    "right": f"{line}\n\n\n(Ký và ghi rõ họ tên)"
                })
            else:
                blocks.append({"type": "paragraph", "text": line, "align": "left"})
                
        if not has_title:
            blocks.insert(1, {"type": "title", "text": "BẢN TƯỜNG TRÌNH", "align": "center", "bold": True})

        has_signature = any(b.get("type") == "signature_split" for b in blocks)
        if not has_signature:
            blocks.append({
                "type": "signature_split",
                "left": "Nơi nhận:\n- Như trên;\n- Lưu: VT.",
                "right": "NGƯỜI LÀM ĐƠN / NGƯỜI KÝ\n\n\n(Ký và ghi rõ họ tên)"
            })

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



