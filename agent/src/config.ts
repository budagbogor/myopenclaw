import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(10).optional(),
  TELEGRAM_POLLING: z
    .string()
    .optional()
    .transform((v) => v === '1' || v?.toLowerCase() === 'true'),
  TELEGRAM_POLL_INTERVAL_MS: z.coerce.number().optional(),
  TELEGRAM_ALLOWLIST_CHAT_IDS: z.string().optional(),
});

const env = EnvSchema.parse(process.env);

function parseAllowlist(csv?: string): Set<string> | undefined {
  if (!csv) return;
  const ids = csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return;
  return new Set(ids);
}

export const Config = {
  port: env.PORT ?? 3100,
  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
    pollingEnabled: env.TELEGRAM_POLLING ?? false,
    pollIntervalMs: env.TELEGRAM_POLL_INTERVAL_MS ?? 2000,
    allowlistChatIds: parseAllowlist(env.TELEGRAM_ALLOWLIST_CHAT_IDS),
  },
};

