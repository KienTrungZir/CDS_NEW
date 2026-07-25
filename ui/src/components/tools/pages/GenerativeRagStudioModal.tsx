import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sparkles, ShieldCheck, FileText, Copy, Check, ArrowRight, BookOpen, Layers, X, RefreshCw
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
  
  const [ragResult, setRagResult] = useState<{
    document_type: string;
    mandatory_conditions: string[];
    legal_citations: string[];
    technical_specs: Record<string, string>;
    context_rag_prompt: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-border/80 bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                Generative RAG Prompt Studio 
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">
                  Nghị định 30/2020/NĐ-CP
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Truy vấn Knowledge Graph rút trích các điều kiện bắt buộc & kỹ sư hóa Prompt theo ngữ cảnh
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                Thông tin / Kịch bản đầu vào:
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                (Ví dụ: Tường trình va chạm giao thông, Công văn gửi Bộ Nội vụ...)
              </span>
            </label>
            <Textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập thông tin sự việc, kịch bản hoặc đoạn văn bản thô để hệ thống rút trích điều kiện pháp lý bắt buộc..."
              className="font-mono text-sm resize-none rounded-xl border-border bg-card p-4 focus:ring-2 focus:ring-accent"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleQueryKnowledgeGraph}
                disabled={loading || !inputText.trim()}
                className="gap-2 bg-gradient-to-r from-accent to-blue-600 text-white shadow-glow hover:opacity-90 transition-all rounded-xl"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Truy vấn Knowledge Graph & Tạo Prompt Ngữ Cảnh
              </Button>
            </div>
          </div>

          {/* RAG Knowledge Graph Output */}
          {ragResult && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
              
              {/* Document Type & Legal Citations */}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    Loại Văn Bản Nhận Diện
                  </span>
                  <span className="text-sm font-extrabold text-indigo-300 px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                    {ragResult.document_type}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-accent" />
                    Căn cứ pháp lý (Decree 30 Knowledge Graph Citations):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {ragResult.legal_citations.map((cite, idx) => (
                      <span key={idx} className="text-xs px-2.5 py-1 rounded-md bg-card border border-border text-foreground/90 font-mono">
                        {cite}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mandatory Conditions List */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-500" />
                  Các Điều Kiện Bắt Buộc Theo NĐ 30/2020/NĐ-CP ({ragResult.mandatory_conditions.length}):
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {ragResult.mandatory_conditions.map((cond, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg border border-border/80 bg-card text-xs font-medium text-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">
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
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Generative RAG Prompt Ngữ Cảnh Tối Ưu Hóa:
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPrompt}
                    className="h-8 gap-1.5 text-xs rounded-lg border-border"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Đã chép" : "Sao chép Prompt"}
                  </Button>
                </div>
                <div className="relative rounded-xl border border-purple-500/20 bg-muted/50 p-4 font-mono text-xs text-foreground/90 leading-relaxed overflow-x-auto max-h-60">
                  <pre className="whitespace-pre-wrap">{ragResult.context_rag_prompt}</pre>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/40">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">
            Đóng
          </Button>
          <Button
            onClick={handleApplyToEditor}
            disabled={!inputText.trim() || generatingBlocks}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-glow transition-all rounded-xl"
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
    </div>
  );
}
