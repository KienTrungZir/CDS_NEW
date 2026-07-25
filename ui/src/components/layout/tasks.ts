import {
  Building2,
  FileType,
  MessageSquare,
  PenLine,
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

import { PenTool, Megaphone, Settings as SettingsIcon } from "lucide-react";

export const TASKS: TaskMeta[] = [
  // ── ỨNG DỤNG HÀNH CHÍNH & AI
  {
    key: "resolution",
    label: "Soạn Nghị quyết & Công văn",
    blurb: "Dàn trang chuẩn Nghị định 30/2020/NĐ-CP",
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
    key: "chat",
    label: "Trợ lý Chat & RAG",
    blurb: "Hỏi đáp tài liệu thông minh",
    icon: MessageSquare,
    category: "rag",
  },
  {
    key: "convert",
    label: "Chuyển định dạng",
    blurb: "PDF / Ảnh → DOCX, OCR cục bộ",
    icon: FileType,
    category: "text",
  },
  {
    key: "handwriting",
    label: "OCR chữ viết tay",
    blurb: "Trích xuất biểu mẫu / ghi chú / CMND",
    icon: PenLine,
    category: "text",
  },
  {
    key: "settings",
    label: "Cài Đặt & Cấu Hình",
    blurb: "Mô hình LLM, Auth token, Server health",
    icon: SettingsIcon,
    category: "dev",
  },
];
