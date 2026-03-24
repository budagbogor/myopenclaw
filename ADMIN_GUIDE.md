# Panduan Admin: Policy, Retention, dan Operasional

Dokumen ini membahas mode aman, allowlist, retention data, serta endpoint admin untuk export/wipe data.

## Mode Policy

### MYCLAW_MODE

- `safe` (default): tool berjalan normal, tetapi tool write tetap butuh approval.
- `read_only`: semua tool write diblok total, walaupun di-approve.

Tool write saat ini:
- sendTelegram
- sendEmail
- runCommand
- gitSummary

### MYCLAW_ALLOWED_TOOLS (allowlist tools)

Jika di-set, hanya tool yang ada di daftar ini yang boleh dieksekusi.

Contoh:

```bash
MYCLAW_ALLOWED_TOOLS=webSearch,webFetch,emailDraft
```

## Allowlist Command (runCommand/gitSummary)

Tool `runCommand` dan `gitSummary` membutuhkan:

- Approval user (runtime)
- Allowlist command (exact match)
- Allowlist CWD (prefix match)

### MYCLAW_ALLOWED_COMMANDS

Format: CSV, harus sama persis dengan string command yang dieksekusi.

Contoh:

```bash
MYCLAW_ALLOWED_COMMANDS=git status -sb,git diff --stat,git diff -U3,npm run build --prefix agent
```

### MYCLAW_ALLOWED_CWDS

Format: CSV prefix path yang diizinkan.

Contoh (Windows):

```bash
MYCLAW_ALLOWED_CWDS=i:\\projectWebApps2026\\TRAE IDE PROJECT\\MYOPENCLAW
```

## Kebijakan Retention & Redaction

### MYCLAW_RETENTION_DAYS

- Default: 14 hari
- Data yang dipruning: tasks, logs, inbox messages, reminders, knowledge docs (in-memory).
- Prune dilakukan saat startup dan periodik tiap 1 jam.

Contoh:

```bash
MYCLAW_RETENTION_DAYS=7
```

### Redaction Audit Log

Audit log akan dimask untuk key sensitif seperti:
- token, secret, password, authorization, api_key

Catatan: ini redaction defensif; tetap jangan mengirim secret melalui step params jika tidak perlu.

## Endpoint Admin (Export/Wipe/Prune)

### MYCLAW_ADMIN_TOKEN

Set token admin di `.env`:

```bash
MYCLAW_ADMIN_TOKEN=change-me
```

Gunakan header:

```
x-myclaw-admin-token: change-me
```

### GET /data/export

Export snapshot data in-memory (sudah di-redact).

### POST /data/prune

Paksa prune sesuai retention policy.

### POST /data/wipe

Hapus semua data in-memory (tasks/logs/inbox/reminders/knowledge).

## Rekomendasi Operasional

- Jalankan default di `read_only` untuk environment observasi; naikkan ke `safe` hanya bila butuh aksi write.
- Aktifkan allowlist tools + allowlist commands sejak awal jika ada `runCommand/gitSummary`.
- Simpan `.env` di lokal/server, jangan commit.

