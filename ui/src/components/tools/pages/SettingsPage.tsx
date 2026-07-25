import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Settings, Server, Key, Shield, ShieldCheck, Check, RefreshCw, Trash2, RotateCcw, Sliders
} from "lucide-react";
import { toast } from "sonner";
import { useHealth } from "@/api/queries";

export function SettingsPage() {
  const healthQ = useHealth();
  const [token, setToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);
  const [defaultTopK, setDefaultTopK] = useState(5);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("cds:auth-token") || "";
      setToken(savedToken);

      const savedTopK = localStorage.getItem("cds:default-top-k");
      if (savedTopK) setDefaultTopK(Number(savedTopK));
    } catch {
      /* ignore */
    }
  }, []);

  const saveToken = () => {
    try {
      if (token.trim()) {
        localStorage.setItem("cds:auth-token", token.trim());
      } else {
        localStorage.removeItem("cds:auth-token");
      }
      setTokenSaved(true);
      toast.success("Đã lưu cấu hình token xác thực!");
      setTimeout(() => setTokenSaved(false), 2000);
    } catch {
      toast.error("Lỗi lưu token");
    }
  };

  const saveTopK = (val: number) => {
    setDefaultTopK(val);
    try {
      localStorage.setItem("cds:default-top-k", String(val));
    } catch {
      /* ignore */
    }
  };

  const resetAllLocalState = () => {
    if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ cài đặt lưu cục bộ trên trình duyệt này?")) return;
    try {
      localStorage.clear();
      toast.success("Đã cài đặt lại bộ nhớ cục bộ!");
      window.location.reload();
    } catch {
      toast.error("Lỗi xóa dữ liệu");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background/50 p-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-glow">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              Cài Đặt & Cấu Hình Hệ Thống
            </h1>
            <p className="text-xs text-muted-foreground">
              Quản lý kết nối máy chủ, mô hình LLM/RAG, xác thực và cấu hình giao diện.
            </p>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => healthQ.refetch()} 
          disabled={healthQ.isFetching}
          className="gap-2 rounded-xl"
        >
          <RefreshCw className={`h-4 w-4 ${healthQ.isFetching ? "animate-spin" : ""}`} />
          Kiểm tra kết nối
        </Button>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        
        {/* 1. Máy chủ Backend Status */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Server className="h-4 w-4 text-accent" />
              Trạng Thái Máy Chủ Backend
            </h2>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
              healthQ.data?.status === "ok" 
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}>
              {healthQ.data?.status === "ok" ? "ĐANG HOẠT ĐỘNG" : "KHÔNG KẾT NỐI"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
              <span className="text-muted-foreground font-medium block">Phiên bản Hệ thống:</span>
              <span className="font-mono font-bold text-foreground">{healthQ.data?.version || "1.0.0"}</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
              <span className="text-muted-foreground font-medium block">Loại CSDL Store:</span>
              <span className="font-mono font-bold text-foreground">{healthQ.data?.store || "MemoryStore"}</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
              <span className="text-muted-foreground font-medium block">Mô hình LLM:</span>
              <span className="font-mono font-bold text-accent">{healthQ.data?.llm || "Ollama (qwen3:8b)"}</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
              <span className="text-muted-foreground font-medium block">Công cụ OCR:</span>
              <span className="font-mono font-bold text-foreground">
                {healthQ.data?.ocr_available ? "Tesseract OK" : "Vintern-1B VLM (Khuyên dùng)"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Token Xác thực Auth */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-400" />
            Xác Thực & API Token (Bearer Auth)
          </h2>
          <p className="text-xs text-muted-foreground">
            Nhập Bearer Token nếu máy chủ backend yêu cầu xác thực API an toàn.
          </p>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Nhập Bearer Token..."
                className="font-mono text-xs rounded-xl"
              />
              <Button onClick={saveToken} className="rounded-xl gap-2">
                {tokenSaved ? <Check className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                {tokenSaved ? "Đã lưu" : "Lưu Token"}
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Token được lưu trữ an toàn Cục bộ trong LocalStorage trình duyệt.</span>
            </div>
          </div>
        </div>

        {/* 3. Cấu hình Trợ lý Chat & RAG */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sliders className="h-4 w-4 text-emerald-500" />
            Cấu Hình Trợ Lý Chat & RAG
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground">Số đoạn tài liệu truy hồi (Default Top-K):</span>
              <span className="font-mono font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-md border border-accent/20">
                {defaultTopK} chunks
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={defaultTopK}
              onChange={(e) => saveTopK(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground">
              Tăng số lượng chunk giúp RAG trích xuất thông tin đầy đủ hơn từ các tài liệu dài.
            </p>
          </div>
        </div>

        {/* 4. Khôi phục & Đặt lại */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Xóa Dữ Liệu Cục Bộ (Reset Storage)
          </h2>
          <p className="text-xs text-muted-foreground">
            Đặt lại toàn bộ cấu hình giao diện, token và lịch sử lưu trong bộ nhớ trình duyệt này.
          </p>

          <div className="flex gap-3">
            <Button onClick={resetAllLocalState} className="bg-destructive hover:bg-destructive/90 text-white rounded-xl gap-2 text-xs">
              <Trash2 className="h-4 w-4" />
              Đặt Lại Toàn Bộ
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="rounded-xl gap-2 text-xs">
              <RotateCcw className="h-4 w-4" />
              Tải Lại Trang
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
