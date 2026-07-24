import {
  AlignLeft,
  Building2,
  Eraser,
  FileType,
  Languages,
  Layers,
  ListChecks,
  MessageSquare,
  Mic,
  Package,
  PenLine,
  Scissors,
  Settings,
  Sigma,
  SpellCheck,
  Tags,
  Type,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TaskKey =
  | "chat"
  | "diacritic"
  | "tokenize"
  | "normalize"
  | "strip"
  | "translate"
  | "convert"
  | "jobs"
  | "register"
  | "handwriting"
  | "spell"
  | "stt"
  | "ner"
  | "summarize"
  | "models"
  | "agents"
  | "compliance"
  | "admin"
  | "api"
  | "settings"
  | "resolution"
  | "workflow"
  | "pr"
  | "sentiment";

export interface TaskMeta {
  key: TaskKey;
  label: string;
  blurb: string;
  icon: LucideIcon;
  category: "rag" | "text" | "dev";
}

export const TASK_SLUGS: Record<TaskKey, string> = {
  chat: "/",
  translate: "/translate",
  convert: "/convert",
  jobs: "/jobs",
  diacritic: "/diacritic",
  tokenize: "/tokenize",
  normalize: "/normalize",
  strip: "/strip",
  register: "/register",
  handwriting: "/handwriting",
  spell: "/spell",
  stt: "/stt",
  ner: "/ner",
  summarize: "/summarize",
  models: "/models",
  agents: "/agents",
  compliance: "/compliance",
  admin: "/admin",
  api: "/api-docs",
  settings: "/settings",
  resolution: "/resolution",
  workflow: "/workflow",
  pr: "/pr",
  sentiment: "/sentiment",
};

export const SLUG_TO_TASK: Record<string, TaskKey> = Object.fromEntries(
  Object.entries(TASK_SLUGS).map(([k, v]) => [v, k as TaskKey]),
) as Record<string, TaskKey>;

export function taskFromPath(pathname: string): TaskKey | null {
  const cleaned = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return SLUG_TO_TASK[cleaned] ?? null;
}

import { PenTool, Megaphone } from "lucide-react";

export const TASKS: TaskMeta[] = [
  // ── ỨNG DỤNG (creator-side primary tasks)
  {
    key: "pr",
    label: "Báo cáo & Truyền thông",
    blurb: "Viết tin từ ảnh chụp sự kiện",
    icon: Megaphone,
    category: "rag",
  },
  {
    key: "sentiment",
    label: "Phân tích dư luận",
    blurb: "Đọc & tóm tắt ý kiến nhân dân",
    icon: PenTool,
    category: "rag",
  },
  {
    key: "resolution",
    label: "Soạn Nghị quyết",
    blurb: "OCR ảnh & AI soạn nghị quyết (Graph RAG)",
    icon: Building2,
    category: "rag",
  },
  {
    key: "workflow",
    label: "Workflow Builder",
    blurb: "Kéo thả tạo quy trình tự động hóa",
    icon: Workflow,
    category: "rag",
  },
  {
    key: "chat",
    label: "Chat & RAG",
    blurb: "Hỏi đáp tài liệu",
    icon: MessageSquare,
    category: "rag",
  },
  {
    key: "translate",
    label: "Dịch thuật",
    blurb: "Việt · Anh · 中 · 한 · 日, giữ định dạng",
    icon: Languages,
    category: "rag",
  },
  {
    key: "summarize",
    label: "Tóm tắt",
    blurb: "ViT5-large · báo / hợp đồng / hội thoại",
    icon: AlignLeft,
    category: "rag",
  },
  {
    key: "convert",
    label: "Chuyển định dạng",
    blurb: "PDF / ảnh → DOCX, OCR cục bộ",
    icon: FileType,
    category: "rag",
  },
  {
    key: "handwriting",
    label: "OCR chữ viết tay",
    blurb: "Vintern-1B · biểu mẫu / ghi chú / CMND",
    icon: PenLine,
    category: "rag",
  },
  {
    key: "stt",
    label: "Giọng nói → văn bản",
    blurb: "PhoWhisper · Whisper-v3 · 3 vùng giọng",
    icon: Mic,
    category: "rag",
  },

  // ── CÔNG CỤ VĂN BẢN (atomic VN utilities)
  {
    key: "spell",
    label: "Kiểm tra chính tả",
    blurb: "Telex · dấu · phương ngữ · teencode",
    icon: SpellCheck,
    category: "text",
  },
  {
    key: "diacritic",
    label: "Khôi phục dấu",
    blurb: "Bù lại dấu cho văn bản",
    icon: Type,
    category: "text",
  },
  {
    key: "ner",
    label: "Trích xuất thực thể",
    blurb: "Người · tổ chức · điều luật · CMND · ĐT",
    icon: Tags,
    category: "text",
  },
  {
    key: "register",
    label: "Phân loại văn phong",
    blurb: "Trang trọng / kinh doanh / hội thoại / văn học",
    icon: Layers,
    category: "text",
  },
  {
    key: "tokenize",
    label: "Tách từ / câu",
    blurb: "Tách theo từ và theo câu",
    icon: Scissors,
    category: "text",
  },
  {
    key: "normalize",
    label: "Chuẩn hoá",
    blurb: "NFC và nhận diện tiếng Việt",
    icon: Sigma,
    category: "text",
  },
  {
    key: "strip",
    label: "Bỏ dấu",
    blurb: "Chuyển sang ASCII",
    icon: Eraser,
    category: "text",
  },

  // ── HỆ THỐNG (operations, compliance, management, reference)
  {
    key: "jobs",
    label: "Hàng đợi xử lý",
    blurb: "Theo dõi tác vụ chạy nền + tiến độ",
    icon: ListChecks,
    category: "dev",
  },
  /*
  {
    key: "compliance",
    label: "Phân loại rủi ro",
    blurb: "Luật 134/2025 — 3 mức",
    icon: ShieldCheck,
    category: "dev",
  },
  {
    key: "admin",
    label: "Quản trị doanh nghiệp",
    blurb: "Giấy phép · audit · người dùng",
    icon: Building2,
    category: "dev",
  },
  */
  {
    key: "models",
    label: "Mô hình",
    blurb: "Quản lý mô hình AI cài đặt cục bộ",
    icon: Package,
    category: "dev",
  },
  /*
  {
    key: "api",
    label: "API và cài đặt",
    blurb: "Hướng dẫn chạy và ví dụ cURL",
    icon: Code2,
    category: "dev",
  },
  */
  {
    key: "settings",
    label: "Cài đặt",
    blurb: "Trạng thái máy chủ và xác thực",
    icon: Settings,
    category: "dev",
  },
];
