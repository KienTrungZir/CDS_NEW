import { useEffect, useMemo, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster, toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { TaskNav } from "@/components/layout/TaskNav";
import { SpacesSidebar } from "@/components/spaces/SpacesSidebar";
import type { TaskKey } from "@/components/layout/tasks";
import { ChatThread } from "@/components/chat/ChatThread";
import { MaterialsDrawer } from "@/components/materials/MaterialsDrawer";
import { DiacriticPage } from "@/components/tools/pages/DiacriticPage";
import { TokenizePage } from "@/components/tools/pages/TokenizePage";
import { NormalizePage } from "@/components/tools/pages/NormalizePage";
import { StripPage } from "@/components/tools/pages/StripPage";
import { TranslatePage } from "@/components/tools/pages/TranslatePage";
import { ConvertPage } from "@/components/tools/pages/ConvertPage";
import { JobsPage } from "@/components/tools/pages/JobsPage";
import { RegisterPage } from "@/components/tools/pages/RegisterPage";
import { HandwritingPage } from "@/components/tools/pages/HandwritingPage";
import { SpellPage } from "@/components/tools/pages/SpellPage";
import { SttPage } from "@/components/tools/pages/SttPage";
import { NerPage } from "@/components/tools/pages/NerPage";
import { SummarizePage } from "@/components/tools/pages/SummarizePage";
import { ModelsPage } from "@/components/tools/pages/ModelsPage";
import { AgentRunPage } from "@/components/tools/pages/AgentRunPage";
import { CompliancePage } from "@/components/tools/pages/CompliancePage";
import { AdminPage } from "@/components/tools/pages/AdminPage";
import { ApiPage } from "@/components/tools/pages/ApiPage";
import { SettingsPage } from "@/components/tools/pages/SettingsPage";
import { ResolutionPage } from "@/components/tools/pages/ResolutionPage";
import { WorkflowPage } from "@/components/tools/pages/WorkflowPage";
import { PrArticlePage } from "@/components/tools/pages/PrArticlePage";
import { SentimentPage } from "@/components/tools/pages/SentimentPage";
import { useHealth, useSpaces } from "@/api/queries";

const ACTIVE_SPACE_KEY = "nom:active-space";
const ACTIVE_TASK_KEY = "nom:active-task";

const TASK_KEYS: ReadonlySet<TaskKey> = new Set([
  "chat",
  "diacritic",
  "tokenize",
  "normalize",
  "strip",
  "translate",
  "convert",
  "jobs",
  "models",
  "agents",
  "compliance",
  "admin",
  "api",
  "settings",
  "workflow",
  "pr",
  "sentiment"
]);

import { TASK_SLUGS, taskFromPath } from "@/components/layout/tasks";

function loadTask(): TaskKey {
  if (typeof window !== "undefined") {
    const fromUrl = taskFromPath(window.location.pathname);
    if (fromUrl) return fromUrl;
  }
  try {
    const raw = localStorage.getItem(ACTIVE_TASK_KEY);
    if (raw && TASK_KEYS.has(raw as TaskKey)) return raw as TaskKey;
  } catch {
  }
  return "chat";
}

export default function App() {
  const [activeTask, setActiveTaskRaw] = useState<TaskKey>(loadTask);

  const setActiveTask = (next: TaskKey): void => {
    const slug = TASK_SLUGS[next];
    if (typeof window !== "undefined" && window.location.pathname !== slug) {
      window.history.pushState({ task: next }, "", slug);
    }
    setActiveTaskRaw(next);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const fromUrl = taskFromPath(window.location.pathname);
      if (fromUrl) setActiveTaskRaw(fromUrl);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  
  const [storedSpaceId, setStoredSpaceId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_SPACE_KEY);
  });
  const spacesQ = useSpaces();
  const healthQ = useHealth();

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TASK_KEY, activeTask);
    } catch {
    }
  }, [activeTask]);

  useEffect(() => {
    if (storedSpaceId) localStorage.setItem(ACTIVE_SPACE_KEY, storedSpaceId);
    else localStorage.removeItem(ACTIVE_SPACE_KEY);
  }, [storedSpaceId]);

  const activeSpaceId = useMemo(() => {
    if (!storedSpaceId) return null;
    if (!spacesQ.data) return null;
    return spacesQ.data.some((s) => s.id === storedSpaceId) ? storedSpaceId : null;
  }, [storedSpaceId, spacesQ.data]);

  useEffect(() => {
    if (storedSpaceId && spacesQ.data && activeSpaceId === null) {
      setStoredSpaceId(null);
    }
  }, [storedSpaceId, spacesQ.data, activeSpaceId]);

  useEffect(() => {
    if (spacesQ.isError) {
      toast.error(`Không tải được danh sách không gian: ${(spacesQ.error as Error).message}`);
    }
  }, [spacesQ.isError, spacesQ.error]);

  const activeSpace = useMemo(
    () => spacesQ.data?.find((s) => s.id === activeSpaceId) ?? null,
    [spacesQ.data, activeSpaceId],
  );

  const hasMaterials = (activeSpace?.n_materials ?? 0) > 0;
  const isChat = activeTask === "chat";

  let centerPane: React.ReactNode;
  switch (activeTask) {
    case "chat":
      centerPane = (
        <ChatThread
          spaceId={activeSpaceId}
          spaceName={activeSpace?.name ?? null}
          hasMaterials={hasMaterials}
        />
      );
      break;
    case "diacritic":
      centerPane = <DiacriticPage />;
      break;
    case "tokenize":
      centerPane = <TokenizePage />;
      break;
    case "normalize":
      centerPane = <NormalizePage />;
      break;
    case "strip":
      centerPane = <StripPage />;
      break;
    case "translate":
      centerPane = <TranslatePage />;
      break;
    case "convert":
      centerPane = <ConvertPage />;
      break;
    case "jobs":
      centerPane = <JobsPage />;
      break;
    case "register":
      centerPane = <RegisterPage />;
      break;
    case "handwriting":
      centerPane = <HandwritingPage />;
      break;
    case "spell":
      centerPane = <SpellPage />;
      break;
    case "stt":
      centerPane = <SttPage />;
      break;
    case "ner":
      centerPane = <NerPage />;
      break;
    case "summarize":
      centerPane = <SummarizePage />;
      break;
    case "models":
      centerPane = <ModelsPage />;
      break;
    case "agents":
      centerPane = <AgentRunPage />;
      break;
    case "compliance":
      centerPane = <CompliancePage />;
      break;
    case "admin":
      centerPane = <AdminPage />;
      break;
    case "api":
      centerPane = <ApiPage />;
      break;
    case "settings":
      centerPane = <SettingsPage />;
      break;
    case "resolution":
      centerPane = <ResolutionPage />;
      break;
    case "workflow":
      centerPane = <WorkflowPage />;
      break;
    case "pr":
      centerPane = <PrArticlePage />;
      break;
    case "sentiment":
      centerPane = <SentimentPage />;
      break;
  }

  return (
    <TooltipProvider delayDuration={120}>
      <AppShell
        modelName={healthQ.data?.llm ?? undefined}
        version={healthQ.data?.version ?? undefined}
        mode={isChat ? "chat" : "tool"}
        onHome={() => setActiveTask("chat")}
        onSettings={() => setActiveTask("settings")}
        onApi={() => setActiveTask("api")}
        sidebar={<TaskNav active={activeTask} onSelect={setActiveTask} />}
        spacesSidebar={
          isChat ? (
            <SpacesSidebar
              activeSpaceId={activeSpaceId}
              onSelect={(id) => setStoredSpaceId(id || null)}
            />
          ) : undefined
        }
        studio={isChat ? <MaterialsDrawer spaceId={activeSpaceId} /> : undefined}
      >
        {centerPane}
      </AppShell>
      <Toaster
        position="bottom-right"
        toastOptions={{
          unstyled: false,
          className:
            "!bg-paper !border !border-ink !text-ink !rounded-none !shadow-editorial-soft !font-sans",
        }}
      />
    </TooltipProvider>
  );
}
