# Roadmap: MyClaw (Agentic AI) — PRD Alignment

Dokumen ini memetakan kondisi implementasi saat ini terhadap PRD.md, dan mendefinisikan langkah lanjutan agar “misi” MyClaw tercapai: agentic AI yang aman, bisa diaudit, modular, dan mudah dipakai orang awam.

## Ringkasan Status (Sekarang)

### Sudah Ada (sesuai PRD Phase 1–5, sebagian)
- Agent runtime: tasks, step execution, approval gate, audit log, retry terbatas, idempotency eksekusi step.
- UI dashboard: Tasks, Approvals, Inbox, Reminders, Knowledge, Present, AI Models, Guide, Logs, Tools.
- Konektor:
  - Telegram: send + polling inbox.
  - Email: IMAP read-only + SMTP sender (approval).
- Workflow:
  - Reply task dari inbox message.
  - Follow-up reminders dari inbox.
  - Web research: search + fetch.
  - Developer: runCommand (allowlist) + gitSummary (allowlist).
- Policy & keamanan:
  - read_only mode + allowlist tools.
  - allowlist commands/cwds untuk runCommand/gitSummary.
  - retention policy + redaction audit log.
  - export/wipe/prune data (admin token).
- UX pemula:
  - Quick Workflows (klik → isi form → jalan).
  - Goal Planner (Goal → generate plan → create task).
- AI model management:
  - Smart Switch (auto/openrouter/sumopod/bytez) + test connection + input API keys (temporary, admin).

### Gap Utama (PRD yang belum terpenuhi)
- AI sebagai “bahan bakar” untuk planner/summarization/coding masih minimal (planner masih heuristik).
- Unified Inbox level “contact mapping” lintas channel belum ada.
- Database connector (read-only default) belum ada.
- Web cache per topik belum ada.
- Idempotency untuk aksi kirim (sendTelegram/sendEmail) belum berbasis idempotency key.
- Persistent storage (Postgres) + queue/scheduler yang lebih rapi belum ada (saat ini in-memory + interval).
- WhatsApp connector (WAHA/SumoPod) belum diimplementasikan.

## Target Misi (Definition of Done versi PRD)

MyClaw dianggap mencapai misi MVP+ jika:
- Pengguna awam bisa menjalankan 80% workflow lewat klik/form (Goal Planner + Quick Workflows) tanpa menulis JSON.
- Semua aksi write punya approval + idempotency dan tercatat di audit log.
- Ada 3 kanal MVP berfungsi end-to-end: Telegram + Email + Web research (dengan sumber).
- Ada minimal 1 developer workflow end-to-end: lint/build + ringkas diff + PR notes.
- Ada kebijakan data: retention + export + wipe yang bisa dipakai.

## Rencana Implementasi Lanjutan (Berurutan)

### 1) AI Core (mendorong planner/summarization)
- Chat/completions client yang konsisten (OpenRouter/Bytez/SumoPod).
- Planner AI: goal → JSON plan (divalidasi schema) + fallback heuristik.
- Summarization AI: thread/email → ringkasan + action items + draft reply (tetap editable).

### 2) Inbox “Unified” yang lebih nyata
- Contact map: normalisasi identity (nama/nomor/email/chatId) ke “contact id”.
- Thread view: gabungkan lintas channel per contact (opsional, berbasis mapping).

### 3) Database (read-only default)
- Connector PostgreSQL read-only (MVP).
- Query policy: allowlist DB/schema/table + block write keywords.
- UI form: pilih koneksi + query template + preview hasil.

### 4) Web cache + citation quality
- Cache search/fetch per topik + TTL.
- Ringkasan dengan daftar sumber yang konsisten.

### 5) Hardening produksi
- Idempotency key untuk sendTelegram/sendEmail.
- Persistent storage (Postgres) untuk task/log/inbox/reminders/knowledge.
- Queue untuk task execution, cron polling connector, dan retry scheduling.

### 6) WhatsApp (WAHA / SumoPod)
- Connector ingest + send (approval).
- Allowlist contact/chat + anti-spam guardrails.

