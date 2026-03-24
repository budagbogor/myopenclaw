# Panduan Pengguna: MyClaw Agent Dashboard

MyClaw adalah agent runtime + dashboard untuk mengelola pekerjaan rutin (inbox, follow-up, web research, draft reply) dengan mekanisme approval dan audit log.

## Menjalankan

1. Install dependency:

   ```bash
   npm install --prefix agent
   ```

2. Jalankan server:

   ```bash
   npm run dev --prefix agent
   ```

3. Buka dashboard:

   - http://localhost:3100/

## Struktur Menu

- Tasks: membuat task dan melihat progres step-by-step.
- Approvals: daftar task yang menunggu persetujuan.
- Inbox: pesan masuk (Telegram/Email) + aksi reply/follow-up.
- Reminders: daftar follow-up yang harus dikerjakan.
- Knowledge: catatan/brief in-memory + pencarian.
- Present: generate outline presentasi dari konteks.
- Guide: panduan workflow (ringkas).
- Logs: audit log tool calls.
- Tools: daftar tools + mode policy aktif.

## Workflow Inti (Paling Umum)

### 1) Buat Task (Manual)

1. Buka tab Tasks.
2. Isi judul dan steps (JSON).
3. Klik Create.

Contoh steps sederhana:

```json
[
  { "tool": "webSearch", "params": { "query": "ringkas berita AI minggu ini", "maxResults": 5 } },
  { "tool": "webFetch", "params": { "url": "https://example.com" } }
]
```

Jika task berisi step yang butuh approval (misalnya mengirim pesan), set `requiresApproval: true`:

```json
[
  { "tool": "sendTelegram", "params": { "chatId": "123", "text": "Halo!" }, "requiresApproval": true }
]
```

### 2) Approve Step Sensitif

Step yang “write” (sendTelegram/sendEmail/runCommand/gitSummary) biasanya berhenti di `waiting_approval`.

1. Buka tab Approvals atau Tasks.
2. Klik Approve.
3. Jika perlu, klik Edit Draft untuk mengubah params sebelum approve.

### 3) Inbox → Reply Task

Inbox menampilkan pesan masuk (in-memory). Untuk membuat workflow balasan:

1. Tab Inbox → klik Reply Task pada pesan.
2. Sistem membuat task balasan (butuh approval).
3. Edit draft jika perlu → Approve.

### 4) Inbox → Follow-up (Reminder)

1. Tab Inbox → klik Follow-up pada pesan.
2. Sistem membuat reminder berdasarkan summary/action items.
3. Tab Reminders → klik Done ketika selesai.

## Workflow Knowledge (Catatan Internal)

1. Tab Knowledge → Add Knowledge → simpan catatan.
2. Tab Knowledge → Search → cari berdasarkan judul/isi.

Catatan: KB saat ini in-memory dan tunduk pada kebijakan retention.

## Workflow Present (Outline Presentasi)

1. Tab Present.
2. Isi judul + contextText (isi ringkas).
3. Klik Generate → hasil outline slide muncul sebagai JSON.

## Konfigurasi (.env)

Buat file `.env` di folder `agent/` (jangan commit token):

```bash
PORT=3100
MYCLAW_MODE=safe

# Telegram
# TELEGRAM_BOT_TOKEN=xxxxx
# TELEGRAM_POLLING=true
# TELEGRAM_ALLOWLIST_CHAT_IDS=123,456

# Email IMAP (read-only)
# EMAIL_POLLING=true
# EMAIL_IMAP_HOST=imap.example.com
# EMAIL_IMAP_USER=user@example.com
# EMAIL_IMAP_PASS=xxxxx

# Email SMTP (sendEmail)
# EMAIL_SMTP_HOST=smtp.example.com
# EMAIL_SMTP_USER=user@example.com
# EMAIL_SMTP_PASS=xxxxx
# EMAIL_SMTP_FROM="MyClaw <user@example.com>"
```

## Troubleshooting

- Port 3100 sudah dipakai:
  - Matikan proses lain yang memakai port 3100, atau set `PORT` ke port lain.
- Web fetch/search gagal:
  - Beberapa environment membatasi koneksi outbound; tool akan mengembalikan error namun task tetap bisa selesai (output berisi `error`).

## Keamanan (Wajib Dibaca)

Untuk mode operasi aman (read-only/allowlist/admin token/export/delete data), lihat [ADMIN_GUIDE.md](file:///i:/projectWebApps2026/TRAE%20IDE%20PROJECT/MYOPENCLAW/myclaw/myclaw/ADMIN_GUIDE.md).

