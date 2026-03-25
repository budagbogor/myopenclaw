import { Config } from '../config.js';
import type { AIModel, AIProvider } from '../types.js';

function hasKey(v?: string): v is string {
  return typeof v === 'string' && v.length > 0;
}

let overrideKeys: { openrouter?: string; sumopod?: string; bytez?: string } = {};

const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
const modelCache: Partial<Record<AIProvider, { fetchedAt: number; models: AIModel[] }>> = {};

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

export function clearModelCache(provider?: AIProvider) {
  if (provider) {
    delete modelCache[provider];
    return;
  }
  for (const k of Object.keys(modelCache) as AIProvider[]) delete modelCache[k];
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
  const cached = modelCache.openrouter;
  if (cached && Date.now() - cached.fetchedAt < MODEL_CACHE_TTL_MS) return cached.models;

  const apiKey = overrideKeys.openrouter ?? Config.ai.openrouter.apiKey;
  if (!hasKey(apiKey)) {
    const models: AIModel[] = [
      { id: 'openrouter/free-coder', name: 'Free Coder', provider: 'openrouter', priceUsdPer1kTokens: 0, latencyMsEstimate: 800, quality: 'coding', freeTier: true, load: 'medium' },
    ];
    modelCache.openrouter = { fetchedAt: Date.now(), models };
    return models;
  }

  const data = await tryFetchAny(
    ['https://openrouter.ai/api/v1/models', 'https://api.openrouter.ai/v1/models'],
    { Authorization: `Bearer ${apiKey}` },
    12000
  );
  if (!data || !Array.isArray(data.data)) {
    const models: AIModel[] = [{ id: 'openrouter/fallback', name: 'Fallback', provider: 'openrouter', priceUsdPer1kTokens: 0.001, latencyMsEstimate: 1200, quality: 'general', freeTier: false, load: 'unknown' }];
    modelCache.openrouter = { fetchedAt: Date.now(), models };
    return models;
  }

  const models: AIModel[] = [];
  for (const m of data.data) {
    const id = String(m.id ?? m.slug ?? m.name ?? 'unknown');
    const name = String(m.name ?? id);
    const pricing = m.pricing ?? {};
    const prompt = typeof pricing.prompt === 'number' ? pricing.prompt : Number(pricing.prompt ?? NaN);
    const completion = typeof pricing.completion === 'number' ? pricing.completion : Number(pricing.completion ?? NaN);
    const freeTier = Boolean(m.tier === 'free' || String(m.tier ?? '').toLowerCase().includes('free') || (Number.isFinite(prompt) && Number.isFinite(completion) && prompt === 0 && completion === 0));
    const priceUsdPer1kTokens = Number.isFinite(prompt) ? prompt : undefined;
    const quality = /code|coder|coding|dev/i.test(name) ? 'coding' : 'general';
    models.push({ id, name, provider: 'openrouter', priceUsdPer1kTokens, latencyMsEstimate: undefined, quality, freeTier, load: 'unknown' });
  }

  modelCache.openrouter = { fetchedAt: Date.now(), models };
  return models;
}

export async function listSumoPodModels(): Promise<AIModel[]> {
  const cached = modelCache.sumopod;
  if (cached && Date.now() - cached.fetchedAt < MODEL_CACHE_TTL_MS) return cached.models;

  const apiKey = overrideKeys.sumopod ?? Config.ai.sumopod.apiKey;
  if (!hasKey(apiKey)) {
    const models: AIModel[] = [
      { id: 'sumopod/free-coding-lite', name: 'SumoPod Free Coding Lite', provider: 'sumopod', priceUsdPer1kTokens: 0, latencyMsEstimate: 900, quality: 'coding', freeTier: true, load: 'low' },
      { id: 'sumopod/premium-coder', name: 'SumoPod Premium Coder', provider: 'sumopod', priceUsdPer1kTokens: 0.003, latencyMsEstimate: 700, quality: 'coding', freeTier: false, load: 'low' },
    ];
    modelCache.sumopod = { fetchedAt: Date.now(), models };
    return models;
  }

  const data = await tryFetchAny(['https://ai.sumopod.com/v1/models', 'https://ai.sumopod.com/api/v1/models'], { Authorization: `Bearer ${apiKey}` }, 12000);
  if (!data || !Array.isArray(data.data)) {
    const models: AIModel[] = [{ id: 'sumopod/auto-best-coder', name: 'SumoPod Auto Best Coder', provider: 'sumopod', priceUsdPer1kTokens: 0.002, latencyMsEstimate: 680, quality: 'coding', freeTier: false, load: 'unknown' }];
    modelCache.sumopod = { fetchedAt: Date.now(), models };
    return models;
  }

  const models: AIModel[] = data.data.map((m: any) => {
    const id = String(m.id ?? m.name ?? 'unknown');
    const name = String(m.id ?? m.name ?? id);
    const quality = /code|coder|coding|dev/i.test(name) ? 'coding' : 'general';
    return { id, name, provider: 'sumopod', quality, freeTier: false, load: 'unknown' };
  });
  modelCache.sumopod = { fetchedAt: Date.now(), models };
  return models;
}

