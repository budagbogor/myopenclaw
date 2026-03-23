import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().optional(),
  MYCLAW_MODE: z.string().optional(),
  MYCLAW_ALLOWED_TOOLS: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(10).optional(),
  TELEGRAM_POLLING: z
    .string()
    .optional()
    .transform((v) => v === '1' || v?.toLowerCase() === 'true'),
  TELEGRAM_POLL_INTERVAL_MS: z.coerce.number().optional(),
  TELEGRAM_ALLOWLIST_CHAT_IDS: z.string().optional(),
  EMAIL_IMAP_HOST: z.string().optional(),
  EMAIL_IMAP_PORT: z.coerce.number().optional(),
  EMAIL_IMAP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === '1' || v?.toLowerCase() === 'true'),
  EMAIL_IMAP_USER: z.string().optional(),
  EMAIL_IMAP_PASS: z.string().optional(),
  EMAIL_IMAP_MAILBOX: z.string().optional(),
  EMAIL_POLLING: z
    .string()
    .optional()
    .transform((v) => v === '1' || v?.toLowerCase() === 'true'),
  EMAIL_POLL_INTERVAL_MS: z.coerce.number().optional(),
  EMAIL_SMTP_HOST: z.string().optional(),
  EMAIL_SMTP_PORT: z.coerce.number().optional(),
  EMAIL_SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === '1' || v?.toLowerCase() === 'true'),
  EMAIL_SMTP_USER: z.string().optional(),
  EMAIL_SMTP_PASS: z.string().optional(),
  EMAIL_SMTP_FROM: z.string().optional(),
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
  mode: (env.MYCLAW_MODE ?? 'safe') as 'safe' | 'read_only',
  allowedTools: parseAllowlist(env.MYCLAW_ALLOWED_TOOLS),
  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
    pollingEnabled: env.TELEGRAM_POLLING ?? false,
    pollIntervalMs: env.TELEGRAM_POLL_INTERVAL_MS ?? 2000,
    allowlistChatIds: parseAllowlist(env.TELEGRAM_ALLOWLIST_CHAT_IDS),
  },
  email: {
    imap: {
      host: env.EMAIL_IMAP_HOST,
      port: env.EMAIL_IMAP_PORT ?? 993,
      secure: env.EMAIL_IMAP_SECURE ?? true,
      user: env.EMAIL_IMAP_USER,
      pass: env.EMAIL_IMAP_PASS,
      mailbox: env.EMAIL_IMAP_MAILBOX ?? 'INBOX',
    },
    pollingEnabled: env.EMAIL_POLLING ?? false,
    pollIntervalMs: env.EMAIL_POLL_INTERVAL_MS ?? 5000,
    smtp: {
      host: env.EMAIL_SMTP_HOST,
      port: env.EMAIL_SMTP_PORT ?? 587,
      secure: env.EMAIL_SMTP_SECURE ?? false,
      user: env.EMAIL_SMTP_USER,
      pass: env.EMAIL_SMTP_PASS,
      from: env.EMAIL_SMTP_FROM,
    },
  },
};
