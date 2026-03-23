import { Task, AuditLog, InboxMessage, InboxChannel } from '../types.js';

const tasks = new Map<string, Task>();
const logs: AuditLog[] = [];
const inboxMessages: InboxMessage[] = [];

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
    logs.push(entry);
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
};
