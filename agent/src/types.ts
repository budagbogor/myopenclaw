export type TaskStatus = 'queued' | 'running' | 'waiting_approval' | 'done' | 'failed';

export type InboxChannel = 'telegram';

export interface ToolCall {
  tool: string;
  params: Record<string, unknown>;
  requiresApproval?: boolean;
}

export interface Task {
  id: string;
  title: string;
  createdAt: string;
  status: TaskStatus;
  steps: ToolCall[];
  currentStep: number;
  logs: AuditLog[];
}

export interface AuditLog {
  time: string;
  taskId: string;
  stepIndex: number;
  tool: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  status: 'success' | 'error' | 'waiting_approval' | 'skipped';
}

export interface InboxMessage {
  id: string;
  channel: InboxChannel;
  time: string;
  chatId: string;
  fromId?: string;
  fromName?: string;
  text?: string;
  raw: unknown;
}

export interface Tool {
  name: string;
  description: string;
  approvalRequired?: (params: Record<string, unknown>) => boolean;
  run: (params: Record<string, unknown>) => Promise<unknown>;
}
