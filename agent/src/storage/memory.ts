import { Task, AuditLog, InboxMessage, InboxChannel, Reminder, ReminderStatus, KnowledgeDoc } from '../types.js';
import { redactDeep } from '../redact.js';
import { Config } from '../config.js';

const tasks = new Map<string, Task>();
const logs: AuditLog[] = [];
const inboxMessages: InboxMessage[] = [];
const reminders: Reminder[] = [];
const knowledgeDocs: KnowledgeDoc[] = [];

function isoToMs(iso?: string): number | undefined {
  if (!iso) return;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return;
  return ms;
}

function retentionCutoffMs(now = Date.now()): number {
  return now - Config.retentionDays * 24 * 60 * 60 * 1000;
}

export const Storage = {
  addTask(task: Task) {
    tasks.set(task.id, task);
  },
  getTask(id: string) {
    return tasks.get(id);
  },
  listTasks() {
    return [...tasks.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  updateTask(task: Task) {
    tasks.set(task.id, task);
  },
  addLog(entry: AuditLog) {
    logs.push(redactDeep(entry) as AuditLog);
  },
  listLogs(limit = 200) {
    return logs.slice(-limit);
  },
  addInboxMessage(message: InboxMessage) {
    inboxMessages.push(message);
  },
  getInboxMessage(id: string) {
    return inboxMessages.find((m) => m.id === id);
  },
  updateInboxMessage(id: string, patch: Partial<InboxMessage>) {
    const idx = inboxMessages.findIndex((m) => m.id === id);
    if (idx === -1) return;
    inboxMessages[idx] = { ...inboxMessages[idx], ...patch };
  },
  listInboxMessages(options?: { channel?: InboxChannel; chatId?: string; limit?: number }) {
    const limit = options?.limit ?? 50;
    const channel = options?.channel;
    const chatId = options?.chatId;
    const filtered = inboxMessages.filter((m) => {
      if (channel && m.channel !== channel) return false;
      if (chatId && m.chatId !== chatId) return false;
      return true;
    });
    return filtered.slice(-limit);
  },
  addReminder(reminder: Reminder) {
    reminders.push(reminder);
  },
  getReminder(id: string) {
    return reminders.find((r) => r.id === id);
  },
  listReminders(options?: { status?: ReminderStatus; limit?: number }) {
    const limit = options?.limit ?? 100;
    const status = options?.status;
    const filtered = reminders.filter((r) => {
      if (status && r.status !== status) return false;
      return true;
    });
    return filtered.slice(-limit);
  },
  updateReminder(id: string, patch: Partial<Reminder>) {
    const idx = reminders.findIndex((r) => r.id === id);
    if (idx === -1) return;
    reminders[idx] = { ...reminders[idx], ...patch };
  },
  addKnowledgeDoc(doc: KnowledgeDoc) {
    knowledgeDocs.push(doc);
  },
  listKnowledgeDocs(limit = 100) {
    return knowledgeDocs.slice(-limit);
  },
  searchKnowledge(query: string, limit = 20) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = knowledgeDocs.filter((d) => {
      return d.title.toLowerCase().includes(q) || d.text.toLowerCase().includes(q);
    });
    return matches.slice(-limit);
  },
  exportData() {
    const taskList = [...tasks.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return redactDeep({
      exportedAt: new Date().toISOString(),
      retentionDays: Config.retentionDays,
      tasks: taskList,
      logs: logs.slice(),
      inboxMessages: inboxMessages.slice(),
      reminders: reminders.slice(),
      knowledgeDocs: knowledgeDocs.slice(),
    });
  },
  wipeAll() {
    tasks.clear();
    logs.splice(0, logs.length);
    inboxMessages.splice(0, inboxMessages.length);
    reminders.splice(0, reminders.length);
    knowledgeDocs.splice(0, knowledgeDocs.length);
  },
  prune() {
    const cutoff = retentionCutoffMs();

    for (const [id, t] of tasks.entries()) {
      const ms = isoToMs(t.createdAt);
      if (ms !== undefined && ms < cutoff) tasks.delete(id);
    }

    for (let i = logs.length - 1; i >= 0; i -= 1) {
      const ms = isoToMs(logs[i]?.time);
      if (ms !== undefined && ms < cutoff) logs.splice(i, 1);
    }

    for (let i = inboxMessages.length - 1; i >= 0; i -= 1) {
      const ms = isoToMs(inboxMessages[i]?.time);
      if (ms !== undefined && ms < cutoff) inboxMessages.splice(i, 1);
    }

    for (let i = reminders.length - 1; i >= 0; i -= 1) {
      const ms = isoToMs(reminders[i]?.createdAt);
      if (ms !== undefined && ms < cutoff) reminders.splice(i, 1);
    }

    for (let i = knowledgeDocs.length - 1; i >= 0; i -= 1) {
      const ms = isoToMs(knowledgeDocs[i]?.createdAt);
      if (ms !== undefined && ms < cutoff) knowledgeDocs.splice(i, 1);
    }
  },
};
