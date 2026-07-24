from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class NghiQuyetBase(BaseModel):
    co_quan_ban_hanh: str = Field(..., description="Tên cơ quan ban hành nghị quyết (vd: Hội đồng nhân dân tỉnh)")
    so_nghi_quyet: str = Field(..., description="Số và ký hiệu nghị quyết (vd: 123/NQ-HĐND)")
    dia_danh: str = Field(..., description="Địa danh nơi ban hành (vd: Hà Nội)")
    ngay_ban_hanh: str = Field(..., description="Ngày tháng năm ban hành (vd: ngày 01 tháng 01 năm 2024)")
    trich_yeu: str = Field(..., description="Trích yếu nội dung nghị quyết")
    can_cu_phap_ly: List[str] = Field(default_factory=list, description="Danh sách các căn cứ pháp lý")
    noi_dung_dieu_khoan: List[str] = Field(default_factory=list, description="Nội dung các điều khoản (Điều 1, Điều 2...)")
    noi_nhan: List[str] = Field(default_factory=list, description="Nơi nhận")
    chuc_vu_nguoi_ky: str = Field(..., description="Chức vụ của người ký")
    nguoi_ky: str = Field(..., description="Họ và tên người ký")

class GraphEntity(BaseModel):
    entity: str
    entity_type: str
    context: str

class GenerateResolutionRequest(BaseModel):
    prompt: str = Field(..., description="Nội dung từ OCR hoặc thông tin nhập tay để AI dựa vào đó viết Nghị quyết")
    image_b64: Optional[str] = Field(None, description="Chuỗi base64 của ảnh gốc để AI xem xét bố cục thực tế")
    graph_context: Optional[List[GraphEntity]] = None
    fields: Optional[List[str]] = Field(None, description="Danh sách các trường cần trích xuất (dynamic schema)")
    template: Optional[str] = Field(None, description="Tên file mẫu .docx nếu dùng chế độ Template")

class DateSchema(BaseModel):
    day: Optional[str] = Field(None, description="Ngày ban hành (vd: 05)")
    month: Optional[str] = Field(None, description="Tháng ban hành (vd: 3)")
    year: Optional[str] = Field(None, description="Năm ban hành (vd: 2020)")

class HeaderSchema(BaseModel):
    issuing_body_parent: Optional[str] = Field(None, description="Tên cơ quan chủ quản (nếu có, vd: BỘ NỘI VỤ)")
    issuing_body: str = Field(..., description="Tên cơ quan ban hành (vd: CHÍNH PHỦ / CỤC VĂN THƯ VÀ LƯU TRỮ NHÀ NƯỚC)")
    national_motto: str = Field("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", description="Quốc hiệu")
    motto: str = Field("Độc lập - Tự do - Hạnh phúc", description="Tiêu ngữ")
    document_number: Optional[str] = Field(None, description="Số và ký hiệu văn bản (vd: 30/2020/NĐ-CP)")
    location: Optional[str] = Field(None, description="Địa danh ban hành (vd: Hà Nội)")
    date: Optional[DateSchema] = None
    urgency_level: Optional[str] = Field(None, description="Độ khẩn (vd: HỎA TỐC, THƯỢNG KHẨN, KHẨN)")
    confidentiality_level: Optional[str] = Field(None, description="Độ mật / Phạm vi lưu hành (vd: LƯU HÀNH NỘI BỘ)")

class TitleAndBasesSchema(BaseModel):
    document_name: str = Field(..., description="Tên loại văn bản (vd: NGHỊ ĐỊNH, QUYẾT ĐỊNH, THÔNG BÁO)")
    subject: str = Field(..., description="Trích yếu nội dung văn bản (vd: Về công tác văn thư)")
    legal_bases: List[str] = Field(default_factory=list, description="Danh sách các căn cứ pháp lý")
    promulgation_statement: Optional[str] = Field(None, description="Câu lệnh ban hành (vd: Chính phủ ban hành Nghị định...)")

class PointSchema(BaseModel):
    point_letter: str = Field(..., description="Ký hiệu điểm (a, b, c...)")
    content: str = Field(..., description="Nội dung điểm")

class ClauseSchema(BaseModel):
    clause_number: str = Field(..., description="Số khoản (1, 2, 3...)")
    content: str = Field(..., description="Nội dung khoản")
    points: Optional[List[PointSchema]] = Field(default_factory=list, description="Các điểm thuộc khoản (nếu có)")

class ArticleSchema(BaseModel):
    article_number: str = Field(..., description="Số điều (1, 2, 3...)")
    article_title: Optional[str] = Field(None, description="Tên điều (vd: Phạm vi điều chỉnh)")
    content: Optional[str] = Field(None, description="Nội dung điều (nếu không chia khoản)")
    clauses: Optional[List[ClauseSchema]] = Field(default_factory=list, description="Các khoản thuộc điều")

class ChapterSchema(BaseModel):
    chapter_number: str = Field(..., description="Số chương dạng La Mã (I, II, III...)")
    chapter_title: str = Field(..., description="Tên chương (vd: QUY ĐỊNH CHUNG)")
    articles: List[ArticleSchema] = Field(default_factory=list, description="Các điều thuộc chương")

class SignatorySchema(BaseModel):
    role: Optional[str] = Field(None, description="Quyền hạn người ký (vd: TM. CHÍNH PHỦ / KT. BỘ TRƯỞNG)")
    position: str = Field(..., description="Chức vụ người ký (vd: THỦ TƯỚNG / CHỦ TỊCH)")
    name: str = Field(..., description="Họ và tên người ký")
    is_digital_signature: bool = Field(False, description="Đã ký số hay chưa")
    signing_time: Optional[str] = Field(None, description="Thời gian ký số (nếu có)")

class FooterSchema(BaseModel):
    recipients: List[str] = Field(default_factory=list, description="Danh sách nơi nhận")
    signatory: SignatorySchema = Field(..., description="Thông tin người ký")
    author_code: Optional[str] = Field(None, description="Ký hiệu người soạn thảo & số bản (vd: PL.(300))")

class Decree30DocumentSchema(BaseModel):
    document_metadata: Optional[dict] = Field(default_factory=dict, description="Metadata văn bản")
    header: HeaderSchema = Field(..., description="Phần đầu văn bản")
    title_and_bases: TitleAndBasesSchema = Field(..., description="Tên loại & căn cứ pháp lý")
    body: Optional[dict] = Field(default_factory=dict, description="Thân văn bản (chứa chapters/articles)")
    appendices: Optional[List[dict]] = Field(default_factory=list, description="Các phụ lục kèm theo")
    footer: FooterSchema = Field(..., description="Nơi nhận & Chữ ký")
