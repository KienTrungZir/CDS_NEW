import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Settings, Server, Key, Shield, ShieldCheck, Check, RefreshCw, Trash2, RotateCcw, Sliders, Cpu, Cloud, Globe, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { useHealth } from "@/api/queries";

export function SettingsPage() {
  const healthQ = useHealth();
  const [token, setToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);
  const [defaultTopK, setDefaultTopK] = useState(5);

  // LLM Config state (Local vs Cloud)
  const [llmMode, setLlmMode] = useState<"local" | "cloud">("local");
  const [provider, setProvider] = useState<"ollama" | "openai" | "anthropic" | "llamacpp">("ollama");
  const [modelId, setModelId] = useState("qwen3:8b");
  const [apiKey, setApiKey] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [savingLlm, setSavingLlm] = useState(false);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("cds:auth-token") || "";
      setToken(savedToken);

      const savedTopK = localStorage.getItem("cds:default-top-k");
      if (savedTopK) setDefaultTopK(Number(savedTopK));

      const savedLlmMode = localStorage.getItem("cds:llm-mode") as "local" | "cloud";
      if (savedLlmMode) setLlmMode(savedLlmMode);

      const savedProvider = localStorage.getItem("cds:llm-provider") as any;
      if (savedProvider) setProvider(savedProvider);

      const savedModel = localStorage.getItem("cds:llm-model");
      if (savedModel) setModelId(savedModel);

      const savedKey = localStorage.getItem("cds:llm-key");
      if (savedKey) setApiKey(savedKey);

      const savedBase = localStorage.getItem("cds:llm-base");
      if (savedBase) setApiBase(savedBase);
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
      toast.success("Đã lưu cấu hình token xác thực API!");
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

  const handleApplyLlmConfig = async () => {
    setSavingLlm(true);
    try {
      const payload = {
        mode: llmMode,
        provider: provider,
        model: modelId.trim() || undefined,
        api_key: apiKey.trim() || undefined,
        api_base: apiBase.trim() || undefined,
      };

      const res = await fetch("/api/llm/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Lỗi cấu hình kết nối LLM");
      }

      const data = await res.json();

      // Save to localStorage
      localStorage.setItem("cds:llm-mode", llmMode);
      localStorage.setItem("cds:llm-provider", provider);
      localStorage.setItem("cds:llm-model", modelId);
      if (apiKey) localStorage.setItem("cds:llm-key", apiKey);
      if (apiBase) localStorage.setItem("cds:llm-base", apiBase);

      healthQ.refetch();
      toast.success(`Đã kết nối thành công với Mô hình ${data.active_model} (${llmMode === "local" ? "Local" : "AI Cloud"})!`);
    } catch (err: any) {
      toast.error(err.message || "Không thể kích hoạt kết nối LLM");
    } finally {
      setSavingLlm(false);
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
              Cài Đặt & Kết Nối Mô Hình LLM / AI
            </h1>
            <p className="text-xs text-muted-foreground">
              Bật/Tắt kết nối LLM Cục bộ (Ollama) hoặc AI bên ngoài qua API Token (OpenAI, Claude, Custom API).
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

      {/* 1. LLM Connection Switcher Card (Local vs Cloud AI) */}
      <div className="rounded-2xl border border-indigo-500/30 bg-card p-6 space-y-6 shadow-md max-w-5xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent font-bold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Cấu Hình Kết Nối Mô Hình LLM (Local vs Cloud AI)
              </h2>
              <p className="text-xs text-muted-foreground">
                Chọn chế độ chạy Cục bộ an toàn dữ liệu hoặc kết nối Dịch vụ AI đám mây bằng API Token
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
            {healthQ.data?.llm || "Ollama (qwen3:8b)"}
          </span>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-4 p-1.5 rounded-xl bg-muted/50 border border-border">
          <button
            type="button"
            onClick={() => {
              setLlmMode("local");
              setProvider("ollama");
              setModelId("qwen3:8b");
            }}
            className={`flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
              llmMode === "local"
                ? "bg-background text-foreground shadow-md border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Cpu className="h-4 w-4 text-emerald-500" />
            🏠 LLM Cục Bộ (Local First - Ollama)
          </button>

          <button
            type="button"
            onClick={() => {
              setLlmMode("cloud");
              setProvider("openai");
              setModelId("gpt-4o-mini");
            }}
            className={`flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
              llmMode === "cloud"
                ? "bg-background text-foreground shadow-md border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Cloud className="h-4 w-4 text-indigo-400" />
            ☁️ AI Bên Ngoài qua Token (OpenAI / Claude)
          </button>
        </div>

        {/* Config Form Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-accent" />
              Nhà cung cấp (Provider):
            </label>
            <select
              value={provider}
              onChange={(e: any) => setProvider(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:ring-2 focus:ring-accent"
            >
              {llmMode === "local" ? (
                <>
                  <option value="ollama">Ollama (Default Local Daemon)</option>
                  <option value="llamacpp">llama.cpp (Local HTTP Server)</option>
                </>
              ) : (
                <>
                  <option value="openai">OpenAI (GPT-4o, GPT-4o-mini, DeepSeek)</option>
                  <option value="anthropic">Anthropic (Claude 3.5 Sonnet, Claude Haiku)</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-accent" />
              Tên Mô hình (Model ID):
            </label>
            <Input
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder={provider === "openai" ? "gpt-4o-mini" : provider === "anthropic" ? "claude-3-5-sonnet-20241022" : "qwen3:8b"}
              className="font-mono text-xs rounded-xl"
            />
          </div>

          {llmMode === "cloud" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-purple-400" />
                API Token / API Key:
              </label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="font-mono text-xs rounded-xl"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-accent" />
              API Base URL (Tùy chọn):
            </label>
            <Input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder={provider === "openai" ? "https://api.openai.com/v1" : "http://localhost:11434"}
              className="font-mono text-xs rounded-xl"
            />
          </div>

        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleApplyLlmConfig}
            disabled={savingLlm}
            className="gap-2 bg-gradient-to-r from-accent to-indigo-600 text-white shadow-glow hover:opacity-90 transition-all rounded-xl"
          >
            {savingLlm ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Áp Dụng & Kích Hoạt Mô Hình LLM
          </Button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        
        {/* 2. Máy chủ Backend Status */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Server className="h-4 w-4 text-accent" />
              Thông Tin Máy Chủ Backend
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
              <span className="text-muted-foreground font-medium block">CSDL Store:</span>
              <span className="font-mono font-bold text-foreground">{healthQ.data?.store || "MemoryStore"}</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
              <span className="text-muted-foreground font-medium block">Mô hình LLM Hiện Tại:</span>
              <span className="font-mono font-bold text-accent">{healthQ.data?.llm || "Ollama"}</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
              <span className="text-muted-foreground font-medium block">Công cụ OCR:</span>
              <span className="font-mono font-bold text-foreground">
                {healthQ.data?.ocr_available ? "Tesseract OK" : "Vintern-1B VLM"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Bearer Auth Token */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-400" />
            Xác Thực API Token (Bearer Auth Header)
          </h2>
          <p className="text-xs text-muted-foreground">
            Nhập Bearer Token nếu máy chủ backend yêu cầu Header xác thực API.
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

        {/* 4. Cấu hình Trợ lý Chat & RAG */}
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

        {/* 5. Khôi phục & Đặt lại */}
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
