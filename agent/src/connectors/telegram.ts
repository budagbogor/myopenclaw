import { v4 as uuidv4 } from 'uuid';
import { Storage } from '../storage/memory.js';
import { Config } from '../config.js';
import { extractActionItems, summarizeText } from '../summarize.js';
import type { InboxMessage } from '../types.js';

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    chat: { id: number; type: string; title?: string; username?: string; first_name?: string; last_name?: string };
    from?: { id: number; is_bot: boolean; first_name?: string; last_name?: string; username?: string };
    text?: string;
  };
};

type TelegramApiResponse<T> = { ok: boolean; result: T; description?: string };

function isChatAllowed(chatId: string): boolean {
  const allowlist = Config.telegram.allowlistChatIds;
  if (!allowlist) return true;
  return allowlist.has(chatId);
}

async function telegramApiCall<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const token = Config.telegram.botToken;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN belum di-set');
  }

  const url = `https://api.telegram.org/bot${token}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as TelegramApiResponse<T>;
  if (!data.ok) {
    throw new Error(data.description ?? `Telegram API error (${method})`);
  }
  return data.result;
}

export async function telegramSendMessage(chatId: string, text: string): Promise<unknown> {
  if (!isChatAllowed(chatId)) {
    throw new Error('ChatId tidak di-allowlist');
  }
  return telegramApiCall('sendMessage', { chat_id: chatId, text });
}

let pollingStarted = false;

export function startTelegramPolling(): void {
  if (pollingStarted) return;
  pollingStarted = true;

  if (!Config.telegram.botToken) {
    return;
  }
  if (!Config.telegram.pollingEnabled) {
    return;
  }

  let offset = 0;
  let inFlight = false;

  const tick = async () => {
    if (inFlight) return;
    inFlight = true;

    try {
      const updates = await telegramApiCall<TelegramUpdate[]>('getUpdates', {
        offset,
        timeout: 0,
        allowed_updates: ['message'],
      });

      for (const u of updates) {
        offset = Math.max(offset, u.update_id + 1);
        if (!u.message) continue;

        const chatId = String(u.message.chat.id);
        if (!isChatAllowed(chatId)) continue;

        const from = u.message.from;
        const fromName = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || from?.username || undefined;

        const msg: InboxMessage = {
          id: uuidv4(),
          channel: 'telegram',
          time: new Date(u.message.date * 1000).toISOString(),
          chatId,
          fromId: from ? String(from.id) : undefined,
          fromName,
          text: u.message.text,
          summary: summarizeText(u.message.text),
          actionItems: extractActionItems(u.message.text),
          raw: u,
        };
        Storage.addInboxMessage(msg);
      }
    } catch {
    } finally {
      inFlight = false;
    }
  };

  void tick();
  setInterval(() => void tick(), Config.telegram.pollIntervalMs);
}

export async function telegramGetMe(): Promise<unknown> {
  return telegramApiCall('getMe', {});
}
