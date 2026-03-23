import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { z } from 'zod';
import { Tools } from './tools/index.js';
import { Storage } from './storage/memory.js';
import { enqueueTask, approveAndContinue } from './agent.js';
import { Config } from './config.js';
import { startTelegramPolling, telegramGetMe } from './connectors/telegram.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

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

app.get('/logs', (_req, res) => {
  res.json({ logs: Storage.listLogs() });
});

app.get('/inbox/messages', (req, res) => {
  const channel = req.query.channel === 'telegram' ? 'telegram' : undefined;
  const chatId = typeof req.query.chatId === 'string' ? req.query.chatId : undefined;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
  res.json({ messages: Storage.listInboxMessages({ channel, chatId, limit }) });
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

startTelegramPolling();

app.listen(Config.port, () => {
  console.log(`MyClaw Agent listening on http://localhost:${Config.port}`);
});
