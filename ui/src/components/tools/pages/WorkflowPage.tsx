import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Handle,
  Position,
  Connection,
  Edge,
  Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Play, FileDown, Cpu, FileText, FileUp, FileCode, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

// --- CUSTOM NODES ---

const InputNode = ({ data, id }: any) => {
  return (
    <div className="glass-card w-80 rounded-xl overflow-hidden shadow-lg border-l-4 border-l-blue-500">
      <div className="bg-blue-500/10 p-3 font-semibold flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-500" /> Nguồn dữ liệu (Input)
      </div>
      <div className="p-4 space-y-4">
        
        {/* Chọn Mẫu Word */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-blue-400">1. Mẫu báo cáo (Tùy chọn)</div>
          <div className="flex gap-2">
            <select 
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-xs"
              value={data.selectedTemplate || ""}
              onChange={(e) => data.updateNodeData(id, { selectedTemplate: e.target.value })}
            >
              <option value="" className="bg-background text-foreground">-- Chuẩn NĐ 30/2020/NĐ-CP (Tự động dàn trang) --</option>
              {data.templates?.map((t: any) => (
                <option key={t.filename} value={t.filename} className="bg-background text-foreground">{t.name}</option>
              ))}
            </select>
            <label className="cursor-pointer bg-muted hover:bg-muted/80 p-2 rounded flex items-center justify-center border" title="Tải Mẫu lên">
              <input 
                type="file" 
                className="hidden" 
                accept=".docx"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    await fetch("/api/resolution/docx-templates", { method: "POST", body: fd });
                    toast.success("Tải mẫu lên thành công!");
                    data.refreshTemplates?.();
                  } catch (err) {
                    toast.error("Lỗi tải mẫu");
                  }
                }}
              />
              <FileUp className="w-4 h-4" />
            </label>
          </div>
        </div>

        {/* OCR / Upload */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-blue-400">2. Nội dung gốc</div>
          <Input 
            type="file" 
            accept="image/*" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              data.setNodeLoading(id, true);
              try {
                const fd = new FormData();
                fd.append("file", file);
                const res = await fetch("/api/resolution/upload", { method: "POST", body: fd });
                if (!res.ok) {
                  const errJson = await res.json().catch(() => ({}));
                  throw new Error(errJson.detail || "Lỗi khi OCR");
                }
                const json = await res.json();
                data.updateNodeData(id, { text: json.text });
                toast.success("OCR thành công!");
              } catch (err) {
                toast.error("Lỗi OCR");
              } finally {
                data.setNodeLoading(id, false);
              }
            }}
          />
          <div className="text-center text-[10px] text-muted-foreground uppercase">- Hoặc nhập chữ -</div>
          <Textarea 
            placeholder="Nhập nội dung vào đây..." 
            value={data.text || ""} 
            onChange={(e) => data.updateNodeData(id, { text: e.target.value })}
            className="h-20 text-xs"
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </div>
  );
};

const AINode = ({ data, id }: any) => {
  return (
    <div className="glass-card w-80 rounded-xl overflow-hidden shadow-lg border-l-4 border-l-purple-500">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500" />
      <div className="bg-purple-500/10 p-3 font-semibold flex items-center gap-2">
        <Cpu className="w-4 h-4 text-purple-500" /> Trí tuệ Nhân tạo (Ollama)
      </div>
      <div className="p-4 space-y-3">
        <div className="text-xs text-muted-foreground">Phân tích bố cục văn bản từ đầu vào.</div>
        <div className="text-xs font-semibold">Chỉ thị (Prompt):</div>
        <Textarea 
          value={data.prompt || ""} 
          placeholder="Ví dụ: Phân tích và điền thêm thông tin..."
          onChange={(e) => data.updateNodeData(id, { prompt: e.target.value })}
          className="h-16 text-xs bg-white/5"
        />
        {data.loading && <div className="text-xs text-purple-500 animate-pulse text-center">Đang suy nghĩ...</div>}
        {data.result && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-emerald-400 font-semibold">✓ Cấu trúc NĐ 30 Sẵn sàng</span>
              {(data.result.nd30_data || data.result.header) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => data.onOpenNd30Modal?.(data.result)} 
                  className="h-6 text-[10px] border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 px-2"
                >
                  <FileCode className="w-3 h-3 mr-1" /> JSON NĐ 30
                </Button>
              )}
            </div>
            <div className="text-xs bg-muted/50 p-2 rounded max-h-24 overflow-y-auto font-mono text-[10px]">
              <pre>{JSON.stringify(data.result, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" />
    </div>
  );
};

const ExportNode = ({ data }: any) => {
  return (
    <div className="glass-card w-80 rounded-xl overflow-hidden shadow-lg border-l-4 border-l-green-500">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-green-500" />
      <div className="bg-green-500/10 p-3 font-semibold flex items-center gap-2">
        <FileDown className="w-4 h-4 text-green-500" /> Xuất File Word
      </div>
      <div className="p-4 space-y-3">
        <div className="text-xs text-muted-foreground">Tạo file .docx dựa trên cấu trúc blocks.</div>
        {data.downloadUrl ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] text-emerald-400 font-medium">
              <span>✓ Đã dàn trang NĐ 30</span>
              {data.result && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => data.onOpenNd30Modal?.(data.result)} 
                  className="h-6 text-[10px] border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 px-2"
                >
                  <FileCode className="w-3 h-3 mr-1" /> JSON NĐ 30
                </Button>
              )}
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white" asChild>
              <a href={data.downloadUrl} download="VanBan_TuDong.docx">
                <FileDown className="w-4 h-4 mr-2" /> Tải xuống Word (NĐ 30)
              </a>
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Chưa có dữ liệu
          </Button>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  inputNode: InputNode,
  aiNode: AINode,
  exportNode: ExportNode,
};

