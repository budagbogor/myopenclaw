import { Config } from '../config.js';
import type { AIModel, AIProvider } from '../types.js';

const hasKey = (v?: string) => typeof v === 'string' && v.length > 0;

async function tryFetch(url: string, headers: Record<string, string>, timeoutMs = 8000): Promise<any | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return;
    const data = await res.json().catch(() => undefined);
    return data;
  } catch {
    return;
  } finally {
    clearTimeout(timer);
  }
}

export async function listOpenRouterModels(): Promise<AIModel[]> {
  const apiKey = Config.ai.openrouter.apiKey;
  if (!hasKey(apiKey)) {
    return [
      { id: 'openrouter/free-coder', name: 'Free Coder', provider: 'openrouter', priceUsdPer1kTokens: 0, latencyMsEstimate: 800, quality: 'coding', freeTier: true, load: 'medium' },
    ];
  }
  const data = await tryFetch('https://api.openrouter.ai/v1/models', { Authorization: `Bearer ${apiKey}` });
  if (!data || !Array.isArray(data.data)) {
    return [{ id: 'openrouter/fallback', name: 'Fallback', provider: 'openrouter', priceUsdPer1kTokens: 0.001, latencyMsEstimate: 1200, quality: 'general', freeTier: false, load: 'unknown' }];
  }
  const models: AIModel[] = [];
  for (const m of data.data) {
    const id = String(m.id ?? m.slug ?? m.name ?? 'unknown');
    const name = String(m.name ?? id);
    const freeTier = Boolean(m.tier === 'free' || String(m.tier ?? '').toLowerCase().includes('free'));
    const price = typeof m.price === 'number' ? m.price : undefined;
    const quality = /code|coder|coding|dev/i.test(name) ? 'coding' : 'general';
    models.push({ id, name, provider: 'openrouter', priceUsdPer1kTokens: price, latencyMsEstimate: undefined, quality, freeTier, load: 'unknown' });
  }
  return models;
}

export async function listSumoPodModels(): Promise<AIModel[]> {
  const apiKey = Config.ai.sumopod.apiKey;
  if (!hasKey(apiKey)) {
    return [
      { id: 'sumopod/free-coding-lite', name: 'SumoPod Free Coding Lite', provider: 'sumopod', priceUsdPer1kTokens: 0, latencyMsEstimate: 900, quality: 'coding', freeTier: true, load: 'low' },
      { id: 'sumopod/premium-coder', name: 'SumoPod Premium Coder', provider: 'sumopod', priceUsdPer1kTokens: 0.003, latencyMsEstimate: 700, quality: 'coding', freeTier: false, load: 'low' },
    ];
  }
  return [
    { id: 'sumopod/auto-best-coder', name: 'SumoPod Auto Best Coder', provider: 'sumopod', priceUsdPer1kTokens: 0.002, latencyMsEstimate: 680, quality: 'coding', freeTier: false, load: 'low' },
  ];
}

export async function listBytezModels(): Promise<AIModel[]> {
  const apiKey = Config.ai.bytez.apiKey;
  if (!hasKey(apiKey)) {
    return [
      { id: 'bytez/free-1', name: 'Bytez Free 1', provider: 'bytez', priceUsdPer1kTokens: 0, latencyMsEstimate: 850, quality: 'general', freeTier: true, load: 'medium' },
      { id: 'bytez/coder-pro', name: 'Bytez Coder Pro', provider: 'bytez', priceUsdPer1kTokens: 0.002, latencyMsEstimate: 700, quality: 'coding', freeTier: false, load: 'low' },
    ];
  }
  const data = await tryFetch('https://bytez.com/models', { Authorization: `Bearer ${apiKey}` });
  if (!data || !Array.isArray(data)) {
    return [{ id: 'bytez/fallback', name: 'Bytez Fallback', provider: 'bytez', priceUsdPer1kTokens: 0.0015, latencyMsEstimate: 1000, quality: 'general', freeTier: false, load: 'unknown' }];
  }
  const models: AIModel[] = [];
  for (const m of data) {
    const id = String(m.id ?? m.slug ?? m.name ?? 'unknown');
    const name = String(m.name ?? id);
    const price = typeof m.price === 'number' ? m.price : undefined;
    const freeTier = price === 0;
    const quality = /code|coder|coding|dev/i.test(name) ? 'coding' : 'general';
    models.push({ id, name, provider: 'bytez', priceUsdPer1kTokens: price, latencyMsEstimate: undefined, quality, freeTier, load: 'unknown' });
  }
  return models;
}

export async function listAllModels(): Promise<AIModel[]> {
  const a = await listOpenRouterModels();
  const b = await listSumoPodModels();
  const c = await listBytezModels();
  return [...a, ...b, ...c];
}

function score(m: AIModel): number {
  const free = m.freeTier ? 1 : 0;
  const coding = m.quality === 'coding' ? 1 : 0;
  const loadLow = m.load === 'low' ? 1 : 0;
  const latency = m.latencyMsEstimate ?? 1000;
  const price = m.priceUsdPer1kTokens ?? 0.005;
  return free * 3 + coding * 3 + loadLow * 2 - latency / 2000 - price * 200;
}

export async function pickBestAuto(): Promise<AIModel | undefined> {
  const models = await listAllModels();
  const filtered = models.filter((m) => !m.disabled);
  filtered.sort((x, y) => score(y) - score(x));
  return filtered[0];
}

let selectedModel: AIModel | undefined;
let selectedProvider: AIProvider = Config.ai.provider;

export function getSelectedModel(): { provider: AIProvider; model?: AIModel } {
  return { provider: selectedProvider, model: selectedModel };
}

export async function smartSwitch(): Promise<{ provider: AIProvider; model?: AIModel }> {
  const best = await pickBestAuto();
  selectedProvider = 'auto';
  selectedModel = best;
  return { provider: selectedProvider, model: selectedModel };
}

export async function selectModel(provider: AIProvider, modelId?: string): Promise<{ provider: AIProvider; model?: AIModel }> {
  selectedProvider = provider;
  if (provider === 'auto') {
    const best = await pickBestAuto();
    selectedModel = best;
    return { provider, model: selectedModel };
  }
  const list = provider === 'openrouter' ? await listOpenRouterModels() : provider === 'sumopod' ? await listSumoPodModels() : await listBytezModels();
  selectedModel = modelId ? list.find((m) => m.id === modelId) ?? list[0] : list[0];
  return { provider, model: selectedModel };
}
