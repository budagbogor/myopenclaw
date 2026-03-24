export type TaskStatus = 'queued' | 'running' | 'waiting_approval' | 'done' | 'failed';

export type InboxChannel = 'telegram' | 'email';

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
  subject?: string;
  labels?: string[];
  needsReply?: boolean;
  summary?: string;
  actionItems?: string[];
  raw: unknown;
}

export type ReminderStatus = 'open' | 'done';

export interface Reminder {
  id: string;
  createdAt: string;
  dueAt: string;
  status: ReminderStatus;
  title: string;
  note?: string;
  source?: {
    channel: InboxChannel;
    messageId: string;
    chatId: string;
  };
}

export interface KnowledgeDoc {
  id: string;
  createdAt: string;
  title: string;
  text: string;
  tags?: string[];
  sources?: string[];
}

export interface PresentationSlide {
  title: string;
  bullets: string[];
}

export interface PresentationOutline {
  title: string;
  createdAt: string;
  slides: PresentationSlide[];
  sources?: string[];
}

export type ToolEffect = 'read' | 'write';

export interface Tool {
  name: string;
  description: string;
  effect: ToolEffect;
  approvalRequired?: (params: Record<string, unknown>) => boolean;
  run: (params: Record<string, unknown>) => Promise<unknown>;
}

export type AIProvider = 'auto' | 'openrouter' | 'sumopod' | 'bytez';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  priceUsdPer1kTokens?: number;
  latencyMsEstimate?: number;
  quality?: 'coding' | 'general' | 'unknown';
  freeTier?: boolean;
  load?: 'low' | 'medium' | 'high' | 'unknown';
  disabled?: boolean;
}
