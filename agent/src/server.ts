import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';
import { Tools } from './tools/index.js';
import { Storage } from './storage/memory.js';
import { enqueueTask, approveAndContinue } from './agent.js';
import { Config } from './config.js';
import { startTelegramPolling, telegramGetMe } from './connectors/telegram.js';
import { emailImapStatus, startEmailPolling } from './connectors/email_imap.js';
import { emailSmtpStatus } from './connectors/email_smtp.js';
import { extractActionItems, summarizeText } from './summarize.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (_req, res) => {
  res.json({ ok: true, version: '0.1.0' });
});

app.get('/tools', (_req, res) => {
  const tools = Object.values(Tools).map((t) => ({
    name: t.name,
    description: t.description,
    requiresApproval: !!t.approvalRequired,
  }));
  res.json({ tools });
});

const TaskSchema = z.object({
  title: z.string().min(3),
  steps: z.array(
    z.object({
      tool: z.string(),
      params: z.record(z.any()).default({}),
      requiresApproval: z.boolean().optional(),
    })
  ).min(1),
});

app.post('/tasks', async (req, res) => {
  const parsed = TaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const task = await enqueueTask(parsed.data.title, parsed.data.steps);
  res.status(201).json(task);
});

app.get('/tasks', (_req, res) => {
  res.json({ tasks: Storage.listTasks() });
});

