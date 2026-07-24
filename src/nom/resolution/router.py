from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Query, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ValidationError
import json
import typing
from typing import Any, Dict, List, Optional
import io
from PIL import Image
import pytesseract

from nom.resolution.schema import GenerateResolutionRequest, NghiQuyetBase
from nom.resolution.ai_generator import ResolutionGenerator, _extract_json
from nom.resolution.export_dynamic_word import DynamicWordExporter
from nom.resolution.export_word import WordExporter
from nom.resolution import templates as tmpl

router = APIRouter(prefix="/api/resolution", tags=["Resolution"])
generator = ResolutionGenerator(model_name="qwen3:8b")
dynamic_exporter = DynamicWordExporter()
word_exporter = WordExporter()

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """Extract text from uploaded image using Vintern VLM and return base64 string."""
    try:
        content = await file.read()
        import base64
        image_b64 = base64.b64encode(content).decode("utf-8")
        from nom.ocr import VinternHandwritingOcr
        clf = VinternHandwritingOcr()
        result = clf.transcribe(content)
        return {"text": result.text, "image_b64": image_b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đọc ảnh: {str(e)}")

@router.post("/generate")
def generate_resolution(request: GenerateResolutionRequest):
    """Generate document JSON using Graph RAG and Ollama. Dynamic if fields are provided."""
    try:
        template_name = request.template
        if template_name:
            # Chế độ dùng Mẫu Word (.docx)
            variables = tmpl.extract_docx_variables(template_name)
            vars_str = ", ".join([f'"{v}"' for v in variables])
            prompt = f"""Bạn là một trợ lý ảo phân tích tài liệu.
Nhiệm vụ của bạn là đọc đoạn văn bản gốc (được trích xuất từ ảnh) và trích xuất thông tin để điền vào Mẫu Word.
Các biến số có trong Mẫu Word bao gồm: {vars_str}.
Hãy trích xuất thông tin và trả về DUY NHẤT một đối tượng JSON với các key tương ứng là tên các biến này.

Thông tin đầu vào:
"{request.prompt}"

TUYỆT ĐỐI CHỈ TRẢ VỀ JSON.
"""
            response_text = generator.llm.complete(prompt, max_tokens=4096)
            try:
                data = json.loads(response_text)
                return data
            except json.JSONDecodeError:
                try:
                    return _extract_json(response_text)
                except Exception as e2:
                    return {"error": str(e2), "raw": response_text}
        else:
            result = generator.generate(request)
            if isinstance(result, NghiQuyetBase):
                return result.model_dump()
            return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/convert_nd30")
def convert_to_nd30(data: Dict[str, Any] = Body(...)):
    """Convert block layout into Decree 30/2020 structured JSON or vice versa."""
    from nom.resolution.ai_generator import blocks_to_nd30, nd30_to_blocks
    if "blocks" in data:
        return {"nd30_data": blocks_to_nd30(data["blocks"])}
    elif "header" in data or "title_and_bases" in data:
        return {"blocks": nd30_to_blocks(data)}
    return data

@router.post("/export")
def export_word(data: Dict[str, Any] = Body(...), template: Optional[str] = Query(None)):
    """Export the structured JSON blocks to a .docx file."""
    try:
        if template:
            # Chế độ dùng Mẫu Word (.docx)
            template_path = tmpl.get_docx_template_path(template)
            if not template_path:
                raise HTTPException(status_code=404, detail="Template not found")
            buffer = word_exporter.export(data, template_path)
        else:
            # Chế độ dàn trang động
            buffer = dynamic_exporter.export(data)
            
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=VanBan_TuDong.docx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Data Template CRUD (JSON) ──

class SaveTemplateRequest(BaseModel):
    name: str
    data: Dict[str, Any]

@router.get("/templates")
def list_templates():
    return {"templates": tmpl.list_templates()}

@router.post("/templates")
def save_template(req: SaveTemplateRequest):
    filename = tmpl.save_template(req.name, req.data)
    return {"ok": True, "filename": filename}

@router.get("/templates/{filename}")
def load_template(filename: str):
    t = tmpl.load_template(filename)
    if t is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return t

@router.delete("/templates/{filename}")
def delete_template(filename: str):
    if not tmpl.delete_template(filename):
        raise HTTPException(status_code=404, detail="Template not found")
    return {"ok": True}

# ── DOCX Template CRUD ──

@router.post("/docx-templates")
async def upload_docx_template(file: UploadFile = File(...)):
    if not file.filename.endswith(".docx"):
        raise HTTPException(400, "Only .docx files are allowed")
    content = await file.read()
    filename = tmpl.save_docx_template(file.filename, content)
    return {"ok": True, "filename": filename}

@router.get("/docx-templates")
def list_docx_templates():
    return {"templates": tmpl.list_docx_templates()}

@router.delete("/docx-templates/{filename}")
def delete_docx_template(filename: str):
    if not tmpl.delete_docx_template(filename):
        raise HTTPException(404, "Template not found")
    return {"ok": True}
