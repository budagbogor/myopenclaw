# Product Requirements Document (PRD): MyClaw (Agentic AI)

## **1. Vision & Overview**
**MyClaw** adalah agentic AI pribadi untuk membantu pekerjaan rutin (kantoran dan web developer) seperti mengelola pesan (WhatsApp/Telegram/SMS), memproses email, melakukan query database, mencari informasi dari internet, membantu coding, dan membuat materi presentasi. Fokus utama MyClaw adalah **otomasi yang aman**, **auditability**, dan **kontrol pengguna** atas data, akses, dan tindakan agent.

### **Tujuan Utama**
- **Satu pintu untuk pekerjaan rutin**: inbox terpadu, task, dan automasi.
- **Agent yang bisa bertindak**: bukan hanya chat, tetapi bisa menjalankan langkah-langkah kerja via tools.
- **Aman dan bisa diaudit**: semua tindakan tercatat; akses sensitif dapat dibatasi.
- **Modular**: mudah menambah konektor (WhatsApp, Telegram, email, DB, web).

---

## **2. Target Pengguna**
- **Pemilik bisnis/office worker**: menangani komunikasi, follow-up, laporan sederhana.
- **Web developer**: bantu coding, triage bug, query DB, mencari referensi, membuat dokumentasi/presentasi.
- **Admin operasional**: otomasi rutin, pengingat, sinkronisasi data antar sistem.

---

## **3. Problem Statement**
Pekerjaan rutin sehari-hari sering terfragmentasi: pesan tersebar di banyak kanal, email menumpuk, update status harus manual, dan pekerjaan teknis (cek DB, cari informasi, coding) memakan waktu karena context switching. MyClaw menyatukan alur kerja ini dan mengotomasi langkah yang berulang, tanpa mengorbankan kontrol dan keamanan.

---

## **4. Use Cases Prioritas**
- Membaca pesan WhatsApp/Telegram/SMS, merangkum, memberi saran balasan, dan mengirim balasan (dengan persetujuan).
- Membaca email masuk, klasifikasi (urgent/low), membuat draft balasan, membuat tugas follow-up.
- Query database (read-only default), membuat ringkasan hasil, dan menyiapkan laporan.
- Pencarian web: minta info terbaru, kumpulkan sumber, buat ringkasan yang bisa diverifikasi.
- Coding assistant: membuat scaffolding, refactor, menulis test, menjalankan lint/build, membuat PR notes.
- Presentasi: membuat outline slide, poin-poin, dan materi singkat dari dokumen/hasil riset.

---

## **5. Scope**

### **5.1 In-Scope**
- Orkestrasi agent (planner/executor) dengan tool-calling.
- Sistem konektor untuk kanal komunikasi, email, database, dan web.
- UI/UX minimal untuk melihat inbox, task, log, dan approval action.
- Memory agent (short-term + knowledge base) dengan kontrol dan penghapusan data.
- Audit log lengkap untuk setiap tindakan.
- Mode keamanan: read-only, approval required, allowlist domain/DB/table.

### **5.2 Out-of-Scope (untuk MVP)**
- Otomasi tanpa approval untuk aksi berisiko (mengirim pesan massal, delete data DB).
- Integrasi enterprise kompleks (SSO/SCIM) kecuali diminta.
- “Autonomous mode” full tanpa batasan.

---

## **6. Functional Requirements**

### **6.1 Agent Runtime**
- **Task Intake**: menerima tugas via chat UI, webhook, atau schedule.
- **Planning**: memecah tujuan menjadi langkah-langkah (plan) dan memilih tools.
- **Execution**: menjalankan langkah dengan tool-calling, menangani retry dan timeouts.
- **Approval Gate**: langkah tertentu wajib approval sebelum dieksekusi (send message, write DB, publish).
- **State Management**: menyimpan status task (queued/running/waiting approval/done/failed).
- **Observability**: log per-step + output ringkas + error reason.

### **6.2 Inbox & Komunikasi**
- **Unified Inbox**: tampilan percakapan lintas channel, dengan identitas kontak yang dipetakan.
- **Draft Reply**: agent menyarankan balasan; user bisa edit; lalu kirim.
- **Auto-Summarize**: rangkum thread panjang dan highlight action items.
- **Follow-up Reminders**: buat reminder dari pesan/email.

