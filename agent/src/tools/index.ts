import { Tool } from '../types.js';
import { telegramSendMessage } from '../connectors/telegram.js';

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const Tools: Record<string, Tool> = {
  webSearch: {
    name: 'webSearch',
    description: 'Cari informasi dari web (mock).',
    run: async (params) => {
      await wait(200);
      const q = String(params.query ?? '');
      return { query: q, summary: `Ringkasan hasil pencarian untuk "${q}" (mock).` };
    },
  },
  emailDraft: {
    name: 'emailDraft',
    description: 'Buat draft balasan email dari konteks percakapan.',
    run: async (params) => {
      await wait(150);
      const to = String(params.to ?? 'unknown@example.com');
      const subject = String(params.subject ?? 'No Subject');
      const body = `Halo, berikut draft balasan terkait "${subject}". Salam.`;
      return { to, subject, draft: body };
    },
  },
  sendTelegram: {
    name: 'sendTelegram',
    description: 'Kirim pesan Telegram (butuh approval).',
    approvalRequired: () => true,
    run: async (params) => {
      const chatId = String(params.chatId ?? 'unknown');
      const text = String(params.text ?? '');
      const result = await telegramSendMessage(chatId, text);
      return { chatId, sent: true, text, result };
    },
  },
};
