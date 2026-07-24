import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Play, MessageSquareWarning } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToolShell, Panel, Spinner, EmptyHint } from "../ToolShell";
import { TextInput } from "../TextInput";
import { useToolRunner } from "../useToolRunner";
import { useSentiment } from "@/api/queries";

const STORAGE_KEY = "nom:tool:sentiment";

function load(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw || "";
  } catch {
    return "";
  }
}

export function SentimentPage() {
  const [text, setText] = useState(load);
  const sentiment = useSentiment();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {
      /* localStorage may be unavailable */
    }
  }, [text]);

  const onRun = useCallback(() => {
    const t = text.trim();
    if (!t || sentiment.isPending) return;
    sentiment.mutate(t, {
      onError: (err) => toast.error(`Phân tích thất bại: ${(err as Error).message}`),
    });
  }, [text, sentiment]);

  const canRun = !!text.trim() && !sentiment.isPending;
  useToolRunner(onRun, canRun);

  const result = sentiment.data;
  const errMsg = sentiment.error ? (sentiment.error as Error).message : null;

  return (
    <ToolShell
      icon={MessageSquareWarning}
      title="Phân tích sắc thái (Sentiment)"
      subtitle="Đánh giá ý kiến nhân dân · Tích cực / Tiêu cực / Trung lập"
      pending={sentiment.isPending}
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="meta">
            {result
              ? `Hoàn tất · Label: ${result.label}`
              : !text.trim()
                ? "Dán ý kiến/đoạn văn rồi bấm Phân tích"
                : "Sẵn sàng — bấm Phân tích để chạy"}
          </span>
          <Button variant="primary" size="md" onClick={onRun} disabled={!canRun}>
            {sentiment.isPending ? <Spinner /> : <Play size={14} />}
            Phân tích
          </Button>
        </div>
      }
    >
      <TextInput
        value={text}
        onChange={setText}
        rows={5}
        placeholder="Dán ý kiến, bình luận hoặc đoạn văn bản vào đây…"
      />

      {errMsg && (
        <div className="flex items-start gap-2 border border-danger bg-paper px-3 py-2 text-sm text-danger mt-4">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{errMsg}</span>
        </div>
      )}

      {result ? (
        <div className="mt-4">
          <Panel
            label="Kết quả phân tích"
            hint={`Score: ${result.score.toFixed(4)}`}
          >
            <div className="flex flex-col gap-2 border-l-2 border-accent bg-paper px-4 py-3 text-sm text-ink leading-relaxed">
              <div className="flex items-center gap-2">
                <span className="font-semibold w-24">Sắc thái:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-widest ${
                  result.label === 'positive' ? 'bg-green-100 text-green-800 border border-green-300' :
                  result.label === 'negative' ? 'bg-red-100 text-red-800 border border-red-300' :
                  'bg-gray-100 text-gray-800 border border-gray-300'
                }`}>
                  {result.label === 'positive' ? 'Tích cực' : result.label === 'negative' ? 'Tiêu cực' : 'Trung lập'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold w-24">Độ tin cậy:</span>
                <span className="font-mono bg-bg-soft px-1 rounded">{(result.score * 100).toFixed(2)}%</span>
              </div>
            </div>
          </Panel>
        </div>
      ) : (
        !errMsg && (
          <EmptyHint>
            Tính năng phân tích sắc thái ý kiến nhân dân, bài báo, đánh giá. Giúp cơ quan quản lý dễ dàng nắm bắt thái độ của dư luận.
          </EmptyHint>
        )
      )}
    </ToolShell>
  );
}
