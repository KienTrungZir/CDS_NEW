import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sparkles, Network, Search, Send, RefreshCw, ZoomIn, ZoomOut, Maximize2, 
  HelpCircle, ShieldCheck, Layers, BookOpen, ChevronRight, X, Cpu, Database, Move, Info,
  FileText, FileCode, ExternalLink, Download, Brain, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { GenerativeRagStudioModal } from "@/components/tools/pages/GenerativeRagStudioModal";

interface DocumentAction {
  docType: string;
  title: string;
  promptText: string;
}

interface GraphNode {
  id: string;
  label: string;
  category: "doc_type" | "decree_article" | "vector_store" | "system";
  count: number;
  x: number;
  y: number;
  connections: string[];
  details: string;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  highlightNodes?: string[];
  citations?: string[];
  documentAction?: DocumentAction;
}

// Fixed static node positions covering all 76 pages of Decree 30/2020/NĐ-CP
const INITIAL_NODES: GraphNode[] = [
  { id: "ban_tuong_trinh", label: "Bản tường trình", category: "doc_type", count: 29, x: 200, y: 140, connections: ["d8_the_thuc", "phu_luc_1", "vector_chunks"], details: "Văn bản cá nhân trình bày diễn biến sự việc xảy ra theo đúng sự thật. Yêu cầu đầy đủ 11 khối thể thức theo NĐ 30/2020/NĐ-CP." },
  { id: "nghi_quyet", label: "Nghị quyết (cá biệt)", category: "doc_type", count: 29, x: 420, y: 80, connections: ["d7_the_thuc", "d13_ky_ban_hanh", "phu_luc_3"], details: "Mẫu 1.1 Phụ lục III. Văn bản do tập thể ban hành (HĐND, Hội đồng quản trị,...). Thẩm quyền ký: TM. HỘI ĐỒNG (Ký thay mặt)." },
  { id: "quyet_dinh", label: "Quyết định (cá biệt)", category: "doc_type", count: 20, x: 650, y: 120, connections: ["d7_the_thuc", "d8_the_thuc", "phu_luc_3"], details: "Mẫu 1.2 & 1.3 Phụ lục III. Ban hành quy định trực tiếp hoặc phê duyệt đính kèm văn bản khác." },
  { id: "cong_van", label: "Công văn hành chính", category: "doc_type", count: 18, x: 260, y: 300, connections: ["d8_the_thuc", "phu_luc_1", "phu_luc_3"], details: "Mẫu 1.5 Phụ lục III. Văn bản hành chính không có tên loại. Trích yếu nội dung đặt sau chữ V/v dưới số ký hiệu." },
  { id: "bao_cao", label: "Báo cáo & Tờ trình", category: "doc_type", count: 16, x: 520, y: 260, connections: ["d8_the_thuc", "d13_ky_ban_hanh"], details: "Mẫu 1.4 Phụ lục III. Bố cục báo cáo: I. Tình hình thực hiện, II. Kết quả đạt được, III. Phương hướng & Đề xuất kiến nghị." },
  
  { id: "d7_the_thuc", label: "Điều 7 - Thể thức 29 loại văn bản", category: "decree_article", count: 29, x: 480, y: 170, connections: ["d8_the_thuc", "phu_luc_3"], details: "Quy định 29 loại văn bản hành chính: Nghị quyết, quyết định, chỉ thị, quy chế, quy định, thông báo, hướng dẫn, chương trình, kế hoạch, phương án, đề án, dự án, báo cáo, biên bản, tờ trình, hợp đồng, công văn, công điện, bản ghi nhớ, bản thỏa thuận, giấy ủy quyền, giấy mời, giấy giới thiệu, giấy nghỉ phép, phiếu gửi, phiếu chuyển, phiếu báo, thư công." },
  { id: "d8_the_thuc", label: "Điều 8 - 9 Thành phần chính", category: "decree_article", count: 12, x: 360, y: 200, connections: ["phu_luc_1", "d13_ky_ban_hanh"], details: "9 Thành phần thể thức chính: 1. Quốc hiệu & Tiêu ngữ, 2. Tên cơ quan ban hành, 3. Số ký hiệu, 4. Địa danh ngày tháng, 5. Tên loại & Trích yếu, 6. Nội dung, 7. Chức vụ chữ ký, 8. Dấu/chữ ký số, 9. Nơi nhận." },
  { id: "d13_ky_ban_hanh", label: "Điều 13 - Thẩm quyền ký & Mực xanh", category: "decree_article", count: 10, x: 620, y: 360, connections: ["d8_the_thuc", "d32_con_dau"], details: "Chữ ký dùng MỰC MÀU XANH đối với bản giấy. Hình thức ký: TM. (Thay mặt), KT. (Ký thay), TL. (Thừa lệnh), TUQ. (Thừa ủy quyền)." },
  { id: "d25_sao_van_ban", label: "Điều 25-27 - Sao y, Sao lục, Trích sao", category: "decree_article", count: 15, x: 180, y: 400, connections: ["phu_luc_1", "vector_chunks"], details: "Sao y (từ giấy sang giấy/điện tử), Sao lục (từ bản sao y), Trích sao (tạo lại phần nội dung cần trích sao). BẢN SAO Y/SAO LỤC/TRÍCH SAO CÓ GIÁ TRỊ PHÁP LÝ NHƯ BẢN CHÍNH." },
  { id: "d32_con_dau", label: "Điều 32-33 - Quản lý con dấu & Giáp lai", category: "decree_article", count: 14, x: 660, y: 480, connections: ["d13_ky_ban_hanh", "phu_luc_1"], details: "Đóng dấu trùm lên khoảng 1/3 chữ ký về PHÍA BÊN TRÁI. Dấu giáp lai đóng ở mép phải, MỖI DẤU ĐÓNG TỐI ĐA 05 TỜ VĂN BẢN." },
  
  { id: "phu_luc_1", label: "Phụ lục I - Kỹ thuật trình bày & Lề trang", category: "decree_article", count: 20, x: 300, y: 440, connections: ["d8_the_thuc", "d9_le_trang"], details: "Khổ A4 (210x297mm). Lề trên/dưới 20-25mm, trái 30-35mm, phải 15-20mm. Phông Times New Roman TCVN 6909:2001, màu đen. Đánh số trang lề trên ở giữa từ số 1 (không hiển thị trang 1)." },
  { id: "phu_luc_2", label: "Phụ lục II - Quy tắc Viết hoa", category: "decree_article", count: 18, x: 140, y: 280, connections: ["phu_luc_1"], details: "Quy tắc viết hoa danh từ riêng chỉ tên người, tên địa lý, tên cơ quan tổ chức. Viết hoa đặc biệt: 'Nhà nước', 'Nhân dân', 'Bác', 'Đảng'." },
  { id: "phu_luc_3", label: "Phụ lục III - Bảng Viết tắt & Mẫu 1.1-3.2", category: "decree_article", count: 29, x: 460, y: 380, connections: ["d7_the_thuc", "nghi_quyet", "quyet_dinh", "cong_van"], details: "Bảng chữ viết tắt 29 loại văn bản (NQ, QĐ, CT, BC, TTr, HĐ, CĐ, GM, GGT, GNP...) và chi tiết các Mẫu trình bày từ Mẫu 1.1 đến Mẫu 3.2." },
  { id: "phu_luc_4", label: "Phụ lục IV - Mẫu dấu ĐẾN & Sổ văn bản", category: "decree_article", count: 12, x: 520, y: 500, connections: ["d20_d24"], details: "Kích thước dấu ĐẾN: 35mm x 50mm khắc sẵn. Quy định sổ đăng ký văn bản đi, đến và phiếu giải quyết văn bản đến." },
  { id: "phu_luc_5", label: "Phụ lục V - Lập Danh mục hồ sơ & Nộp lưu", category: "decree_article", count: 10, x: 320, y: 540, connections: ["d28_d31"], details: "Mẫu Danh mục hồ sơ ban hành đầu năm, Mục lục hồ sơ nộp lưu (02 bản), Biên bản giao nhận hồ sơ lưu trữ." },
  { id: "phu_luc_6", label: "Phụ lục VI - Hệ thống tài liệu điện tử", category: "decree_article", count: 16, x: 120, y: 520, connections: ["vector_chunks"], details: "Quy định mã định danh cơ quan (OrganId 13 ký tự), mã hồ sơ (FileCode), năm hình thành (FileCatalog 4 số), định dạng PDF v1.4 trở lên." },
  
  { id: "vector_chunks", label: "ChromaDB Vector Store (76 Pages Data)", category: "vector_store", count: 76, x: 420, y: 460, connections: ["ban_tuong_trinh", "phu_luc_1", "phu_luc_6"], details: "Kho dữ liệu 76 trang Nghị định 30/2020/NĐ-CP được mã hóa thành các vector embeddings 768 chiều nhúng bằng mpnet-base-v2." },
  { id: "rag_evaluator", label: "RAG Evaluator & Faithfulness", category: "system", count: 8, x: 240, y: 580, connections: ["vector_chunks"], details: "Bộ đánh giá tự động 3 tiêu chí: Completeness (11 khối thể thức), Faithfulness (bám sát 38 điều NĐ 30), Relevance." },
];

