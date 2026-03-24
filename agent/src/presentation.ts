import { extractActionItems, summarizeText } from './summarize.js';
import type { PresentationOutline, PresentationSlide } from './types.js';

export function makePresentationOutline(input: {
  title: string;
  contextText?: string;
  sources?: string[];
}): PresentationOutline {
  const createdAt = new Date().toISOString();
  const context = input.contextText ?? '';
  const summary = summarizeText(context, 380);
  const actions = extractActionItems(context) ?? [];

  const slides: PresentationSlide[] = [];

  slides.push({
    title: input.title,
    bullets: summary ? [summary] : ['Ringkasan belum tersedia.'],
  });

  if (actions.length > 0) {
    slides.push({
      title: 'Action Items',
      bullets: actions,
    });
  }

  slides.push({
    title: 'Next Steps',
    bullets: ['Validasi sumber dan data', 'Tentukan keputusan/approval', 'Eksekusi langkah berikutnya'],
  });

  if (input.sources && input.sources.length > 0) {
    slides.push({
      title: 'Sources',
      bullets: input.sources.slice(0, 8),
    });
  }

  return { title: input.title, createdAt, slides, sources: input.sources };
}

