import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import { Config } from '../config.js';
import { Storage } from '../storage/memory.js';
import { extractActionItems, summarizeText } from '../summarize.js';
import type { InboxMessage } from '../types.js';

function classifyEmail(subject?: string, text?: string): { labels: string[]; needsReply: boolean } {
  const s = (subject ?? '').toLowerCase();
  const t = (text ?? '').toLowerCase();

  const labels: string[] = [];
  const urgentWords = ['urgent', 'asap', 'segera', 'penting', 'priority', 'secepatnya'];
  const needsReplyWords = ['tolong', 'mohon', 'minta', 'please', 'bisa', 'dapatkah', '?'];

  if (urgentWords.some((w) => s.includes(w) || t.includes(w))) labels.push('urgent');
  if (s.includes('invoice') || t.includes('invoice')) labels.push('billing');
  if (s.includes('meeting') || t.includes('meeting') || s.includes('jadwal')) labels.push('meeting');

  const needsReply = needsReplyWords.some((w) => s.includes(w) || t.includes(w));
  if (needsReply) labels.push('needs_reply');
  if (labels.length === 0) labels.push('info');

  return { labels, needsReply };
}

function isConfigured(): boolean {
  const c = Config.email.imap;
  return !!(c.host && c.user && c.pass);
}

let pollingStarted = false;

export function startEmailPolling(): void {
  if (pollingStarted) return;
  pollingStarted = true;

  if (!Config.email.pollingEnabled) return;
  if (!isConfigured()) return;

  let inFlight = false;
  let lastUid: number | undefined;

  const tick = async () => {
    if (inFlight) return;
    inFlight = true;

    const c = Config.email.imap;
    const client = new ImapFlow({
      host: c.host!,
      port: c.port,
      secure: c.secure,
      auth: { user: c.user!, pass: c.pass! },
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock(c.mailbox);
      try {
        const start = lastUid ? lastUid + 1 : 1;
        const range = `${start}:*`;
        for await (const msg of client.fetch(range, { uid: true, envelope: true, source: true }, { uid: true })) {
          lastUid = Math.max(lastUid ?? 0, Number(msg.uid));

          const parsed = await simpleParser(msg.source);
          const fromAddr = parsed.from?.value?.[0]?.address || msg.envelope?.from?.[0]?.address || undefined;
          const from = parsed.from?.text || fromAddr || undefined;
          const subject = parsed.subject || msg.envelope?.subject || undefined;
          const text = (parsed.text ?? parsed.html ?? '').toString().slice(0, 4000) || undefined;
          const classification = classifyEmail(subject, text);

          const entry: InboxMessage = {
            id: uuidv4(),
            channel: 'email',
            time: new Date().toISOString(),
            chatId: c.mailbox,
            fromId: fromAddr,
            fromName: from,
            text,
            subject,
            labels: classification.labels,
            needsReply: classification.needsReply,
            summary: summarizeText([subject, text].filter(Boolean).join(' - ')),
            actionItems: extractActionItems(text),
            raw: {
              uid: msg.uid,
              envelope: msg.envelope,
              messageId: parsed.messageId,
            },
          };
          Storage.addInboxMessage(entry);
        }
      } finally {
        lock.release();
      }
    } catch {
    } finally {
      try {
        await client.logout();
      } catch {
      }
      inFlight = false;
    }
  };

  void tick();
  setInterval(() => void tick(), Config.email.pollIntervalMs);
}

export async function emailImapStatus(): Promise<{ enabled: boolean; reason?: string; mailbox?: string }> {
  if (!Config.email.pollingEnabled) return { enabled: false, reason: 'EMAIL_POLLING belum diaktifkan' };
  if (!isConfigured()) return { enabled: false, reason: 'Konfigurasi IMAP belum lengkap (EMAIL_IMAP_HOST/USER/PASS)' };
  return { enabled: true, mailbox: Config.email.imap.mailbox };
}
