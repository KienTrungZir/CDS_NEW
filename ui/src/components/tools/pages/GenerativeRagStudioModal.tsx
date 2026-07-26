import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sparkles, ShieldCheck, FileText, Copy, Check, ArrowRight, BookOpen, Layers, X, RefreshCw, HelpCircle
} from "lucide-react";
import { toast } from "sonner";

interface GenerativeRagStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBlocks: (blocks: any[], promptText: string) => void;
}

export function GenerativeRagStudioModal({ isOpen, onClose, onApplyBlocks }: GenerativeRagStudioModalProps) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingBlocks, setGeneratingBlocks] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [ragResult, setRagResult] = useState<{
    document_type: string;
    mandatory_conditions: string[];
    legal_citations: string[];
    technical_specs: Record<string, string>;
    context_rag_prompt: string;
    clarification?: {
      completion_rate: number;
      missing_fields: Array<{
        key: string;
        label: string;
        question: string;
        placeholder: string;
      }>;
    };
  } | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleQueryKnowledgeGraph = async () => {
    if (!inputText.trim()) {
      toast.error("Vui lòng nhập nội dung thông tin / kịch bản!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/resolution/prompt-engineer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText })
      });
      if (!res.ok) throw new Error("Lỗi truy vấn Knowledge Graph");
      const data = await res.json();
      setRagResult(data);
      toast.success(`Đã rút trích điều kiện bắt buộc theo ${data.document_type}!`);
    } catch (err: any) {
      toast.error(err.message || "Không thể thực hiện Generative RAG Prompt Engineer");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!ragResult) return;
    navigator.clipboard.writeText(ragResult.context_rag_prompt);
    setCopied(true);
    toast.success("Đã sao chép Generative RAG Prompt!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToEditor = async () => {
    if (!inputText.trim()) return;
    setGeneratingBlocks(true);
    try {
      const res = await fetch("/api/resolution/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: inputText })
      });
      if (!res.ok) throw new Error("Lỗi sinh cấu trúc văn bản NĐ 30");
      const data = await res.json();
      const generatedBlocks = data.blocks || data;
      if (Array.isArray(generatedBlocks)) {
        onApplyBlocks(generatedBlocks, inputText);
        toast.success("Đã áp dụng khối văn bản chuẩn NĐ 30 vào trình biên tập!");
        onClose();
      } else {
        toast.error("Cấu trúc văn bản sinh ra không đúng định dạng khối.");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo văn bản");
    } finally {
      setGeneratingBlocks(false);
    }
  };

  const handleAnswerChange = (key: string, val: string) => {
    setAnswers(prev => ({ ...prev, [key]: val }));
  };

  const handleAppendAnswers = async () => {
    const parts: string[] = [];
    Object.entries(answers).forEach(([key, val]) => {
      if (val.trim()) {
        const fieldObj = ragResult?.clarification?.missing_fields?.find((f: any) => f.key === key);
        const label = fieldObj?.label || key;
        parts.push(`${label}: ${val.trim()}`);
      }
    });

    if (parts.length === 0) {
      toast.error("Vui lòng nhập câu trả lời cho ít nhất 1 câu hỏi!");
      return;
    }

    const updatedText = inputText.trim() + "\n\nThông tin bổ sung:\n- " + parts.join("\n- ");
    setInputText(updatedText);
    setAnswers({});
    toast.success("Đã bổ sung thông tin! Đang cập nhật Generative RAG Prompt...");

    // Re-query RAG prompt engineer automatically
    setLoading(true);
    try {
      const res = await fetch("/api/resolution/prompt-engineer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: updatedText })
      });
      if (!res.ok) throw new Error("Lỗi cập nhật RAG");
      const data = await res.json();
      setRagResult(data);
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center flex-wrap gap-2">
                Generative RAG Prompt Studio 
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-medium">
                  Nghị định 30/2020/NĐ-CP
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Truy vấn Knowledge Graph rút trích điều kiện bắt buộc, hỏi làm rõ thông tin & kỹ sư hóa Prompt
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="rounded-full hover:bg-slate-800 shrink-0 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900">
          
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                Thông tin / Kịch bản đầu vào:
              </span>
              <span className="text-xs font-normal text-slate-400">
                (Ví dụ: Tường trình va chạm giao thông, Công văn gửi Bộ Nội vụ...)
              </span>
            </label>
            <Textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập thông tin sự việc, kịch bản hoặc đoạn văn bản thô để hệ thống rút trích điều kiện pháp lý bắt buộc..."
              className="font-mono text-sm resize-none rounded-xl border-slate-700 bg-slate-950 p-4 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleQueryKnowledgeGraph}
                disabled={loading || !inputText.trim()}
                className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-glow transition-all rounded-xl text-xs font-semibold px-4 py-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Truy vấn Knowledge Graph & Phân Tích Thông Tin
              </Button>
            </div>
          </div>

          {/* RAG Knowledge Graph Output */}
          {ragResult && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
              
              {/* Document Type & Legal Citations */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    Loại Văn Bản Nhận Diện
                  </span>
                  <span className="text-sm font-extrabold text-indigo-200 px-3 py-1 rounded-lg bg-indigo-500/30 border border-indigo-500/50">
                    {ragResult.document_type}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                    Căn cứ pháp lý (Decree 30 Knowledge Graph Citations):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {ragResult.legal_citations.map((cite, idx) => (
                      <span key={idx} className="text-xs px-2.5 py-1 rounded-md bg-slate-950 border border-slate-700 text-slate-200 font-mono">
                        {cite}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Clarification Questions — Hỏi ngược lại người dùng */}
              {ragResult.clarification?.missing_fields && ragResult.clarification.missing_fields.length > 0 && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-amber-400" />
                      AI Hỏi Làm Rõ Thông Tin Còn Thiếu ({ragResult.clarification.missing_fields.length} trường):
                    </h3>
                    <span className="text-xs text-amber-200/90 font-semibold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                      Độ hoàn thiện: {Math.round((ragResult.clarification.completion_rate || 0) * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Theo quy định NĐ 30 đối với <strong className="text-amber-300">{ragResult.document_type}</strong>, thông tin của bạn đang thiếu các trường bắt buộc dưới đây. Bạn hãy trả lời nhanh để AI hoàn thiện văn bản:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {ragResult.clarification.missing_fields.map((field: any) => (
                      <div key={field.key} className="space-y-1 p-3 rounded-lg border border-slate-700 bg-slate-950">
                        <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                          <span>❓ {field.label}</span>
                        </label>
                        <input
                          type="text"
                          value={answers[field.key] || ""}
                          onChange={(e) => handleAnswerChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full text-xs font-mono px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      onClick={handleAppendAnswers}
                      disabled={loading}
                      className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Bổ sung thông tin này & Cập nhật Prompt RAG
                    </Button>
                  </div>
                </div>
              )}

              {/* Mandatory Conditions List */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  Các Điều Kiện Bắt Buộc Theo NĐ 30/2020/NĐ-CP ({ragResult.mandatory_conditions.length}):
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {ragResult.mandatory_conditions.map((cond, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs font-medium text-slate-200">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                        ✓
                      </span>
                      <span>{cond}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engineered Context-Aware RAG Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Generative RAG Prompt Ngữ Cảnh Tối Ưu Hóa:
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPrompt}
                    className="h-8 gap-1.5 text-xs rounded-lg border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Đã chép" : "Sao chép Prompt"}
                  </Button>
                </div>
                <div className="relative rounded-xl border border-purple-500/30 bg-slate-950 p-4 font-mono text-xs text-purple-200 leading-relaxed overflow-x-auto max-h-60">
                  <pre className="whitespace-pre-wrap">{ragResult.context_rag_prompt}</pre>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="rounded-xl border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white px-5 font-semibold text-xs"
          >
            Đóng
          </Button>
          <Button
            onClick={handleApplyToEditor}
            disabled={!inputText.trim() || generatingBlocks}
            className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow transition-all rounded-xl font-semibold text-xs px-4 py-2"
          >
            {generatingBlocks ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Áp dụng vào Trình Soạn Thảo (Side-by-Side Editor)
          </Button>
        </div>

      </div>
    </div>,
    document.body
  );
}