const initialNodes: Node[] = [
  { id: '1', type: 'inputNode', position: { x: 50, y: 150 }, data: { text: '', selectedTemplate: '' } },
  { id: '2', type: 'aiNode', position: { x: 450, y: 150 }, data: { prompt: '' } },
  { id: '3', type: 'exportNode', position: { x: 850, y: 150 }, data: {} },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
];

// --- WORKFLOW ORCHESTRATOR ---

const WorkflowEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);
  const [templates, setTemplates] = useState([]);
  
  const [nd30ModalData, setNd30ModalData] = useState<any | null>(null);
  const [showNd30Modal, setShowNd30Modal] = useState(false);

  const handleOpenNd30Modal = (dataObj: any) => {
    if (!dataObj) return;
    const targetData = dataObj.nd30_data || (dataObj.header ? dataObj : null);
    if (targetData) {
      setNd30ModalData(targetData);
      setShowNd30Modal(true);
    } else {
      toast.error("Chưa có dữ liệu chuẩn Nghị định 30!");
    }
  };

  const handleCopyJson = () => {
    if (!nd30ModalData) return;
    navigator.clipboard.writeText(JSON.stringify(nd30ModalData, null, 2));
    toast.success("Đã sao chép JSON NĐ 30 vào clipboard!");
  };

  const handleDownloadJson = () => {
    if (!nd30ModalData) return;
    const blob = new Blob([JSON.stringify(nd30ModalData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CongVan_NghiDinh30.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/resolution/docx-templates");
      const json = await res.json();
      setTemplates(json.templates);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const updateNodeData = useCallback((id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, ...newData } };
        }
        return n;
      })
    );
  }, [setNodes]);

  const setNodeLoading = useCallback((id: string, loading: boolean) => {
    updateNodeData(id, { loading });
  }, [updateNodeData]);

  // Inject helper methods into node data
  const nodesWithHelpers = nodes.map(node => {
    if (node.type === 'inputNode') {
      return {
        ...node,
        data: {
          ...node.data,
          updateNodeData,
          setNodeLoading,
          templates,
          refreshTemplates: loadTemplates
        }
      };
    }
    return {
      ...node,
      data: {
        ...node.data,
        updateNodeData,
        setNodeLoading,
        onOpenNd30Modal: handleOpenNd30Modal
      }
    };
  });

  const handleRunWorkflow = async () => {
    if (isRunning) return;
    setIsRunning(true);
    toast("Đang thực thi Workflow...", { icon: "🚀" });
    
    // Find input node (id 1)
    const inputNode = nodes.find(n => n.type === 'inputNode');
    const aiNode = nodes.find(n => n.type === 'aiNode');
    
    if (!inputNode?.data.text && !aiNode?.data.prompt) {
      toast.error("Vui lòng cung cấp ít nhất một nội dung đầu vào hoặc chỉ thị AI!");
      setIsRunning(false);
      return;
    }

    const templateParams = inputNode?.data.selectedTemplate ? `?template=${inputNode.data.selectedTemplate}` : '';

    // Step 1: AI Node (id 2)
    const aiInstructions = aiNode?.data.prompt || "Phân tích tài liệu.";
    const inputText = inputNode?.data.text ? `\n\n=== TÀI LIỆU ===\n${inputNode.data.text}` : '';
    const combinedPrompt = `${aiInstructions}${inputText}`;

    setNodeLoading('2', true);
    let aiResult = null;
    try {
      const payload: any = { prompt: combinedPrompt };
      if (inputNode?.data.selectedTemplate) {
        payload.template = inputNode.data.selectedTemplate;
      }
      
      const res = await fetch("/api/resolution/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      aiResult = await res.json();
      updateNodeData('2', { result: aiResult, loading: false });
    } catch (err) {
      toast.error("Lỗi tại AI Node");
      setNodeLoading('2', false);
      setIsRunning(false);
      return;
    }

    // Step 2: Export Node (id 3)
    setNodeLoading('3', true);
    try {
      const res = await fetch(`/api/resolution/export${templateParams}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiResult)
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      updateNodeData('3', { downloadUrl: objUrl, result: aiResult, loading: false });
      toast.success("Workflow chạy thành công!");
    } catch (err) {
      toast.error("Lỗi tại Export Node");
      setNodeLoading('3', false);
    }
    
    setIsRunning(false);
  };

  return (
    <div className="h-[90vh] w-full flex flex-col relative bg-background/50 rounded-xl overflow-hidden border shadow-inner">
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 glass px-6 py-3 rounded-full flex items-center gap-4">
        <h2 className="font-bold text-gradient mr-4">Workflow Builder</h2>
        <Button 
          onClick={handleRunWorkflow} 
          disabled={isRunning}
          className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
        >
          {isRunning ? (
            <span className="animate-pulse">Đang chạy...</span>
          ) : (
            <><Play className="w-4 h-4 mr-2" /> Chạy Workflow</>
          )}
        </Button>
      </div>

      <div className="flex-1 w-full h-full">
        <ReactFlow
          nodes={nodesWithHelpers}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-grid-pattern"
        >
          <Background color="#888" gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </div>

      {showNd30Modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b flex justify-between items-center bg-muted/40">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base">Cấu trúc JSON Chuẩn Nghị định 30/2020/NĐ-CP</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyJson}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Sao chép
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadJson}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Tải file JSON
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowNd30Modal(false)}>
                  Đóng
                </Button>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-auto bg-slate-950 font-mono text-xs text-emerald-400 leading-relaxed">
              <pre>{JSON.stringify(nd30ModalData, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export function WorkflowPage() {
  return (
    <ReactFlowProvider>
      <WorkflowEditor />
    </ReactFlowProvider>
  );
}
