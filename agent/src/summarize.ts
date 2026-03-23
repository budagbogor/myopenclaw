function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function splitSentences(text: string): string[] {
  const cleaned = normalizeText(text);
  if (!cleaned) return [];
  const parts = cleaned.split(/(?<=[.!?])\s+/);
  return parts.map((s) => s.trim()).filter(Boolean);
}

export function summarizeText(text?: string, maxLen = 220): string | undefined {
  const t = normalizeText(text ?? '');
  if (!t) return;
  const sentences = splitSentences(t);
  const candidate = sentences[0] ?? t;
  if (candidate.length <= maxLen) return candidate;
  return candidate.slice(0, maxLen - 1) + '…';
}

export function extractActionItems(text?: string): string[] | undefined {
  const t = normalizeText(text ?? '');
  if (!t) return;

  const candidates: string[] = [];

  const lines = t.split(/[\n\r]+/).map((s) => s.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.endsWith('?')) candidates.push(line);
  }

  const keywords = [
    'tolong',
    'mohon',
    'please',
    'bisa',
    'dapatkah',
    'kirim',
    'buat',
    'cek',
    'follow up',
    'follow-up',
    'meeting',
    'jadwal',
    'konfirmasi',
    'approve',
    'setujui',
  ];

  const sentences = splitSentences(t);
  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (keywords.some((k) => lower.includes(k))) candidates.push(s);
  }

  const unique = [...new Set(candidates.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) return;
  return unique.slice(0, 5);
}