const TOPIC_SIDEBAR_ITEMS = [
  { id: "ban_tuong_trinh", label: "Bản tường trình & Sự cố va chạm", count: 29, cat: "Loại văn bản" },
  { id: "d7_the_thuc", label: "Điều 7 NĐ 30 - Thể thức 29 loại văn bản", count: 29, cat: "Nghị định 30" },
  { id: "d8_the_thuc", label: "Điều 8 NĐ 30 - 9 Thành phần thể thức chính", count: 12, cat: "Nghị định 30" },
  { id: "phu_luc_1", label: "Phụ lục I - Kỹ thuật trình bày & Lề trang A4", count: 20, cat: "Phụ lục NĐ 30" },
  { id: "d13_ky_ban_hanh", label: "Điều 13 NĐ 30 - Thẩm quyền ký & Mực màu xanh", count: 10, cat: "Nghị định 30" },
  { id: "d25_sao_van_ban", label: "Điều 25-27 - Sao y, Sao lục, Trích sao", count: 15, cat: "Nghị định 30" },
  { id: "d32_con_dau", label: "Điều 32-33 - Đóng dấu 1/3 chữ ký & Dấu giáp lai", count: 14, cat: "Nghị định 30" },
  { id: "phu_luc_2", label: "Phụ lục II - Quy tắc Viết hoa tên riêng & Nhà nước", count: 18, cat: "Phụ lục NĐ 30" },
  { id: "phu_luc_3", label: "Phụ lục III - Bảng Viết tắt & Mẫu 1.1 - Mẫu 3.2", count: 29, cat: "Phụ lục NĐ 30" },
  { id: "phu_luc_4", label: "Phụ lục IV - Mẫu dấu ĐẾN (35x50mm) & Sổ văn bản", count: 12, cat: "Phụ lục NĐ 30" },
  { id: "phu_luc_5", label: "Phụ lục V - Lập Danh mục hồ sơ & Nộp lưu", count: 10, cat: "Phụ lục NĐ 30" },
  { id: "phu_luc_6", label: "Phụ lục VI - Hệ thống tài liệu điện tử & OrganId", count: 16, cat: "Phụ lục NĐ 30" },
  { id: "vector_chunks", label: "ChromaDB Vector Store (Full 76 Pages Index)", count: 76, cat: "Vector Engine" },
  { id: "nghi_quyet", label: "Nghị quyết (cá biệt) - Mẫu 1.1", count: 29, cat: "Loại văn bản" },
  { id: "quyet_dinh", label: "Quyết định (cá biệt) - Mẫu 1.2 & 1.3", count: 20, cat: "Loại văn bản" },
  { id: "cong_van", label: "Công văn hành chính - Mẫu 1.5", count: 18, cat: "Loại văn bản" },
  { id: "bao_cao", label: "Báo cáo & Tờ trình - Mẫu 1.4", count: 16, cat: "Loại văn bản" },
  { id: "rag_evaluator", label: "RAG Evaluator & Faithfulness Scoring", count: 8, cat: "RAG Pipeline" },
];

