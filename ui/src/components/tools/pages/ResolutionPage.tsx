import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Upload, Save, Loader2, FileDown, FolderOpen, Trash2, GripVertical, Plus, 
  Table as TableIcon, Minus, Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Eye, EyeOff, FileCode, Copy, Download, ChevronUp, ChevronDown
} from "lucide-react";
import { toast } from "sonner";

interface Template {
  filename: string;
  name: string;
}

export function ResolutionPage() {
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState<any[] | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(true);
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  const [nd30Data, setNd30Data] = useState<any | null>(null);
  const [showNd30Modal, setShowNd30Modal] = useState(false);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex || !blocks) return;
    const updatedBlocks = [...blocks];
    const [movedBlock] = updatedBlocks.splice(draggedIndex, 1);
    updatedBlocks.splice(dropIndex, 0, movedBlock);
    setBlocks(updatedBlocks);
    setDraggedIndex(null);
    setDragOverIndex(null);
    toast.success("Đã di chuyển khối!");
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveBlockUp = (index: number) => {
    if (!blocks || index <= 0) return;
    const updatedBlocks = [...blocks];
    const temp = updatedBlocks[index - 1];
    updatedBlocks[index - 1] = updatedBlocks[index];
    updatedBlocks[index] = temp;
    setBlocks(updatedBlocks);
  };

  const moveBlockDown = (index: number) => {
    if (!blocks || index >= blocks.length - 1) return;
    const updatedBlocks = [...blocks];
    const temp = updatedBlocks[index + 1];
    updatedBlocks[index + 1] = updatedBlocks[index];
    updatedBlocks[index] = temp;
    setBlocks(updatedBlocks);
  };

  useEffect(() => { 
    fetchTemplates(); 
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/resolution/templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch { /* ignore */ }
  };

  const fetchNd30Data = async (currentBlocks: any[]) => {
    try {
      const res = await fetch("/api/resolution/convert_nd30", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: currentBlocks })
      });
      if (res.ok) {
        const d = await res.json();
        setNd30Data(d.nd30_data || null);
      }
    } catch { /* ignore */ }
  };

  const handleOpenNd30Modal = () => {
    if (blocks) {
      fetchNd30Data(blocks);
    }
    setShowNd30Modal(true);
  };

  const handleCopyJson = () => {
    if (nd30Data) {
      navigator.clipboard.writeText(JSON.stringify(nd30Data, null, 2));
      toast.success("Đã sao chép JSON chuẩn NĐ 30 vào clipboard!");
    }
  };

  const handleDownloadJson = () => {
    if (nd30Data) {
      const blob = new Blob([JSON.stringify(nd30Data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VanBan_ND30_${Date.now()}.json`;
      a.click();
      toast.success("Đã tải xuống file JSON!");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resolution/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Lỗi khi đọc ảnh");
      }
      const data = await res.json();
      if (data.image_b64) {
        setImageB64(`data:${file.type || "image/png"};base64,${data.image_b64}`);
      }
      
      toast("Đang phân tích cấu trúc tài liệu...", { icon: "🧠" });
      const genRes = await fetch("/api/resolution/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: data.text,
          image_b64: data.image_b64 || null
        })
      });
      if (!genRes.ok) {
        const genErr = await genRes.json().catch(() => ({}));
        throw new Error(genErr.detail || "Lỗi khi AI xử lý");
      }
      
      const genData = await genRes.json();
      setBlocks(genData.blocks || []);
      if (genData.nd30_data) {
        setNd30Data(genData.nd30_data);
      }
      toast.success("Đã hoàn thành phân tích!");
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!blocks) return;
    toast.loading("Đang xuất file Word...");
    try {
      const res = await fetch("/api/resolution/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks })
      });
      if (!res.ok) throw new Error();
      
      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `VanBan_TuDong_${Date.now()}.docx`;
      a.click();
      toast.dismiss();
      toast.success("Xuất thành công!");
    } catch {
      toast.dismiss();
      toast.error("Lỗi xuất file.");
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !blocks) return;
    try {
      await fetch("/api/resolution/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName, data: { blocks } })
      });
      toast.success(`Đã lưu bản nháp "${templateName}"!`);
      setShowSaveDialog(false);
      setTemplateName("");
      fetchTemplates();
    } catch {
      toast.error("Lỗi lưu bản nháp");
    }
  };

  const handleLoadTemplate = async (filename: string) => {
    try {
      const res = await fetch(`/api/resolution/templates/${filename}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBlocks(data.blocks || []);
      toast.success("Đã tải bản nháp!");
    } catch {
      toast.error("Lỗi tải bản nháp");
    }
  };

  const handleDeleteTemplate = async (filename: string) => {
    try {
      await fetch(`/api/resolution/templates/${filename}`, { method: "DELETE" });
      toast.success("Đã xoá bản nháp");
      fetchTemplates();
    } catch {
      toast.error("Lỗi xoá bản nháp");
    }
  };

  const updateBlock = (index: number, field: string, value: any) => {
    if (!blocks) return;
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    setBlocks(newBlocks);
  };
  
  const removeBlock = (index: number) => {
    if (!blocks) return;
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);
    setBlocks(newBlocks);
  };
  
  const addBlock = (type: string) => {
    if (!blocks) return;
    if (type === "table") {
      setBlocks([
        ...blocks, 
        { 
          type, 
          headers: ["STT", "Nội dung", "Ghi chú"], 
          rows: [["1", "Ví dụ nội dung", ""]] 
        }
      ]);
    } else if (type === "divider") {
      setBlocks([...blocks, { type }]);
    } else {
      setBlocks([...blocks, { type, text: "", left: "", right: "", align: "left", bold: false, italic: false }]);
    }
  };

  // Table manipulation helpers
  const updateTableHeader = (bIdx: number, hIdx: number, val: string) => {
    if (!blocks) return;
    const newBlocks = [...blocks];
    const headers = [...(newBlocks[bIdx].headers || [])];
    headers[hIdx] = val;
    newBlocks[bIdx].headers = headers;
    setBlocks(newBlocks);
  };

  const updateTableCell = (bIdx: number, rIdx: number, cIdx: number, val: string) => {
    if (!blocks) return;
    const newBlocks = [...blocks];
    const rows = (newBlocks[bIdx].rows || []).map((r: string[]) => [...r]);
    if (!rows[rIdx]) rows[rIdx] = [];
    rows[rIdx][cIdx] = val;
    newBlocks[bIdx].rows = rows;
    setBlocks(newBlocks);
  };

  const addTableRow = (bIdx: number) => {
    if (!blocks) return;
    const newBlocks = [...blocks];
    const colsCnt = (newBlocks[bIdx].headers || []).length || 3;
    const newRow = new Array(colsCnt).fill("");
    newBlocks[bIdx].rows = [...(newBlocks[bIdx].rows || []), newRow];
    setBlocks(newBlocks);
  };

  const removeTableRow = (bIdx: number, rIdx: number) => {
    if (!blocks) return;
    const newBlocks = [...blocks];
    const rows = [...(newBlocks[bIdx].rows || [])];
    rows.splice(rIdx, 1);
    newBlocks[bIdx].rows = rows;
    setBlocks(newBlocks);
  };

  const addTableCol = (bIdx: number) => {
    if (!blocks) return;
    const newBlocks = [...blocks];
    const headers = [...(newBlocks[bIdx].headers || []), `Cột ${((newBlocks[bIdx].headers || []).length + 1)}` ];
    const rows = (newBlocks[bIdx].rows || []).map((r: string[]) => [...r, ""]);
    newBlocks[bIdx].headers = headers;
    newBlocks[bIdx].rows = rows;
    setBlocks(newBlocks);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/50">
      {/* Top Header */}
      <div className="p-4 border-b bg-card flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            📄 Tái tạo cấu trúc tài liệu từ Ảnh
          </h1>
          <p className="text-xs text-muted-foreground">
            Tự động đọc ảnh, phân tích bố cục đa thức và tái tạo file Word chuẩn 100%.
          </p>
        </div>
        
        {blocks && imageB64 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowImagePreview(!showImagePreview)}
          >
            {showImagePreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showImagePreview ? "Ẩn ảnh gốc" : "Xem ảnh gốc song song"}
          </Button>
        )}
      </div>

      {!blocks ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-2 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center bg-card shadow-sm">
              <Upload className="w-12 h-12 text-primary mb-4 animate-bounce" />
              <h3 className="text-lg font-medium">Tải lên hình ảnh tài liệu</h3>
              <p className="text-sm text-muted-foreground mb-6">Hỗ trợ các dạng văn bản hành chính, nghị quyết, thông báo, báo cáo...</p>
              <div className="flex gap-4 items-center justify-center">
                <Input type="file" accept="image/*" className="hidden" id="file-upload" onChange={handleUpload} disabled={loading} />
                <Button asChild disabled={loading} size="lg">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {loading ? <Loader2 className="mr-2 animate-spin" /> : <Upload className="mr-2 w-4 h-4" />}
                    Tải ảnh lên để bắt đầu
                  </label>
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-5 shadow-sm max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FolderOpen className="w-5 h-5" /> Các bản nháp đã lưu
              </h3>
              {templates.length > 0 ? (
                <div className="grid gap-2">
                  {templates.map((t) => (
                    <div key={t.filename} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                      <div className="cursor-pointer flex-1 font-medium text-sm" onClick={() => handleLoadTemplate(t.filename)}>
                        {t.name}
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteTemplate(t.filename)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic text-center p-4">Chưa có dữ liệu nào</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Main Split View / Side-by-Side Area */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Original Image Viewer */}
          {imageB64 && showImagePreview && (
            <div className="w-1/2 border-r bg-muted/10 p-4 flex flex-col overflow-hidden">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>📷 Ảnh gốc đối chiếu</span>
                <span className="text-[11px] text-muted-foreground font-normal">Cuộn để phóng to</span>
              </div>
              <div className="flex-1 overflow-auto border rounded-xl bg-card p-2 flex items-center justify-center">
                <img src={imageB64} alt="Ảnh gốc" className="max-w-full h-auto object-contain rounded shadow-sm" />
              </div>
            </div>
          )}

          {/* Right Panel: Interactive Block Editor */}
          <div className={`${imageB64 && showImagePreview ? "w-1/2" : "w-full"} flex flex-col h-full bg-card overflow-hidden`}>
            {/* Top Editor Toolbar */}
            <div className="p-3 border-b flex justify-between items-center bg-muted/20 gap-2 flex-wrap">
              <h2 className="text-sm font-semibold flex items-center gap-1">
                ✏️ Trình biên tập Cấu trúc ({blocks.length} khối)
              </h2>
              <div className="flex gap-2 items-center">
                <Button variant="outline" size="sm" onClick={handleOpenNd30Modal} className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10">
                  <FileCode className="w-3.5 h-3.5 mr-1" /> JSON Chuẩn NĐ 30
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(!showSaveDialog)}>
                  <Save className="w-3.5 h-3.5 mr-1" /> Lưu nháp
                </Button>
                <Button size="sm" onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <FileDown className="w-3.5 h-3.5 mr-1" /> Xuất Word
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setBlocks(null); setImageB64(null); }}>
                  Đóng
                </Button>
              </div>
            </div>

            {showSaveDialog && (
              <div className="flex gap-2 p-3 border-b bg-muted/40">
                <Input placeholder="Tên bản nháp..." value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="flex-1 h-8 text-sm" />
                <Button size="sm" onClick={handleSaveTemplate} disabled={!templateName.trim()}>Lưu</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSaveDialog(false)}>Huỷ</Button>
              </div>
            )}

            {/* Block Items Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {blocks.map((block, i) => (
                <div 
                  key={i} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                  className={`flex gap-3 p-4 rounded-xl border bg-background relative group transition-all duration-150 ${
                    draggedIndex === i ? "opacity-30 border-dashed border-primary" : ""
                  } ${
                    dragOverIndex === i && draggedIndex !== i
                      ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-[1.01] shadow-lg"
                      : "hover:border-primary/50 shadow-sm"
                  }`}
                >
                  {/* Drag Handle & Quick Reorder Buttons */}
                  <div className="flex flex-col items-center justify-start mt-1 space-y-1 select-none">
                    <div 
                      className="text-muted-foreground cursor-grab active:cursor-grabbing hover:text-primary p-1.5 rounded-md hover:bg-muted/80 transition-colors"
                      title="Kéo thả để sắp xếp lại thứ tự"
                    >
                      <GripVertical className="w-5 h-5 text-primary/70" />
                    </div>
                    
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={i === 0}
                        onClick={() => moveBlockUp(i)}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                        title="Di chuyển lên"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={i === blocks.length - 1}
                        onClick={() => moveBlockDown(i)}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                        title="Di chuyển xuống"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    {/* Header bar of block */}
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {block.type === 'header_split' ? 'Phần đầu (2 cột)' : 
                         block.type === 'title' ? 'Tiêu đề chính' : 
                         block.type === 'paragraph' ? 'Đoạn văn' : 
                         block.type === 'list_item' ? 'Gạch đầu dòng' : 
                         block.type === 'table' ? 'Bảng biểu (Table)' : 
                         block.type === 'divider' ? 'Đường kẻ phân cách' : 
                         block.type === 'signature_split' ? 'Chữ ký (2 cột)' : block.type}
                      </span>

                      {/* Formatting tools for text blocks */}
                      {(block.type === 'paragraph' || block.type === 'title' || block.type === 'list_item') && (
                        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-md">
                          <Button 
                            variant={block.bold ? "outline" : "ghost"} 
                            size="icon" className="h-6 w-6 p-0" 
                            onClick={() => updateBlock(i, 'bold', !block.bold)}
                          >
                            <Bold className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant={block.italic ? "outline" : "ghost"} 
                            size="icon" className="h-6 w-6 p-0" 
                            onClick={() => updateBlock(i, 'italic', !block.italic)}
                          >
                            <Italic className="w-3 h-3" />
                          </Button>

                          <div className="h-3 w-px bg-border mx-1" />

                          <Button 
                            variant={(block.align || "left") === "left" ? "outline" : "ghost"} 
                            size="icon" className="h-6 w-6 p-0" 
                            onClick={() => updateBlock(i, 'align', 'left')}
                          >
                            <AlignLeft className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant={block.align === "center" ? "outline" : "ghost"} 
                            size="icon" className="h-6 w-6 p-0" 
                            onClick={() => updateBlock(i, 'align', 'center')}
                          >
                            <AlignCenter className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant={block.align === "right" ? "outline" : "ghost"} 
                            size="icon" className="h-6 w-6 p-0" 
                            onClick={() => updateBlock(i, 'align', 'right')}
                          >
                            <AlignRight className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant={block.align === "justify" ? "outline" : "ghost"} 
                            size="icon" className="h-6 w-6 p-0" 
                            onClick={() => updateBlock(i, 'align', 'justify')}
                          >
                            <AlignJustify className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => removeBlock(i)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Block inputs based on type */}
                    {(block.type === 'header_split' || block.type === 'signature_split') && (
                      <div className="grid grid-cols-2 gap-4">
                        <Textarea placeholder="Cột trái (Cơ quan ban hành / Nơi nhận)..." value={block.left || ""} onChange={(e) => updateBlock(i, 'left', e.target.value)} rows={3} className="text-center font-medium font-serif text-sm" />
                        <Textarea placeholder="Cột phải (Quốc hiệu / Người ký)..." value={block.right || ""} onChange={(e) => updateBlock(i, 'right', e.target.value)} rows={3} className="text-center font-bold font-serif text-sm" />
                      </div>
                    )}

                    {block.type === 'title' && (
                      <Input placeholder="Tiêu đề văn bản..." value={block.text || ""} onChange={(e) => updateBlock(i, 'text', e.target.value)} className="text-center font-bold text-base font-serif" />
                    )}

                    {(block.type === 'paragraph' || block.type === 'list_item') && (
                      <Textarea 
                        placeholder="Nội dung văn bản..." 
                        value={block.text || ""} 
                        onChange={(e) => updateBlock(i, 'text', e.target.value)} 
                        rows={2} 
                        className={`font-serif text-sm ${block.bold ? "font-bold" : ""} ${block.italic ? "italic" : ""}`} 
                      />
                    )}

                    {/* Table Block Render */}
                    {block.type === 'table' && (
                      <div className="space-y-2 overflow-x-auto">
                        <table className="w-full text-xs border-collapse border">
                          <thead>
                            <tr className="bg-muted/50">
                              {(block.headers || []).map((h: string, hIdx: number) => (
                                <th key={hIdx} className="border p-1">
                                  <Input 
                                    value={h} 
                                    onChange={(e) => updateTableHeader(i, hIdx, e.target.value)} 
                                    className="h-6 text-xs text-center font-bold" 
                                  />
                                </th>
                              ))}
                              <th className="border p-1 w-8">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addTableCol(i)}>
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(block.rows || []).map((r: string[], rIdx: number) => (
                              <tr key={rIdx}>
                                {(block.headers || []).map((_: string, cIdx: number) => (
                                  <td key={cIdx} className="border p-1">
                                    <Input 
                                      value={r[cIdx] || ""} 
                                      onChange={(e) => updateTableCell(i, rIdx, cIdx, e.target.value)} 
                                      className="h-6 text-xs" 
                                    />
                                  </td>
                                ))}
                                <td className="border p-1 text-center">
                                  <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => removeTableRow(i, rIdx)}>
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <Button variant="outline" size="sm" onClick={() => addTableRow(i)} className="text-xs h-7">
                          <Plus className="w-3 h-3 mr-1" /> Thêm dòng
                        </Button>
                      </div>
                    )}

                    {block.type === 'divider' && (
                      <div className="py-2 flex items-center justify-center">
                        <div className="w-full border-t border-dashed border-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Add Block Bar */}
            <div className="p-3 border-t bg-muted/20 flex flex-wrap gap-1.5 justify-center">
              <Button variant="outline" size="sm" onClick={() => addBlock('header_split')}><Plus className="w-3 h-3 mr-1"/> Phần đầu</Button>
              <Button variant="outline" size="sm" onClick={() => addBlock('title')}><Plus className="w-3 h-3 mr-1"/> Tiêu đề</Button>
              <Button variant="outline" size="sm" onClick={() => addBlock('paragraph')}><Plus className="w-3 h-3 mr-1"/> Đoạn văn</Button>
              <Button variant="outline" size="sm" onClick={() => addBlock('list_item')}><Plus className="w-3 h-3 mr-1"/> Gạch đầu dòng</Button>
              <Button variant="outline" size="sm" onClick={() => addBlock('table')}><TableIcon className="w-3 h-3 mr-1"/> Bảng biểu</Button>
              <Button variant="outline" size="sm" onClick={() => addBlock('divider')}><Minus className="w-3 h-3 mr-1"/> Đường kẻ</Button>
              <Button variant="outline" size="sm" onClick={() => addBlock('signature_split')}><Plus className="w-3 h-3 mr-1"/> Chữ ký</Button>
            </div>
          </div>
        </div>
      )}

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
              <pre>{JSON.stringify(nd30Data, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
