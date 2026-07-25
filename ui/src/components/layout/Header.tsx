import { Cpu, Settings as SettingsIcon } from "lucide-react";

// Top bar — brand mark, tagline, runtime context (model name), top-right
// shortcuts (settings + API docs). The chữ Nôm 喃 is the project's
// character; keep it visible.

interface HeaderProps {
  modelName?: string;
  /** Server-reported package version (from /api/health). */
  version?: string;
  onHome?: () => void;
  /** Open the Settings task. */
  onSettings?: () => void;
  /** Open the API & Setup task. */
  onApi?: () => void;
  /** When true (chat mode on mobile), reserve room on the right for
   *  the studio drawer toggle floated by AppShell. */
  reserveRightOnMobile?: boolean;
}

export function Header({
  modelName,
  version,
  onHome,
  onSettings,
  reserveRightOnMobile,
}: HeaderProps) {
  // Reserve 40px on the right whenever AppShell floats the studio toggle
  // there (chat mode below xl), so it doesn't cover the settings button.
  // The toggle disappears at xl, where right-pad collapses back to 5.
  const rightPad = reserveRightOnMobile ? "pr-12 xl:pr-5" : "pr-3 xl:pr-5";
  return (
    <header
      className={`flex h-12 shrink-0 items-center justify-between border-b border-ink bg-bg pl-12 ${rightPad} xl:pl-5 xl:pr-5`}
    >
      <button
        onClick={onHome}
        className="group flex items-baseline gap-3"
        title="Về trang chủ"
        aria-label="Trang chủ"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-blue-500 shadow-glow">
            <span className="font-display font-bold text-white">C</span>
          </div>
          <h1 className="font-display text-2xl font-black leading-none tracking-tight text-ink transition-colors group-hover:text-accent">
            CDS
          </h1>
        </div>
        <span className="section-mark hidden text-xs font-semibold uppercase tracking-widest transition-colors group-hover:text-ink sm:inline">
          Hệ Thống Chuyển Đổi Số Văn Bản Hành Chính (NĐ 30/2020/NĐ-CP)
        </span>
      </button>
      <div className="flex items-center gap-2 text-xs">
        {modelName && (
          <span className="meta-strong hidden items-center gap-1.5 border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full font-mono font-bold sm:inline-flex">
            <Cpu size={12} className="text-accent" />
            {modelName === "anthropic" ? "☁️ Anthropic Claude 3.5" : modelName === "openai" ? "☁️ OpenAI GPT-4o" : `🏠 ${modelName}`}
          </span>
        )}
        {version && <span className="meta hidden sm:inline">v{version}</span>}
        {/*
        {onApi && (
          <button
            type="button"
            onClick={onApi}
            aria-label="API và cài đặt"
            title="API và cài đặt"
            className="grid h-8 w-8 place-items-center border border-line bg-paper text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            <BookOpen size={14} />
          </button>
        )}
        */}
        {onSettings && (
          <button
            type="button"
            onClick={onSettings}
            aria-label="Cài đặt"
            title="Cài đặt"
            className="grid h-8 w-8 place-items-center border border-line bg-paper text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            <SettingsIcon size={14} />
          </button>
        )}
      </div>
    </header>
  );
}
