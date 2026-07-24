# CDS — Hệ Thống Chuyển Đổi Số Văn Bản Hành Chính (Nghị định 30/2020/NĐ-CP)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.10%2B-blue)](https://www.python.org)
[![Status](https://img.shields.io/badge/status-v1.0.0-brightgreen)]()

> **Phát triển & Tùy biến bởi @KienTrungZir**  
> *Hệ thống AI xử lý, chuyển đổi số và tự động hóa văn bản hành chính Việt Nam tuân thủ 100% quy chuẩn thể thức của Nghị định 30/2020/NĐ-CP.*

---

## 🌟 Chức năng trọng tâm

### 1. 🏛️ Soạn Nghị Quyết & Công Văn Chuẩn NĐ 30/2020/NĐ-CP
- **Tự động phân tích & dàn trang**: Nhận diện hình ảnh / văn bản thô và chuyển đổi thành cấu trúc chuẩn Nghị định 30 (Quốc hiệu, Tiêu ngữ, Căn lề, Phông chữ Times New Roman 13-14pt, Nơi nhận & Chữ ký).
- **Bộ biên tập kéo thả 2 bên (Side-by-Side Editor)**: Chỉnh sửa trực tiếp từng khối (Block) văn bản, thay đổi thứ tự và định dạng linh hoạt.
- **Xuất file Word (.docx) & JSON NĐ 30**: Hỗ trợ xem, sao chép và tải file JSON chuẩn thể thức hoặc xuất trực tiếp file `.docx` đúng lề luật.

### 2. 🔄 Workflow Builder (Kéo thả sơ đồ tự động hóa)
- Trình dựng quy trình tương tác Drag & Drop sử dụng ReactFlow.
- **Input Node**: Tải ảnh OCR, chọn Mẫu báo cáo `.docx` hoặc chế độ dàn trang tự động NĐ 30.
- **AI Node**: Kết nối Ollama LLM phân tích chỉ thị & dữ liệu, tích hợp cửa sổ xem **JSON Chuẩn NĐ 30**.
- **Export Node**: Tự động khởi tạo file Word và đường dẫn tải xuống an toàn.

### 3. 📰 Báo cáo & Truyền thông
- Viết bài truyền thông, tin tức tổng hợp từ hình ảnh chụp sự kiện hoặc tài liệu thô.

### 4. 📊 Phân tích Dư luận Xã hội
- Phân tích cảm xúc, đọc & tóm tắt ý kiến nhân dân, trích xuất thông tin trọng tâm từ các nguồn khảo sát.

### 5. 💬 Trợ lý Chat & Graph RAG
- Hỏi đáp tài liệu hành chính thông minh, trích dẫn nguồn dữ liệu chính xác tuyệt đối.

### 6. 📄 Chuyển định dạng & OCR Cục bộ
- Trích xuất văn bản từ file PDF, ảnh quét, biểu mẫu và chữ viết tay (Vintern-1B) chạy hoàn toàn Cục bộ (Local First).

---

## 🛠️ Hướng dẫn Khởi chạy Cục bộ (Local Setup)

### 1. Khởi động Backend Python (FastAPI API Server)
```powershell
$env:HF_HOME="D:\HuggingFaceCache"
.\venv\Scripts\nom serve
```
*Máy chủ Backend sẽ lắng nghe tại: `http://127.0.0.1:8080`*

### 2. Khởi động Frontend React (Vite UI)
```powershell
cd ui
npm run dev
```
*Truy cập giao diện Web tại: `http://localhost:5173`*

---

## 📁 Cấu trúc Dự án

```
CDS/
├── src/
│   └── nom/
│       ├── resolution/      # Bộ xử lý Nghị định 30, AI Generator & Word Exporter
│       └── chat/            # FastAPI Server & Chat RAG Engine
├── ui/
│   ├── src/
│   │   ├── components/
│   │   │   ├── tools/pages/ # 7 Ứng dụng chính (Resolution, Workflow, PR, Sentiment, Convert...)
│   │   │   ├── layout/      # Header, Sidebar & Task Navigation
│   │   │   └── chat/        # Trợ lý Hỏi đáp
│   └── package.json
├── pyproject.toml
└── README.md
```

---

## 📜 Giấy phép & Tác quyền
- Phát triển và tối ưu bởi **@KienTrungZir** (`https://github.com/KienTrungZir/CDS_NEW.git`).
- Mã nguồn mở phát hành theo giấy phép Apache 2.0.




7 layers (Primitives / Models / Retrieval / RAG / Storage / Application / Deployment), every meaningful boundary is a `typing.Protocol`. Local single-process today; the cloud path replaces three Protocol implementations and changes nothing in the application layer.

See **[docs/architecture.md](https://github.com/nrl-ai/nom-vn/blob/main/docs/architecture.md)** for the full layered model, Protocol seam table, and scaling-path reference.

---

## Models & datasets we publish

Apache-2.0-friendly artifacts on Hugging Face Hub (cite Viet-Anh Nguyen
and Neural Research Lab per the repo's citation block):

- 🤗 [`nrl-ai/vn-diacritic-vit5-base`](https://huggingface.co/nrl-ai/vn-diacritic-vit5-base) — register-balanced ViT5 fine-tune for diacritic restoration
- 🤗 [`nrl-ai/vn-diacritic-eval`](https://huggingface.co/datasets/nrl-ai/vn-diacritic-eval) — 4-register diacritic evaluation grid (1,227 sentence pairs)
- 🤗 [`nrl-ai/vn-diacritic-train`](https://huggingface.co/datasets/nrl-ai/vn-diacritic-train) — 500K Wikipedia + 150K NFC-fixed VN news training pairs

Full per-task detail: [`docs/tasks/diacritic-restoration.md`](https://github.com/nrl-ai/nom-vn/blob/main/docs/tasks/diacritic-restoration.md).

---

## Documentation

- **[docs/readme.md](https://github.com/nrl-ai/nom-vn/blob/main/docs/readme.md)** — docs index pointing at all per-task pages
- **[docs/tasks/](https://github.com/nrl-ai/nom-vn/tree/main/docs/tasks)** — one page per task (public landscape + our pipeline + trained models + datasets + results)
- **[docs/architecture.md](https://github.com/nrl-ai/nom-vn/blob/main/docs/architecture.md)** — the 7-layer model, Protocol seams, scaling path, anti-architecture rules
- **[docs/pipeline.md](https://github.com/nrl-ai/nom-vn/blob/main/docs/pipeline.md)** — the document-extraction pipeline end-to-end with per-stage picks
- **[docs/benchmark.md](https://github.com/nrl-ai/nom-vn/blob/main/docs/benchmark.md)** — measured numbers per module (the receipts behind every "Recommended stack" row above)
- **[docs/recipes.md](https://github.com/nrl-ai/nom-vn/blob/main/docs/recipes.md)** — task-oriented "I want X, do Y" cookbook with copy-paste code
- **[docs/release.md](https://github.com/nrl-ai/nom-vn/blob/main/docs/release.md)** — how to cut a PyPI release (Trusted Publishing via GitHub Actions, no tokens)
- **[docs/training_plan_2026q2.md](https://github.com/nrl-ai/nom-vn/blob/main/docs/training_plan_2026q2.md)** — when to fine-tune vs adopt off-the-shelf, per component, with cost estimates
- **[docs/sota_vn_2026q2.md](https://github.com/nrl-ai/nom-vn/blob/main/docs/sota_vn_2026q2.md)** — SOTA local LLM / embedding / OCR for Vietnamese (April 2026 snapshot, every claim cited)
- **[docs/oss_landscape_2026q2.md](https://github.com/nrl-ai/nom-vn/blob/main/docs/oss_landscape_2026q2.md)** — OSS local-AI / RAG landscape: patterns to steal, traps to avoid
- **[benchmarks/](https://github.com/nrl-ai/nom-vn/tree/main/benchmarks)** — reproducible measurement scripts (perf + retrieval + accuracy)
- **[CONTRIBUTING.md](https://github.com/nrl-ai/nom-vn/blob/main/CONTRIBUTING.md)** — dev setup, PR rules
- **[CHANGELOG.md](https://github.com/nrl-ai/nom-vn/blob/main/CHANGELOG.md)** — version history

---

## License

Apache 2.0. Fine-tune, redistribute, commercialize freely. Please keep attribution.

## Citation

```bibtex
@software{nom2026,
  title  = {Nôm: an open Python toolkit for Vietnamese AI applications},
  author = {Nguyen, Viet-Anh and {Neural Research Lab}},
  year   = {2026},
  url    = {https://nrl.ai/nom},
  note   = {Apache 2.0}
}
```

## Built by

[Neural Research Lab](https://nrl.ai) — open-source AI tooling. Edge inference, private assistants, training, labeling.
