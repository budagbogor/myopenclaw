import { Tool } from '../types.js';
import { telegramSendMessage } from '../connectors/telegram.js';
import { emailSendSmtp } from '../connectors/email_smtp.js';
import { webFetch, webSearchDuckDuckGo } from '../connectors/web.js';
import { summarizeText } from '../summarize.js';
import { runAllowedCommand } from '../connectors/command.js';
import { makePresentationOutline } from '../presentation.js';
import { gitSummary } from '../connectors/git.js';

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const Tools: Record<string, Tool> = {
  webSearch: {
    name: 'webSearch',
    description: 'Cari informasi dari web (DuckDuckGo HTML).',
    effect: 'read',
    run: async (params) => {
      const q = String(params.query ?? '');
      const maxResults = Number(params.maxResults ?? 5);
      try {
        const results = await webSearchDuckDuckGo(q, Number.isFinite(maxResults) ? maxResults : 5);
        const combined = results
          .map((r) => [r.title, r.snippet].filter(Boolean).join(' - '))
          .filter(Boolean)
          .join('\n');
        return {
          query: q,
          results,
          sources: results.map((r) => r.url),
          summary: summarizeText(combined, 260),
        };
      } catch (e: any) {
        await wait(100);
        return { query: q, results: [], sources: [], summary: `Gagal webSearch untuk "${q}": ${String(e?.message ?? e)}` };
      }
    },
  },
  webFetch: {
    name: 'webFetch',
    description: 'Ambil konten dari URL dan ekstrak teks ringkas.',
    effect: 'read',
    run: async (params) => {
      const url = String(params.url ?? '');
      if (!url) throw new Error('Missing url');
      try {
        const result = await webFetch(url, Number(params.timeoutMs ?? 12000));
        return {
          ...result,
          summary: summarizeText(result.text, 300),
          sources: [result.url],
        };
      } catch (e: any) {
        return {
          url,
          error: String(e?.message ?? e),
          sources: [url],
        };
      }
    },
  },
  emailDraft: {
    name: 'emailDraft',
    description: 'Buat draft balasan email dari konteks percakapan.',
    effect: 'read',
    run: async (params) => {
      await wait(150);
      const to = String(params.to ?? 'unknown@example.com');
      const subject = String(params.subject ?? 'No Subject');
      const body = `Halo, berikut draft balasan terkait "${subject}". Salam.`;
      return { to, subject, draft: body };
    },
  },
  makePresentationOutline: {
    name: 'makePresentationOutline',
    description: 'Buat outline presentasi dari konteks teks.',
    effect: 'read',
    run: async (params) => {
      const title = String(params.title ?? '');
      const contextText = params.contextText ? String(params.contextText) : undefined;
      const sources = Array.isArray(params.sources) ? params.sources.map((s) => String(s)) : undefined;
      if (!title) throw new Error('Missing title');
      return makePresentationOutline({ title, contextText, sources });
    },
  },
  sendTelegram: {
    name: 'sendTelegram',
    description: 'Kirim pesan Telegram (butuh approval).',
    effect: 'write',
    approvalRequired: () => true,
    run: async (params) => {
      const chatId = String(params.chatId ?? 'unknown');
      const text = String(params.text ?? '');
      const result = await telegramSendMessage(chatId, text);
      return { chatId, sent: true, text, result };
    },
  },
  sendEmail: {
    name: 'sendEmail',
    description: 'Kirim email via SMTP (butuh approval).',
    effect: 'write',
    approvalRequired: () => true,
    run: async (params) => {
      const to = String(params.to ?? '');
      const subject = String(params.subject ?? '');
      const text = String(params.text ?? '');
      if (!to) throw new Error('Missing to');
      if (!subject) throw new Error('Missing subject');
      const result = await emailSendSmtp(to, subject, text);
      return { to, subject, sent: true, result };
    },
  },
  runCommand: {
    name: 'runCommand',
    description: 'Jalankan command lokal (butuh approval + allowlist).',
    effect: 'write',
    approvalRequired: () => true,
    run: async (params) => {
      const command = String(params.command ?? '');
      const cwd = params.cwd ? String(params.cwd) : undefined;
      const timeoutMs = Number(params.timeoutMs ?? 20000);
      if (!command) throw new Error('Missing command');
      return runAllowedCommand(command, cwd, Number.isFinite(timeoutMs) ? timeoutMs : 20000);
    },
  },
  gitSummary: {
    name: 'gitSummary',
    description: 'Ringkas status + diff git untuk workspace (butuh approval + allowlist).',
    effect: 'write',
    approvalRequired: () => true,
    run: async (params) => {
      const cwd = String(params.cwd ?? '');
      const includePatch = Boolean(params.includePatch ?? false);
      if (!cwd) throw new Error('Missing cwd');
      return gitSummary(cwd, includePatch);
    },
  },
};
