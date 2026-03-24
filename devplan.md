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
| 2026-03-24 | Email Connector (MVP+) | Integrasi IMAP read-only (polling) + status endpoint | Selesai |

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
- [x] Menambahkan ringkasan + action items pada inbox message (heuristik).
- [x] Menambahkan endpoint ringkasan thread: `/inbox/threads`.
- [x] Menambahkan endpoint status Telegram: `/connectors/telegram/status`.
- [x] Menambahkan UI minimal (static web) untuk tasks/approvals/inbox/logs/tools.
- [x] Menambahkan email connector IMAP (read-only) untuk mengambil email ke inbox (in-memory).
- [x] Menambahkan endpoint status email: `/connectors/email/status`.
- [x] Menambahkan klasifikasi email (labels + needs_reply) saat ingest IMAP.
- [x] Menambahkan workflow reply-task dari inbox message: `/inbox/messages/:id/reply-task`.
- [x] Menambahkan SMTP sender tool (approval required): `sendEmail` + status endpoint `/connectors/email/smtp/status`.
- [x] Upgrade dependency mail sender untuk menutup vulnerability (nodemailer v8).
- [x] Menambahkan edit draft sebelum approval (PATCH step current) + UI prompt edit untuk step send.
- [x] Menambahkan reminders + follow-up: endpoint `/reminders` dan tombol follow-up dari inbox.
- [x] Menambahkan policy mode `MYCLAW_MODE` (safe/read_only) dan allowlist `MYCLAW_ALLOWED_TOOLS`.
- [x] Menambahkan redaction untuk audit log (mask token/secret) + retention data (`MYCLAW_RETENTION_DAYS`) + prune scheduler.
- [x] Menambahkan export/delete data (admin token): `/data/export`, `/data/wipe`, `/data/prune`.
- [x] Mengganti `webSearch` menjadi real search (DuckDuckGo HTML) dan menambahkan `webFetch` dengan sumber.
- [x] Menambahkan tool `runCommand` (approval required) dengan allowlist command + cwd.
- [x] Menambahkan knowledge base minimal: `/kb/docs` (POST/GET) dan `/kb/search`.
- [x] Menambahkan output presentasi: `/presentations/outline` + UI tab Knowledge/Present.
- [x] Menambahkan rate limiting sederhana untuk endpoint write + request id header (`x-request-id`).
- [x] Menambahkan idempotency untuk eksekusi step (hindari eksekusi ganda saat retry/duplikasi request) + retry sederhana untuk web fetch/search.
- [x] Menambahkan tool `gitSummary` (approval + allowlist) untuk ringkas status/diff workspace.
- [x] Menambahkan manajemen AI model terpusat (Smart Switch): OpenRouter/SumoPod/Bytez + UI tab AI Models.
- [x] Menambahkan input API key AI via UI (temporary, admin token) + status + test connection per provider.
- [x] Perbaikan UI/UX: toast, modal, global search, tab Knowledge/Present/Guide, tabel lebih rapi dan responsif.
- [x] Menambahkan Quick Workflows (klik → isi form → jalan) untuk use case umum (web/telegram/email/git/command).
- [x] Menambahkan Goal Planner (Goal → generate plan → create task) + integrasi dari Inbox (Goal dari pesan).

### **Next Steps:**
1. Menuntaskan “AI core”: gunakan model terpilih untuk planning & summarization (fallback heuristik jika API gagal).
2. Unified inbox v1: contact mapping lintas channel (telegram/email) + thread view per contact.
3. Database connector v1 (Postgres read-only): allowlist schema/table + UI query runner + preview.
4. Idempotency key untuk aksi kirim (sendTelegram/sendEmail) agar aman terhadap retry/double-approve.
5. Web cache per topik + TTL untuk mengurangi biaya dan mempercepat ringkasan.
6. Storage persisten (Postgres) untuk tasks/logs/inbox/reminders/knowledge + migrasi dari in-memory.
7. WhatsApp connector (WAHA/SumoPod) untuk ingest + send (approval) setelah policy & anti-spam siap.
8. Hardening: queue untuk async jobs + scheduler polling yang lebih rapi + observability (metrics).
