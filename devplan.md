# Development Plan & Progress Tracking

Dokumen ini mencatat setiap langkah pengembangan yang dilakukan pada MyClaw secara kronologis.

## **Status Proyek: Pivot ke Agentic AI**

| Tanggal | Aktivitas | Detail | Status |
| :--- | :--- | :--- | :--- |
| 2026-03-22 | Riset & Perencanaan | Riset OpenClaw & Pembuatan PRD | Selesai |
| 2026-03-22 | Persiapan Dokumen | Pembuatan `devlog.md` dan `devplan.md` | Selesai |
| 2026-03-22 | Inisialisasi Git | Push proyek ke GitHub (`myopenclaw.git`) | Selesai |
| 2026-03-22 | Fase 1 (MVP) | Struktur proyek + CMake + SDL2 window/loop + render sprite statis | Selesai |
| 2026-03-23 | Pivot Produk | Ubah arah: dari game engine menjadi agentic AI untuk pekerjaan rutin | Selesai |
| 2026-03-23 | Revisi Dokumen | Update PRD + fase pengembangan sesuai agentic AI | Selesai |
| 2026-03-24 | Telegram Connector (MVP+) | Integrasi Telegram (send + polling) + inbox API minimal | Selesai |

---

## **Catatan Pengembangan (Logs)**

### **2026-03-22**
- [x] Melakukan riset tentang arsitektur OpenClaw (C++, SDL2, CMake).
- [x] Menyusun Product Requirements Document (PRD).
- [x] Menetapkan fase pengembangan dalam `devlog.md`.
- [x] Menyiapkan `devplan.md` untuk pelacakan progres harian.
- [x] Inisialisasi Git dan Push ke GitHub.
- [x] Menambahkan `CMakeLists.txt` untuk build C++20 dan integrasi SDL2.
- [x] Menambahkan `src/main.cpp` untuk membuat window SDL2 + game loop dasar.
- [x] Menambahkan struktur folder `src/`, `include/`, `assets/`.
- [x] Menampilkan sprite statis (placeholder) pada layar sebagai validasi rendering.

### **2026-03-23**
- [x] Menetapkan ulang tujuan proyek: MyClaw menjadi agentic AI untuk pekerjaan rutin.
- [x] Menyesuaikan PRD agar fokus pada agent runtime, connectors, policy, dan audit.
- [x] Menyesuaikan fase pengembangan (devlog) agar sesuai dengan roadmap agentic AI.
- [x] Menambahkan proyek backend `agent/` (Node.js + TypeScript).
- [x] Implementasi runtime: task state, approval gate, audit log (in-memory).
- [x] Endpoint API: `/health`, `/tools`, `/tasks` (POST/GET), `/tasks/:id` (GET), `/approvals/:id` (POST), `/logs` (GET).
- [x] Verifikasi runtime: membuat task demo (webSearch -> sendTelegram[approval]) dan menyelesaikan dengan endpoint approval.

### **2026-03-24**
- [x] Menambahkan konfigurasi runtime via env (`dotenv`) dan schema config.
- [x] Mengubah tool `sendTelegram` menjadi integrasi Telegram Bot API (butuh approval).
- [x] Menambahkan polling Telegram untuk menerima pesan dan menyimpannya ke inbox (in-memory).
- [x] Menambahkan endpoint inbox minimal: `/inbox/messages`.
- [x] Menambahkan endpoint status Telegram: `/connectors/telegram/status`.
- [x] Menambahkan UI minimal (static web) untuk tasks/approvals/inbox/logs/tools.

### **Next Steps:**
1. Menetapkan kanal prioritas untuk MVP (disarankan: Telegram + Email).
2. Mengaktifkan bot Telegram real: set `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_POLLING=true`.
3. Menambahkan allowlist chatId (opsional) untuk keamanan: `TELEGRAM_ALLOWLIST_CHAT_IDS`.
4. Memulai email connector (IMAP/provider API) untuk workflow inbox.
5. Menambahkan klasifikasi email dan draft reply workflow.