app.get('/tasks/:id', (req, res) => {
  const task = Storage.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.post('/approvals/:id', async (req, res) => {
  const task = await approveAndContinue(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

const PatchStepSchema = z.object({
  params: z.record(z.any()),
});

app.patch('/tasks/:id/steps/:stepIndex', (req, res) => {
  const task = Storage.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const stepIndex = Number(req.params.stepIndex);
  if (!Number.isFinite(stepIndex)) return res.status(400).json({ error: 'Invalid stepIndex' });
  if (stepIndex !== task.currentStep) return res.status(400).json({ error: 'Only currentStep can be edited' });
  if (task.status !== 'waiting_approval') return res.status(400).json({ error: 'Task not waiting approval' });

  const parsed = PatchStepSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const step = task.steps[stepIndex];
  if (!step) return res.status(404).json({ error: 'Step not found' });

  if (step.tool !== 'sendTelegram' && step.tool !== 'sendEmail') {
    return res.status(400).json({ error: 'Only sendTelegram/sendEmail steps are editable' });
  }

  task.steps[stepIndex] = { ...step, params: parsed.data.params };
  Storage.updateTask(task);
  res.json(task);
});

app.get('/logs', (_req, res) => {
  res.json({ logs: Storage.listLogs() });
});

const ReminderCreateSchema = z.object({
  title: z.string().min(3),
  note: z.string().optional(),
  dueAt: z.string().datetime().optional(),
});

app.get('/reminders', (req, res) => {
  const status = req.query.status === 'open' ? 'open' : req.query.status === 'done' ? 'done' : undefined;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
  res.json({ reminders: Storage.listReminders({ status, limit }) });
});

app.post('/reminders', (req, res) => {
  const parsed = ReminderCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const reminder = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    dueAt: parsed.data.dueAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: 'open' as const,
    title: parsed.data.title,
    note: parsed.data.note,
  };
  Storage.addReminder(reminder);
  res.status(201).json(reminder);
});

app.post('/reminders/:id/done', (req, res) => {
  const r = Storage.getReminder(req.params.id);
  if (!r) return res.status(404).json({ error: 'Reminder not found' });
  Storage.updateReminder(r.id, { status: 'done' });
  res.json(Storage.getReminder(r.id));
});

app.get('/inbox/messages', (req, res) => {
  const channel = req.query.channel === 'telegram' ? 'telegram' : req.query.channel === 'email' ? 'email' : undefined;
  const chatId = typeof req.query.chatId === 'string' ? req.query.chatId : undefined;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
  res.json({ messages: Storage.listInboxMessages({ channel, chatId, limit }) });
});

app.get('/inbox/messages/:id', (req, res) => {
  const msg = Storage.getInboxMessage(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  res.json(msg);
});

app.get('/inbox/threads', (req, res) => {
  const channel = req.query.channel === 'telegram' ? 'telegram' : req.query.channel === 'email' ? 'email' : undefined;
  const chatId = typeof req.query.chatId === 'string' ? req.query.chatId : undefined;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 30;
  if (!channel) return res.status(400).json({ error: 'channel required (telegram|email)' });
  if (!chatId) return res.status(400).json({ error: 'chatId required' });

  const messages = Storage.listInboxMessages({ channel, chatId, limit });
  const joined = messages
    .map((m) => [m.subject, m.text].filter(Boolean).join(' '))
    .filter(Boolean)
    .join('\n');

  res.json({
    channel,
    chatId,
    count: messages.length,
    summary: summarizeText(joined, 260),
    actionItems: extractActionItems(joined) ?? [],
    messages,
  });
});

function buildReplyDraft(message: { channel: string; fromName?: string; fromId?: string; subject?: string; text?: string }) {
  if (message.channel === 'telegram') {
    const body = `Siap, saya bantu. Bisa jelaskan detailnya?`;
    return { channel: 'telegram' as const, text: body };
  }

  const subject = message.subject ? (message.subject.toLowerCase().startsWith('re:') ? message.subject : `Re: ${message.subject}`) : 'Re: (no subject)';
  const greeting = message.fromName ? `Halo ${message.fromName},` : `Halo,`;
  const body = `${greeting}\n\nTerima kasih emailnya. Saya sudah terima dan akan saya tindaklanjuti.\n\nSalam,\n`;
  return { channel: 'email' as const, to: message.fromId ?? '', subject, text: body };
}

app.post('/inbox/messages/:id/reply-task', async (req, res) => {
  const msg = Storage.getInboxMessage(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  const draft = buildReplyDraft(msg);
  if (draft.channel === 'telegram') {
    const task = await enqueueTask(`Reply Telegram (${msg.chatId})`, [
      { tool: 'sendTelegram', params: { chatId: msg.chatId, text: draft.text }, requiresApproval: true },
    ]);
    return res.status(201).json({ task, draft });
  }

  if (!draft.to) {
    return res.status(400).json({ error: 'Email sender address not available (fromId kosong)' });
  }

  const task = await enqueueTask(`Reply Email (${draft.to})`, [
    { tool: 'sendEmail', params: { to: draft.to, subject: draft.subject, text: draft.text }, requiresApproval: true },
  ]);
  return res.status(201).json({ task, draft });
});

app.post('/inbox/messages/:id/followup', (req, res) => {
  const msg = Storage.getInboxMessage(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  const parsed = z
    .object({
      dueAt: z.string().datetime().optional(),
      title: z.string().optional(),
      note: z.string().optional(),
    })
    .safeParse(req.body ?? {});

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const title =
    parsed.data.title ??
    (msg.summary ? `Follow-up: ${msg.summary}` : `Follow-up ${msg.channel}:${msg.chatId}`);
  const note =
    parsed.data.note ??
    (msg.actionItems && msg.actionItems.length > 0 ? msg.actionItems.map((a) => `- ${a}`).join('\n') : msg.text);

  const reminder = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    dueAt: parsed.data.dueAt ?? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'open' as const,
    title,
    note,
    source: { channel: msg.channel, messageId: msg.id, chatId: msg.chatId },
  };
  Storage.addReminder(reminder);
  res.status(201).json(reminder);
});

app.get('/connectors/telegram/status', async (_req, res) => {
  try {
    if (!Config.telegram.botToken) {
      return res.json({ enabled: false, reason: 'TELEGRAM_BOT_TOKEN belum di-set' });
    }
    const me = await telegramGetMe();
    res.json({ enabled: true, polling: Config.telegram.pollingEnabled, me });
  } catch (e: any) {
    res.status(500).json({ enabled: false, error: String(e?.message ?? e) });
  }
});

app.get('/connectors/email/status', async (_req, res) => {
  try {
    const status = await emailImapStatus();
    res.json(status);
  } catch (e: any) {
    res.status(500).json({ enabled: false, error: String(e?.message ?? e) });
  }
});

app.get('/connectors/email/smtp/status', async (_req, res) => {
  try {
    const status = await emailSmtpStatus();
    res.json(status);
  } catch (e: any) {
    res.status(500).json({ enabled: false, error: String(e?.message ?? e) });
  }
});

startTelegramPolling();
startEmailPolling();

app.listen(Config.port, () => {
  console.log(`MyClaw Agent listening on http://localhost:${Config.port}`);
});
