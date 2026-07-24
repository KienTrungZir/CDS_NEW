import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Image as ImageIcon, Play, Upload, PenTool } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CopyButton } from "../CopyButton";
import { ToolShell, Panel, Spinner, EmptyHint } from "../ToolShell";
import { OptionRow } from "../options";
import { useOcrHandwriting, useLlmComplete } from "@/api/queries";

const SUPPORTED_EXTS = [".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"];
const ACCEPT_ATTR = SUPPORTED_EXTS.join(",");

function isSupported(filename: string): boolean {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return false;
  return SUPPORTED_EXTS.includes(filename.slice(dot).toLowerCase());
}

export function PrArticlePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const ocr = useOcrHandwriting();
  const llm = useLlmComplete();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onRun = useCallback(() => {
    if (!file || ocr.isPending || llm.isPending) return;
    if (!isSupported(file.name)) {
      toast.error(`Định dạng không hỗ trợ: ${file.name}`);
      return;
    }
    
    ocr.mutate(
      { file },
      {
        onSuccess: (data) => {
          const prompt = `Viết một bài đăng truyền thông mạng xã hội cho sự kiện (phong cách trang trọng, tích cực, nhấn mạnh vào đổi mới) dựa trên thông tin sau:
          
[Thông tin trích xuất từ ảnh]
${data.text}

[Ghi chú thêm từ người dùng]
${notes || "(Không có ghi chú thêm)"}

Yêu cầu:
- Tóm tắt ý chính của sự kiện.
- Nêu bật mục đích và ý nghĩa.
- Độ dài khoảng 300-500 từ.`;

          llm.mutate(prompt, {
            onError: (err) => toast.error(`Tạo bài viết thất bại: ${(err as Error).message}`),
          });
        },
        onError: (err) => toast.error(`OCR thất bại: ${(err as Error).message}`),
      },
    );
  }, [file, notes, ocr, llm]);

  const canRun = !!file && !ocr.isPending && !llm.isPending && isSupported(file.name);
  
  const isPending = ocr.isPending || llm.isPending;
  const result = llm.data;
  const errMsg = (ocr.error as Error)?.message || (llm.error as Error)?.message;

  return (
    <ToolShell
      icon={PenTool}
      title="Tạo Bài Viết Truyền Thông (Từ Ảnh)"
      subtitle="OCR & LLM · Sự kiện / Thông cáo"
      pending={isPending}
      options={
        <>
          <OptionRow label="Ghi chú thêm">
            <textarea
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-accent focus:outline-none"
              rows={3}
              placeholder="VD: Nhấn mạnh vào công tác chuyển đổi số..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </OptionRow>

          <OptionRow label="Quy trình">
            <div className="flex items-center gap-2 text-xs text-ink-soft">
              <span className="flex items-center gap-1"><ImageIcon size={12}/> Ảnh chụp</span>
              <span>→</span>
              <span className="font-mono bg-bg-soft px-1 py-0.5 rounded">Vintern-1B</span>
              <span>→</span>
              <span className="font-mono bg-bg-soft px-1 py-0.5 rounded">Qwen2.5</span>
              <span>→</span>
              <span className="flex items-center gap-1"><FileText size={12}/> Bài viết</span>
            </div>
          </OptionRow>
        </>
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="meta">
            {isPending
              ? ocr.isPending ? "Đang đọc ảnh (OCR)..." : "Đang viết bài (LLM)..."
              : result
                ? "Hoàn tất"
                : !file
                  ? "Chọn ảnh sự kiện để bắt đầu"
                  : "Sẵn sàng — bấm Tạo bài viết để chạy"}
          </span>
          <Button variant="primary" size="md" onClick={onRun} disabled={!canRun}>
            {isPending ? <Spinner /> : <Play size={14} />}
            Tạo Bài Viết
          </Button>
        </div>
      }
    >
      <div
        className={cn(
          "border-2 bg-paper p-5 transition-colors",
          file ? "border-ink" : "border-dashed border-accent",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const dropped = e.dataTransfer.files?.[0];
          if (dropped && isSupported(dropped.name)) setFile(dropped);
          else if (dropped) toast.error(`Định dạng không hỗ trợ: ${dropped.name}`);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm text-ink">
              {file ? (
                <CheckCircle2 size={16} className="shrink-0 text-accent" />
              ) : (
                <ImageIcon size={16} className="shrink-0 text-accent" />
              )}
              <span className="truncate font-mono">
                {file ? file.name : "Chưa chọn ảnh sự kiện/tài liệu"}
              </span>
            </div>
            {file && (
              <p className="meta mt-1 normal-case tracking-normal">
                {(file.size / 1024).toFixed(1)} KB · sẵn sàng trích xuất
              </p>
            )}
            {!file && (
              <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">
                Kéo thả vào đây, hoặc bấm nút bên phải. Hỗ trợ {SUPPORTED_EXTS.join(" · ")}.
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={13} />
            {file ? "Đổi ảnh" : "Chọn ảnh"}
          </Button>
        </div>

        {previewUrl && (
          <div className="mt-3 max-h-[280px] overflow-hidden border border-line bg-bg-soft">
            <img src={previewUrl} alt="preview" className="mx-auto max-h-[280px] object-contain" />
          </div>
        )}
      </div>

      {errMsg && (
        <div className="flex items-start gap-2 border border-danger bg-paper px-3 py-2 text-sm text-danger mt-4">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{errMsg}</span>
        </div>
      )}

      {result ? (
        <div className="mt-4">
          <Panel
            label="Bài Viết Truyền Thông"
            hint={result.model}
            rightSlot={<CopyButton text={result.response} label="Sao chép" />}
          >
            <div className="whitespace-pre-wrap break-words border-l-2 border-accent bg-paper px-3 py-4 font-sans text-sm text-ink leading-relaxed">
              {result.response || "(Lỗi: LLM trả về rỗng)"}
            </div>
          </Panel>
          {ocr.data && (
            <details className="mt-2 text-sm text-ink-soft">
              <summary className="cursor-pointer hover:text-ink">Xem văn bản gốc (OCR)</summary>
              <pre className="mt-2 whitespace-pre-wrap border border-line p-2 text-xs bg-bg-soft">
                {ocr.data.text}
              </pre>
            </details>
          )}
        </div>
      ) : (
        !errMsg && (
          <EmptyHint>
            Tính năng giúp tự động viết bài truyền thông từ ảnh chụp (văn bản giấy, slide, hoặc khung cảnh sự kiện có chữ). Tải lên hình ảnh và thêm ghi chú nếu cần.
          </EmptyHint>
        )
      )}
    </ToolShell>
  );
}
