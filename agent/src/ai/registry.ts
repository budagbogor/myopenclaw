import { Config } from '../config.js';
import type { AIModel, AIProvider } from '../types.js';

function hasKey(v?: string): v is string {
  return typeof v === 'string' && v.length > 0;
}

let overrideKeys: { openrouter?: string; sumopod?: string; bytez?: string } = {};

export function setApiKeys(patch: { openrouter?: string; sumopod?: string; bytez?: string }) {
  overrideKeys = {
    openrouter: patch.openrouter ?? overrideKeys.openrouter,
    sumopod: patch.sumopod ?? overrideKeys.sumopod,
    bytez: patch.bytez ?? overrideKeys.bytez,
  };
}

export type ApiKeySource = 'ui' | 'env' | 'none';

export function getApiKeysStatus(): {
  openrouter: boolean;
  sumopod: boolean;
  bytez: boolean;
  source: { openrouter: ApiKeySource; sumopod: ApiKeySource; bytez: ApiKeySource };
} {
  const openrouter = overrideKeys.openrouter ?? Config.ai.openrouter.apiKey;
  const sumopod = overrideKeys.sumopod ?? Config.ai.sumopod.apiKey;
  const bytez = overrideKeys.bytez ?? Config.ai.bytez.apiKey;
  return {
    openrouter: hasKey(openrouter),
    sumopod: hasKey(sumopod),
    bytez: hasKey(bytez),
    source: {
      openrouter: hasKey(overrideKeys.openrouter) ? 'ui' : hasKey(Config.ai.openrouter.apiKey) ? 'env' : 'none',
      sumopod: hasKey(overrideKeys.sumopod) ? 'ui' : hasKey(Config.ai.sumopod.apiKey) ? 'env' : 'none',
      bytez: hasKey(overrideKeys.bytez) ? 'ui' : hasKey(Config.ai.bytez.apiKey) ? 'env' : 'none',
    },
  };
}

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

async function tryFetchAny(urls: string[], headers: Record<string, string>, timeoutMs = 8000): Promise<any | undefined> {
  for (const url of urls) {
    const data = await tryFetch(url, headers, timeoutMs);
    if (data !== undefined) return data;
  }
  return;
}

export async function listOpenRouterModels(): Promise<AIModel[]> {
  const apiKey = overrideKeys.openrouter ?? Config.ai.openrouter.apiKey;
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
  const apiKey = overrideKeys.sumopod ?? Config.ai.sumopod.apiKey;
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
  const apiKey = overrideKeys.bytez ?? Config.ai.bytez.apiKey;
  if (!hasKey(apiKey)) {
    return [
      { id: 'bytez/free-1', name: 'Bytez Free 1', provider: 'bytez', priceUsdPer1kTokens: 0, latencyMsEstimate: 850, quality: 'general', freeTier: true, load: 'medium' },
      { id: 'bytez/coder-pro', name: 'Bytez Coder Pro', provider: 'bytez', priceUsdPer1kTokens: 0.002, latencyMsEstimate: 700, quality: 'coding', freeTier: false, load: 'low' },
    ];
  }
  const key = apiKey;
  const headers = { Authorization: `Bearer ${key}`, 'x-api-key': key };
  const data = await tryFetchAny(['https://bytez.com/models', 'https://api.bytez.com/models'], headers);
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

export async function testProvider(provider: AIProvider): Promise<{
  provider: AIProvider;
  ok: boolean;
  source: 'ui' | 'env' | 'none';
  modelCount?: number;
  sampleModels?: { id: string; name: string }[];
  note?: string;
  error?: string;
}> {
  const keys = getApiKeysStatus();

  if (provider === 'openrouter') {
    const apiKey = overrideKeys.openrouter ?? Config.ai.openrouter.apiKey;
    const source = keys.source.openrouter;
    if (!hasKey(apiKey)) return { provider, ok: false, source, error: 'OPENROUTER_API_KEY belum di-set' };
    const data = await tryFetch('https://api.openrouter.ai/v1/models', { Authorization: `Bearer ${apiKey}` }, 10000);
    if (!data || !Array.isArray(data.data)) return { provider, ok: false, source, error: 'Gagal fetch models dari OpenRouter' };
    const sample = data.data.slice(0, 5).map((m: any) => ({ id: String(m.id ?? ''), name: String(m.name ?? m.id ?? '') }));
    return { provider, ok: true, source, modelCount: data.data.length, sampleModels: sample };
  }

  if (provider === 'bytez') {
    const apiKey = overrideKeys.bytez ?? Config.ai.bytez.apiKey;
    const source = keys.source.bytez;
    if (!hasKey(apiKey)) return { provider, ok: false, source, error: 'BYTEZ_API_KEY belum di-set' };
    const headers = { Authorization: `Bearer ${apiKey}`, 'x-api-key': apiKey };
    const data = await tryFetchAny(['https://bytez.com/models', 'https://api.bytez.com/models'], headers, 10000);
    if (!data || !Array.isArray(data)) return { provider, ok: false, source, error: 'Gagal fetch models dari Bytez' };
    const sample = data.slice(0, 5).map((m: any) => ({ id: String(m.id ?? ''), name: String(m.name ?? m.id ?? '') }));
    return { provider, ok: true, source, modelCount: data.length, sampleModels: sample };
  }

  if (provider === 'sumopod') {
    const apiKey = overrideKeys.sumopod ?? Config.ai.sumopod.apiKey;
    const source = keys.source.sumopod;
    if (!hasKey(apiKey)) return { provider, ok: false, source, error: 'SUMOPOD_API_KEY belum di-set' };
    const models = await listSumoPodModels();
    return {
      provider,
      ok: true,
      source,
      modelCount: models.length,
      sampleModels: models.slice(0, 5).map((m) => ({ id: m.id, name: m.name })),
      note: 'SumoPod API test masih placeholder (belum ada endpoint verifikasi token).',
    };
  }

  const best = await pickBestAuto();
  return { provider, ok: true, source: 'none', modelCount: best ? 1 : 0, sampleModels: best ? [{ id: best.id, name: best.name }] : [] };
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