### **6.3 Email**
- Sinkronisasi inbox (IMAP/Graph/Gmail API tergantung pilihan).
- Klasifikasi (urgent/needs reply/info only).
- Draft reply + template.

### **6.4 Database**
- **Read-only default** dengan allowlist koneksi, schema, dan query policy.
- Query builder/runner untuk PostgreSQL/MySQL/SQL Server (bertahap).
- Export ringkas (table preview, agregasi) dan laporan.

### **6.5 Web & Search**
- Web search + fetch konten.
- Ringkasan dengan daftar sumber dan kutipan link.
- Cache hasil pencarian per topik untuk mengurangi biaya.

### **6.6 Coding & Dev Tools**
- Jalankan perintah build/lint/test (dengan allowlist per proyek).
- Generate/review perubahan kode, ringkas diff, dan buat catatan PR.
- Template workflow: “buat endpoint baru”, “refactor modul”, “tambah test”.

### **6.7 Presentasi & Dokumen**
- Buat outline presentasi, ringkas dokumen, hasilkan poin slide.
- Export format teks (Markdown) sebagai sumber untuk tool presentasi.

---

## **7. Non-Functional Requirements**
- **Keamanan**: secret storage yang aman, least-privilege, audit trail.
- **Privasi**: data percakapan dapat dihapus; retention policy configurable.
- **Reliability**: retry policy, idempotency key untuk aksi kirim, dan penanganan rate limit.
- **Latency**: respons interaktif untuk chat; pekerjaan berat berjalan async.
- **Auditability**: setiap tool call memiliki input/output yang tersimpan dan bisa ditelusuri.
- **Configurability**: enable/disable konektor; kebijakan approval per tool.

---

## **8. Architecture (High-Level)**
- **UI**: Web dashboard (inbox, tasks, approvals, logs).
- **Agent Orchestrator**: planner + executor + policy enforcement.
- **Tool Registry**: daftar tools (send message, query db, web search, run build).
- **Connectors**: integrasi WhatsApp/Telegram/SMS/Email/DB/Web.
- **Storage**: task state + audit log + user settings + optional knowledge base.
- **Scheduler**: cron-like jobs untuk cek inbox dan otomatisasi rutin.

---

## **9. Technical Stack (Recommended)**
Catatan: pilihan stack final menyesuaikan kebutuhan deployment dan konektor.
- **Backend**: TypeScript (Node.js) atau Python.
- **UI**: Web dashboard (React/Vue/Svelte).
- **Storage**: PostgreSQL (state + log) + optional vector store (knowledge base).
- **Queue**: Redis queue atau message broker untuk job async.
- **Integrations**: API resmi (Telegram Bot API, Gmail/Graph), webhook-based connectors.
- **Security**: encrypted secrets store + role-based permissions.

---

## **10. Roadmap & Phases**

### **Phase 1: Foundation (MVP)**
- Definisikan agent runtime (task state, tool-calling, approval gate, audit log).
- Buat UI minimal untuk task, approvals, dan log.
- Implementasi konfigurasi, secret management, dan policy (read-only/allowlist).

### **Phase 2: Messaging & Email Connectors**
- Telegram connector (paling cepat untuk MVP).
- Email connector (IMAP atau provider API).
- Unified inbox + draft reply + send with approval.

### **Phase 3: Web & Knowledge Workflows**
- Web search + fetch + summarization dengan sumber.
- Template workflow: ringkas thread/email menjadi action items + follow-up tasks.

### **Phase 4: Developer Productivity**
- Tools untuk menjalankan lint/test/build dengan allowlist.
- Workflow coding: generate perubahan + ringkasan diff + catatan PR.
- Integrasi repo (opsional): issue tracker atau CI.

### **Phase 5: Hardening & Expansion**
- Observability lebih lengkap, rate limiting, dan idempotency.
- Tambah konektor: WhatsApp, SMS, DB write (dengan approval dan sandbox).
- Deployment yang rapi (Docker), backup, dan retention policy.