export async function listBytezModels(): Promise<AIModel[]> {
  const cached = modelCache.bytez;
  if (cached && Date.now() - cached.fetchedAt < MODEL_CACHE_TTL_MS) return cached.models;

  const apiKey = overrideKeys.bytez ?? Config.ai.bytez.apiKey;
  if (!hasKey(apiKey)) {
    const models: AIModel[] = [
      { id: 'bytez/free-1', name: 'Bytez Free 1', provider: 'bytez', priceUsdPer1kTokens: 0, latencyMsEstimate: 850, quality: 'general', freeTier: true, load: 'medium' },
      { id: 'bytez/coder-pro', name: 'Bytez Coder Pro', provider: 'bytez', priceUsdPer1kTokens: 0.002, latencyMsEstimate: 700, quality: 'coding', freeTier: false, load: 'low' },
    ];
    modelCache.bytez = { fetchedAt: Date.now(), models };
    return models;
  }

  const key = apiKey;
  const authHeaders = [{ Authorization: key }, { Authorization: `Bearer ${key}` }, { Authorization: `Key ${key}` }];
  let data: any | undefined;
  for (const headers of authHeaders) {
    data = await tryFetchAny(
      [
        'https://api.bytez.com/models/v2/list/models?task=chat',
        'https://api.bytez.com/models/v2/list/models',
        'https://api.bytez.com/models',
      ],
      headers as Record<string, string>,
      12000
    );
    if (data) break;
  }

  const output = Array.isArray(data) ? data : Array.isArray(data?.output) ? data.output : Array.isArray(data?.data) ? data.data : undefined;
  if (!output) {
    const models: AIModel[] = [{ id: 'bytez/fallback', name: 'Bytez Fallback', provider: 'bytez', priceUsdPer1kTokens: 0.0015, latencyMsEstimate: 1000, quality: 'general', freeTier: false, load: 'unknown' }];
    modelCache.bytez = { fetchedAt: Date.now(), models };
    return models;
  }

  const models: AIModel[] = output.map((m: any) => {
    const id = String(m.modelId ?? m.id ?? m.slug ?? m.name ?? 'unknown');
    const name = String(m.modelId ?? m.name ?? id);
    const meter = String(m.meter ?? '');
    const freeTier = /free/i.test(meter) || Number(m.meterPrice ?? 1) === 0;
    const quality = /code|coder|coding|dev/i.test(name) ? 'coding' : 'general';
    return { id, name, provider: 'bytez', priceUsdPer1kTokens: undefined, latencyMsEstimate: undefined, quality, freeTier, load: 'unknown' };
  });

  modelCache.bytez = { fetchedAt: Date.now(), models };
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
    const data = await tryFetchAny(['https://openrouter.ai/api/v1/models', 'https://api.openrouter.ai/v1/models'], { Authorization: `Bearer ${apiKey}` }, 10000);
    if (!data || !Array.isArray(data.data)) return { provider, ok: false, source, error: 'Gagal fetch models dari OpenRouter' };
    const sample = data.data.slice(0, 5).map((m: any) => ({ id: String(m.id ?? ''), name: String(m.name ?? m.id ?? '') }));
    return { provider, ok: true, source, modelCount: data.data.length, sampleModels: sample };
  }

  if (provider === 'bytez') {
    const apiKey = overrideKeys.bytez ?? Config.ai.bytez.apiKey;
    const source = keys.source.bytez;
    if (!hasKey(apiKey)) return { provider, ok: false, source, error: 'BYTEZ_API_KEY belum di-set' };
    const authHeaders = [{ Authorization: apiKey }, { Authorization: `Bearer ${apiKey}` }, { Authorization: `Key ${apiKey}` }];
    let data: any | undefined;
    for (const headers of authHeaders) {
      data = await tryFetchAny(
        [
          'https://api.bytez.com/models/v2/list/models?task=chat',
          'https://api.bytez.com/models/v2/list/models',
          'https://api.bytez.com/models',
        ],
        headers as Record<string, string>,
        10000
      );
      if (data) break;
    }
    const out = Array.isArray(data) ? data : Array.isArray(data?.output) ? data.output : Array.isArray(data?.data) ? data.data : undefined;
    if (!out) return { provider, ok: false, source, error: 'Gagal fetch models dari Bytez' };
    const sample = out.slice(0, 5).map((m: any) => ({ id: String(m.modelId ?? m.id ?? ''), name: String(m.modelId ?? m.name ?? m.id ?? '') }));
    return { provider, ok: true, source, modelCount: out.length, sampleModels: sample };
  }

  if (provider === 'sumopod') {
    const apiKey = overrideKeys.sumopod ?? Config.ai.sumopod.apiKey;
    const source = keys.source.sumopod;
    if (!hasKey(apiKey)) return { provider, ok: false, source, error: 'SUMOPOD_API_KEY belum di-set' };
    const data = await tryFetchAny(['https://ai.sumopod.com/v1/models', 'https://ai.sumopod.com/api/v1/models'], { Authorization: `Bearer ${apiKey}` }, 10000);
    if (!data || !Array.isArray(data.data)) {
      const models = await listSumoPodModels();
      return {
        provider,
        ok: true,
        source,
        modelCount: models.length,
        sampleModels: models.slice(0, 5).map((m) => ({ id: m.id, name: m.name })),
        note: 'SumoPod /v1/models belum bisa diakses dari environment ini; memakai fallback list.',
      };
    }
    const models = data.data.map((m: any) => ({ id: String(m.id ?? ''), name: String(m.id ?? m.name ?? '') }));
    return {
      provider,
      ok: true,
      source,
      modelCount: models.length,
      sampleModels: models.slice(0, 5),
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
