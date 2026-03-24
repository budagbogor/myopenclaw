import type { ToolCall } from './types.js';

type PlanInput = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'checkbox' | 'url' | 'email';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
};

export type PlanSpec = {
  title: string;
  description: string;
  mode: 'auto' | 'web' | 'telegram' | 'email' | 'git' | 'command' | 'present';
  inputs: PlanInput[];
  steps: ToolCall[];
};

function findFirstUrl(text: string): string | undefined {
  const m = text.match(/https?:\/\/\S+/i);
  if (!m) return;
  const url = m[0].replace(/[),.]+$/, '');
  return url;
}

function norm(t: string): string {
  return t.toLowerCase().trim();
}

export function buildPlan(goalRaw: string, forcedMode?: PlanSpec['mode']): PlanSpec {
  const goal = goalRaw.trim();
  const g = norm(goal);
  const url = findFirstUrl(goal);

  const mode: PlanSpec['mode'] =
    forcedMode ??
    (g.includes('telegram') || g.includes('bot') ? 'telegram' : g.includes('email') || g.includes('imap') || g.includes('smtp') ? 'email' : g.includes('git') || g.includes('diff') ? 'git' : g.includes('command') || g.includes('jalankan') || g.startsWith('run ') ? 'command' : g.includes('present') || g.includes('slide') || g.includes('ppt') || g.includes('presentasi') ? 'present' : 'web');

  if (mode === 'telegram') {
    return {
      title: 'Send Telegram Message',
      description: 'Kirim pesan Telegram dengan approval.',
      mode,
      inputs: [
        { name: 'chatId', label: 'Chat ID', type: 'text', placeholder: 'contoh: 123456', required: true },
        { name: 'text', label: 'Pesan', type: 'textarea', placeholder: 'Tulis pesan…', required: true },
      ],
      steps: [{ tool: 'sendTelegram', params: { chatId: '{{chatId}}', text: '{{text}}' }, requiresApproval: true }],
    };
  }

  if (mode === 'email') {
    return {
      title: 'Send Email',
      description: 'Kirim email via SMTP dengan approval.',
      mode,
      inputs: [
        { name: 'to', label: 'To', type: 'email', placeholder: 'user@example.com', required: true },
        { name: 'subject', label: 'Subject', type: 'text', placeholder: 'Subjek email', required: true },
        { name: 'text', label: 'Body', type: 'textarea', placeholder: 'Isi email…', required: false },
      ],
      steps: [{ tool: 'sendEmail', params: { to: '{{to}}', subject: '{{subject}}', text: '{{text}}' }, requiresApproval: true }],
    };
  }

  if (mode === 'git') {
    return {
      title: 'Git Summary',
      description: 'Ringkas status dan perubahan git (approval + allowlist command/cwd).',
      mode,
      inputs: [
        { name: 'cwd', label: 'Repo path (CWD)', type: 'text', placeholder: 'i:\\\\path\\\\to\\\\repo', required: true },
        { name: 'includePatch', label: 'Include patch (git diff -U3)', type: 'checkbox', defaultValue: false },
      ],
      steps: [{ tool: 'gitSummary', params: { cwd: '{{cwd}}', includePatch: '{{includePatch}}' }, requiresApproval: true }],
    };
  }

  if (mode === 'command') {
    return {
      title: 'Run Command',
      description: 'Jalankan command lokal (approval + allowlist command/cwd).',
      mode,
      inputs: [
        { name: 'command', label: 'Command', type: 'text', placeholder: 'contoh: npm run build --prefix agent', required: true },
        { name: 'cwd', label: 'CWD (opsional)', type: 'text', placeholder: 'i:\\\\path\\\\to\\\\repo', required: false },
        { name: 'timeoutMs', label: 'Timeout (ms)', type: 'number', defaultValue: 20000 },
      ],
      steps: [
        {
          tool: 'runCommand',
          params: { command: '{{command}}', cwd: '{{cwd}}', timeoutMs: '{{timeoutMs}}' },
          requiresApproval: true,
        },
      ],
    };
  }

  if (mode === 'present') {
    return {
      title: 'Presentation Outline',
      description: 'Buat outline presentasi dari konteks teks.',
      mode,
      inputs: [
        { name: 'title', label: 'Judul', type: 'text', placeholder: 'contoh: Update Proyek', required: true, defaultValue: 'Update' },
        { name: 'contextText', label: 'Konteks', type: 'textarea', placeholder: 'Ringkas poin utama…', required: false, defaultValue: goal },
      ],
      steps: [{ tool: 'makePresentationOutline', params: { title: '{{title}}', contextText: '{{contextText}}' } }],
    };
  }

  const queryDefault = goal.length > 0 ? goal : 'ringkas topik';
  const steps: ToolCall[] = [{ tool: 'webSearch', params: { query: '{{query}}', maxResults: '{{maxResults}}' } }];
  if (url) steps.push({ tool: 'webFetch', params: { url: '{{url}}' } });

  return {
    title: 'Web Research',
    description: 'Cari dan ringkas informasi dari web. Bisa tambah fetch URL.',
    mode: 'web',
    inputs: [
      { name: 'query', label: 'Query', type: 'text', placeholder: 'contoh: ringkas berita AI hari ini', required: true, defaultValue: queryDefault },
      { name: 'maxResults', label: 'Max results', type: 'number', defaultValue: 5 },
      { name: 'url', label: 'Fetch URL (opsional)', type: 'url', placeholder: 'https://…', required: false, defaultValue: url ?? '' },
    ],
    steps,
  };
}

export function plannerExamples(): { title: string; goal: string }[] {
  return [
    { title: 'Web research', goal: 'Ringkas tren AI terbaru untuk developer (poin penting + sumber).' },
    { title: 'Send Telegram', goal: 'Kirim Telegram: ingatkan meeting jam 3 sore.' },
    { title: 'Send Email', goal: 'Kirim email ke vendor: minta update timeline integrasi.' },
    { title: 'Git summary', goal: 'Cek perubahan git di repo ini dan ringkas stat.' },
    { title: 'Presentation', goal: 'Buat outline presentasi untuk update proyek minggu ini.' },
  ];
}