export function KnowledgeGraphPage() {
  const [nodes, setNodes] = useState<GraphNode[]>(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "shared" | "links" | "ai">("all");
  
  // Explicit Pan Mode Toggle State (User suggestion)
  const [isPanMode, setIsPanMode] = useState<boolean>(false);

  // Generative RAG Studio Modal State
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);
  const [activeStudioPrompt, setActiveStudioPrompt] = useState<string>("");
  const [thinkingStep, setThinkingStep] = useState<string>("🔍 Đang truy vấn ChromaDB (76 trang NĐ 30)...");
  
  // Derived selectedNode object (always fresh from nodes array)
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // Keep a Ref to nodes for live mouse event calculations
  const nodesRef = useRef<GraphNode[]>(INITIAL_NODES);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Canvas Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Use Refs for instantaneous event tracking
  const draggingNodeRef = useRef<string | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseMovedRef = useRef<boolean>(false);

  const [chatInput, setChatInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [showInfoPanel, setShowInfoPanel] = useState(true);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      sender: "ai",
      text: "Xin chào! Tôi là Trợ lý AI Tra cứu RAG & Đồ thị Tri thức Nghị định 30/2020/NĐ-CP. Bạn có thể hỏi tôi bất kỳ câu hỏi pháp lý nào, hoặc KÉO / BẤM vào các Nút trên Đồ thị bên cạnh để xem chi tiết!",
      timestamp: "14:45",
      highlightNodes: ["ban_tuong_trinh", "d8_the_thuc", "vector_chunks"],
      citations: ["Điều 7 NĐ 30", "Điều 8 NĐ 30", "ChromaDB Store"]
    }
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render Canvas with Zoom & Pan Transforms (STATIC POSITIONS)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Apply Zoom & Pan Transformation
      ctx.translate(panOffset.x, panOffset.y);
      ctx.scale(zoomLevel, zoomLevel);

      // Draw Edges (Lines between connected nodes)
      nodes.forEach((n) => {
        n.connections.forEach((targetId) => {
          const target = nodes.find((tn) => tn.id === targetId);
          if (target) {
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(target.x, target.y);

            const isHighlighted =
              highlightedNodes.includes(n.id) && highlightedNodes.includes(target.id);

            if (isHighlighted) {
              ctx.strokeStyle = "rgba(99, 102, 241, 0.9)";
              ctx.lineWidth = 3;
            } else {
              ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
              ctx.lineWidth = 1.2;
            }
            ctx.stroke();
          }
        });
      });

      // Draw Nodes
      nodes.forEach((n) => {
        const isSelected = selectedNodeId === n.id;
        const isHighlighted = highlightedNodes.includes(n.id);

        ctx.beginPath();
        const radius = isSelected ? 18 : isHighlighted ? 15 : 13;
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);

        if (isSelected) {
          ctx.fillStyle = "#ec4899"; // pink
          ctx.shadowColor = "#ec4899";
          ctx.shadowBlur = 18;
        } else if (isHighlighted) {
          ctx.fillStyle = "#6366f1"; // indigo
          ctx.shadowColor = "#6366f1";
          ctx.shadowBlur = 14;
        } else if (n.category === "doc_type") {
          ctx.fillStyle = "#3b82f6"; // blue
          ctx.shadowBlur = 0;
        } else if (n.category === "decree_article") {
          ctx.fillStyle = "#10b981"; // emerald
          ctx.shadowBlur = 0;
        } else if (n.category === "vector_store") {
          ctx.fillStyle = "#a855f7"; // purple
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = "#f59e0b"; // amber
          ctx.shadowBlur = 0;
        }
        ctx.fill();

        // Draw Node Border
        ctx.lineWidth = 2;
        ctx.strokeStyle = isSelected ? "#ffffff" : isHighlighted ? "#a5b4fc" : "rgba(255,255,255,0.4)";
        ctx.stroke();

        // Draw Label
        ctx.font = isSelected || isHighlighted ? "bold 12px Inter, sans-serif" : "11px Inter, sans-serif";
        ctx.fillStyle = isSelected || isHighlighted ? "#ffffff" : "#cbd5e1";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + radius + 15);

        // Count badge inside node
        ctx.font = "bold 9px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(n.count.toString(), n.x, n.y + 3);
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [nodes, selectedNodeId, highlightedNodes, zoomLevel, panOffset]);

  // Attach non-passive wheel event listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoomLevel((prevZoom) => Math.min(Math.max(prevZoom * zoomFactor, 0.4), 3.0));
    };

    canvas.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheelNative);
    };
  }, []);

  // Dynamic Canvas Resize Observer to guarantee 1:1 CSS pixel to Canvas pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const resizeCanvas = () => {
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  // Handle Mouse Down (Exact 1:1 Drag and Drop)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    mouseMovedRef.current = false;

    // Convert mouse event coords to canvas world coords
    const mouseX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
    const mouseY = (e.clientY - rect.top - panOffset.y) / zoomLevel;

    // Check hit radius in world space (25px)
    const clickedNode = nodesRef.current.find((n) => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) <= 25;
    });

    if (clickedNode) {
      setSelectedNodeId(clickedNode.id);
      setHighlightedNodes([clickedNode.id, ...clickedNode.connections]);
      if (!isPanMode) {
        draggingNodeRef.current = clickedNode.id;
        isPanningRef.current = false;
      }
    } else {
      draggingNodeRef.current = null;
      if (isPanMode) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      } else {
        isPanningRef.current = false;
        setSelectedNodeId(null); // Cleanly deselect node when clicking empty space
        setHighlightedNodes([]);
      }
    }
  };

  // Handle Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    mouseMovedRef.current = true;

    if (draggingNodeRef.current) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
      const mouseY = (e.clientY - rect.top - panOffset.y) / zoomLevel;

      setNodes((prevNodes) =>
        prevNodes.map((n) => (n.id === draggingNodeRef.current ? { ...n, x: mouseX, y: mouseY } : n))
      );
    } else if (isPanningRef.current) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }
  };

  // Handle Mouse Up
  const handleMouseUp = () => {
    draggingNodeRef.current = null;
    isPanningRef.current = false;
  };

  // Handle Chat Send with Conversational RAG
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    setChatInput("");

    const newMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, newMsg]);
    setLoadingChat(true);
    setThinkingStep("🔍 Đang truy vấn ChromaDB Store (76 trang NĐ 30)...");

    const startTime = Date.now();

    const timer1 = setTimeout(() => {
      setThinkingStep("🧠 Đang phân tích 9 khối thể thức & Căn cứ pháp lý...");
    }, 500);

    const timer2 = setTimeout(() => {
      setThinkingStep("⚡ Đang phát sáng các Nút trên Đồ thị Tri thức 2D...");
    }, 1000);

    try {
      const historyPayload = messages.map((m) => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch("/api/resolution/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history: historyPayload })
      });
      const data = await res.json();
      
      const elapsed = Date.now() - startTime;
      if (elapsed < 1400) {
        await new Promise((r) => setTimeout(r, 1400 - elapsed));
      }

      clearTimeout(timer1);
      clearTimeout(timer2);

      let matchedNodes: string[] = ["d8_the_thuc", "vector_chunks"];
      if (data.document_type === "BẢN TƯỜNG TRÌNH") {
        matchedNodes.push("ban_tuong_trinh", "phu_luc_1", "d32_con_dau");
      } else if (data.document_type === "GIẤY NGHỈ PHÉP") {
        matchedNodes.push("phu_luc_3", "phu_luc_1", "d8_the_thuc");
      } else if (data.document_type === "NGHỊ QUYẾT") {
        matchedNodes.push("nghi_quyet", "d13_ky_ban_hanh");
      } else {
        matchedNodes.push("cong_van", "d7_the_thuc");
      }

      setHighlightedNodes(matchedNodes);

      const docType = data.document_type || "VĂN BẢN HÀNH CHÍNH";

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: data.answer || `Đã giải đáp câu hỏi của bạn đối với loại văn bản [${docType}].`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        highlightNodes: matchedNodes,
        citations: data.legal_citations || ["Điều 8 NĐ 30/2020/NĐ-CP"],
        documentAction: {
          docType: docType,
          title: `Khởi tạo & Soạn thảo văn bản [${docType}] chuẩn Nghị định 30`,
          promptText: userText
        }
      };

      setMessages((prev) => [...prev, aiMsg]);
      toast.success("AI đã hoàn thành suy luận & Trả lời!");
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      toast.error(err.message || "Lỗi truy vấn AI");
    } finally {
      setLoadingChat(false);
    }
  };

  const filteredSidebarItems = TOPIC_SIDEBAR_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* LEFT PANEL: Topic & Entity List View */}
      <div className="w-80 shrink-0 border-r border-slate-800 bg-slate-900/90 flex flex-col">
        
        {/* Left Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Danh sách Chủ đề & Thực thể</h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
            {filteredSidebarItems.length}
          </span>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              type="text"
              placeholder="Tìm kiếm chủ đề, điều luật, vector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Sidebar Topic List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredSidebarItems.map((item) => {
            const isSelected = selectedNodeId === item.id;
            const isHighlighted = highlightedNodes.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => {
                  const targetNode = nodes.find((n) => n.id === item.id);
                  if (targetNode) {
                    setSelectedNodeId(targetNode.id);
                    setHighlightedNodes([targetNode.id, ...targetNode.connections]);
                  }
                }}
                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all text-xs ${
                  isSelected
                    ? "bg-indigo-600 text-white font-semibold shadow-glow"
                    : isHighlighted
                    ? "bg-indigo-950/80 text-indigo-200 border border-indigo-500/40"
                    : "hover:bg-slate-800/80 text-slate-300"
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="truncate">{item.label}</p>
                  <span className="text-[10px] text-slate-500 block">{item.cat}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  isSelected ? "bg-indigo-800 text-white" : "bg-slate-800 text-slate-400"
                }`}>
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER PANEL: Interactive 2D Knowledge Graph Canvas */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="h-12 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Network className="h-4 w-4 text-indigo-400" />
              Topics <span className="text-indigo-400 font-mono ml-1">207</span>
            </span>
            <span className="text-xs text-slate-400">Entries <span className="font-mono text-slate-200">31</span></span>
            
            <div className="h-4 w-px bg-slate-800" />

            {/* Filter Chips */}
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-1 rounded-full border transition-all ${
                  activeFilter === "all" ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 font-bold" : "border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                ● All Nodes
              </button>
              <button
                onClick={() => setActiveFilter("shared")}
                className={`px-2.5 py-1 rounded-full border transition-all ${
                  activeFilter === "shared" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold" : "border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                ● Shared entries
              </button>
              <button
                onClick={() => setActiveFilter("links")}
                className={`px-2.5 py-1 rounded-full border transition-all ${
                  activeFilter === "links" ? "bg-blue-500/20 text-blue-300 border-blue-500/50 font-bold" : "border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                ● Entry links
              </button>
              <button
                onClick={() => setActiveFilter("ai")}
                className={`px-2.5 py-1 rounded-full border transition-all ${
                  activeFilter === "ai" ? "bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold" : "border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                ● AI declared
              </button>
            </div>
          </div>

          {/* Zoom Controls & Pan Mode Toggle */}
          <div className="flex items-center gap-2">
            {/* Pan Mode Toggle Button */}
            <Button
              size="sm"
              variant={isPanMode ? "default" : "outline"}
              onClick={() => {
                const next = !isPanMode;
                setIsPanMode(next);
                toast.info(next ? "Đã BẬT chế độ Trượt màn hình (Pan Canvas)" : "Đã TẮT chế độ Trượt màn hình (Chế độ Kéo Node)");
              }}
              className={`h-8 text-xs border-slate-700 transition-all font-semibold ${
                isPanMode 
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-glow" 
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Move className="h-3.5 w-3.5 mr-1.5" />
              {isPanMode ? "Trượt Màn Hình: BẬT" : "Kéo Node"}
            </Button>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 3.0))}
                className="h-7 w-7 text-slate-300 hover:text-white"
                title="Phóng to (Zoom In)"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] font-mono text-slate-400 px-1">{Math.round(zoomLevel * 100)}%</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.4))}
                className="h-7 w-7 text-slate-300 hover:text-white"
                title="Thu nhỏ (Zoom Out)"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setZoomLevel(1.0);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="h-7 w-7 text-slate-300 hover:text-white"
                title="Reset View"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button size="sm" variant="outline" className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
              Seed with AI
            </Button>
          </div>
        </div>

        {/* Interactive 2D Canvas Area */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full cursor-grab active:cursor-grabbing bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]"
          />

          {/* Screenshot Overlay Tooltip: "What connects two topics?" */}
          {showInfoPanel && (
            <div className="absolute top-4 left-4 max-w-sm rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur-md p-4 text-xs text-slate-300 shadow-2xl space-y-2 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-indigo-400" />
                  What connects two topics?
                </span>
                <button onClick={() => setShowInfoPanel(false)} className="text-slate-500 hover:text-slate-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                💡 <strong>Kéo chuột</strong> để di chuyển các Node. Dùng con lăn chuột hoặc bộ nút bên trên để <strong>Zoom Phóng to/Thu nhỏ</strong>. Nhấp vào khoảng trống để bỏ chọn Node!
              </p>
              <div className="space-y-1 pt-1 font-mono text-[10px]">
                <div className="text-cyan-400">● Shared entries: Căn cứ pháp lý dùng chung</div>
                <div className="text-blue-400">● Entry links: Quy định thể thức liên kết</div>
                <div className="text-purple-400">● AI declared: Rút trích tự động bởi LLM & Vector Store</div>
              </div>
            </div>
          )}

          {/* Node Inspector Modal / Detailed Info Card when node clicked */}
          {selectedNode && (
            <div className="absolute bottom-4 left-4 max-w-md rounded-2xl border border-indigo-500/50 bg-slate-900/95 backdrop-blur-xl p-5 text-xs shadow-2xl space-y-3 animate-in slide-in-from-bottom-3 duration-200 text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Info className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm tracking-tight">{selectedNode.label}</h3>
                    <span className="text-[10px] text-indigo-300 uppercase font-mono font-semibold">{selectedNode.category}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedNodeId(null)} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-slate-300 text-xs leading-relaxed font-sans">{selectedNode.details}</p>
                
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nodes Liên Kết Trực Tiếp ({selectedNode.connections.length}):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.connections.map((connId) => {
                      const connNode = nodes.find((n) => n.id === connId);
                      return (
                        <button
                          key={connId}
                          onClick={() => {
                            if (connNode) {
                              setSelectedNodeId(connNode.id);
                              setHighlightedNodes([connNode.id, ...connNode.connections]);
                            }
                          }}
                          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-mono text-[11px] border border-slate-700 transition-all flex items-center gap-1"
                        >
                          <span>🔗</span>
                          <span>{connNode?.label || connId}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span>Số tài liệu / Chunks: <strong className="text-indigo-400 font-mono">{selectedNode.count}</strong></span>
                <span>Vị trí Node: <strong className="text-slate-300 font-mono">X:{Math.round(selectedNode.x)}, Y:{Math.round(selectedNode.y)}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: AI Assistant Chat Window & RAG Studio */}
      <div className="w-96 shrink-0 border-l border-slate-800 bg-slate-900/95 flex flex-col">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Assistant & RAG Studio</h3>
              <p className="text-[10px] text-slate-400">Ollama (qwen3:8b) + ChromaDB</p>
            </div>
          </div>
        </div>

        {/* Chat Messages Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[90%] p-3.5 rounded-xl text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-indigo-600 text-white rounded-br-none shadow-glow"
                    : "bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1">
                    {msg.citations.map((c, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-indigo-300 font-mono border border-indigo-500/30">
                        🔗 {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Interactive Document Action Card */}
                {msg.documentAction && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950/90 border border-indigo-500/50 space-y-2.5 shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-indigo-400" />
                        {msg.documentAction.docType}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold border border-emerald-500/30">
                        ✓ NĐ 30 Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">{msg.documentAction.title}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveStudioPrompt(msg.documentAction!.promptText);
                          setIsStudioOpen(true);
                        }}
                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-glow flex-1"
                      >
                        <FileCode className="h-3.5 w-3.5 mr-1.5" />
                        Mở Trình Soạn Thảo Văn Bản (RAG Studio)
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}
          {loadingChat && (
            <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-indigo-500/60 shadow-glow animate-pulse space-y-2 max-w-[92%] border-l-4 border-l-indigo-500">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Brain className="h-4 w-4 text-purple-400 animate-bounce" />
                  <span className="font-bold text-xs text-indigo-300 tracking-wide uppercase">AI Deep Thinking & RAG Studio</span>
                </div>
              </div>
              <div className="pl-6 pt-1">
                <p className="text-xs text-slate-200 font-mono transition-all duration-300 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{thinkingStep}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90 space-y-2">
          <div className="flex items-center gap-2">
            <Textarea
              rows={2}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Hỏi AI hoặc đề nghị soạn văn bản..."
              className="resize-none font-mono text-xs bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <Button
              onClick={handleSendMessage}
              disabled={loadingChat || !chatInput.trim()}
              size="icon"
              className="h-14 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-glow"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>

      {/* Generative RAG Studio Modal */}
      <GenerativeRagStudioModal
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        onApplyBlocks={(blocks, promptText) => {
          toast.success("Đã nạp 11 khối thể thức Nghị định 30 thành công!");
          setIsStudioOpen(false);
        }}
      />

    </div>
  );
}
