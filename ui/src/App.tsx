import { useEffect, useMemo, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster, toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { TaskNav } from "@/components/layout/TaskNav";
import { SpacesSidebar } from "@/components/spaces/SpacesSidebar";
import type { TaskKey } from "@/components/layout/tasks";
import { ChatThread } from "@/components/chat/ChatThread";
import { MaterialsDrawer } from "@/components/materials/MaterialsDrawer";
import { ConvertPage } from "@/components/tools/pages/ConvertPage";
import { HandwritingPage } from "@/components/tools/pages/HandwritingPage";
import { ResolutionPage } from "@/components/tools/pages/ResolutionPage";
import { WorkflowPage } from "@/components/tools/pages/WorkflowPage";
import { PrArticlePage } from "@/components/tools/pages/PrArticlePage";
import { SentimentPage } from "@/components/tools/pages/SentimentPage";
import { SettingsPage } from "@/components/tools/pages/SettingsPage";
import { KnowledgeGraphPage } from "@/components/tools/pages/KnowledgeGraphPage";
import { useHealth, useSpaces } from "@/api/queries";

const ACTIVE_SPACE_KEY = "cds:active-space";
const ACTIVE_TASK_KEY = "cds:active-task";

const TASK_KEYS: ReadonlySet<TaskKey> = new Set([
  "chat",
  "resolution",
  "workflow",
  "pr",
  "sentiment",
  "convert",
  "handwriting",
  "settings",
  "graph"
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
  return "resolution";
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
    case "convert":
      centerPane = <ConvertPage />;
      break;
    case "handwriting":
      centerPane = <HandwritingPage />;
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
    case "settings":
      centerPane = <SettingsPage />;
      break;
    case "graph":
      centerPane = <KnowledgeGraphPage />;
      break;
    default:
      centerPane = <ResolutionPage />;
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
