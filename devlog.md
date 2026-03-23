# Development Log: MyClaw (Agentic AI)

Dokumen ini merinci fase-fase pengembangan MyClaw sebagai agentic AI untuk membantu pekerjaan rutin (komunikasi, email, database, web, coding, presentasi).

## **Fase 0: Pivot & Re-Alignment**
**Tujuan:** Menetapkan ulang arah produk dari prototipe game engine menjadi agentic AI yang aman dan bisa diaudit.
- [ ] Finalisasi scope MVP (channel prioritas, batasan aksi, approval).
- [ ] Menetapkan kebijakan data (retention, redaction, export/delete).
- [x] Menetapkan kebijakan keamanan (allowlist tools, read-only default).

## **Fase 1: Foundation (MVP)**
**Tujuan:** Membangun fondasi agent runtime, policy, dan audit sehingga agent bisa bekerja dengan aman.
- [x] Agent runtime: task state (queued/running/waiting approval/done/failed).
- [x] Tool registry: definisi tool + parameter + policy.
- [x] Approval gate: langkah sensitif wajib persetujuan.
- [x] Audit log: catat setiap tool call (input/output/error) dan metadata.
- [x] Konfigurasi & secret management (tanpa hardcode credential).
- [x] UI minimal: daftar task, detail step, halaman approval.

## **Fase 2: Inbox & Messaging (MVP+)**
**Tujuan:** Agent bisa membantu mengelola komunikasi harian dengan draft reply dan pengiriman terkontrol.
- [x] Telegram connector (prioritas cepat untuk MVP).
- [x] Unified inbox view (minimal untuk 1 channel dulu).
- [x] Membuat reply task dari inbox message (dengan approval).
- [x] Draft reply + edit + send (dengan approval).
- [x] Ringkasan percakapan + action items.

## **Fase 3: Email & Workflow Automation**
**Tujuan:** Mengurangi beban inbox dan follow-up melalui otomasi yang dapat ditelusuri.
- [x] Email connector (IMAP atau provider API).
- [x] Klasifikasi email (urgent/needs reply/info only).
- [x] Draft reply + template.
- [x] Reminder/follow-up tasks dari email/pesan.

## **Fase 4: Web Research, Knowledge, & Office Work**
**Tujuan:** Agent dapat mencari info, merangkum dengan sumber, dan menghasilkan materi kerja.
- [ ] Web search + fetch + ringkasan dengan daftar sumber.
- [ ] Knowledge base opsional (ingest dokumen + pencarian).
- [ ] Output untuk presentasi: outline slide dan poin-poin.

## **Fase 5: Developer Productivity & Hardening**
**Tujuan:** Tools developer dan ketahanan sistem untuk penggunaan harian.
- [ ] Tool “run commands” dengan allowlist per proyek (lint/test/build).
- [ ] Workflow coding: generate perubahan + ringkas diff + catatan PR.
- [ ] Rate limiting, retry policy, dan idempotency untuk aksi kirim.
- [ ] Monitoring/observability yang lebih lengkap.
