function decodeHtml(input: string): string {
  return input
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&nbsp;', ' ');
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function fetchText(url: string, timeoutMs = 10000, retries = 2): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { 'user-agent': 'MyClawAgent/0.1' } });
      return await res.text();
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        await sleep(200 * (attempt + 1));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('fetch failed');
}

export type WebSearchResult = { title: string; url: string; snippet?: string };

export async function webSearchDuckDuckGo(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const q = encodeURIComponent(query);
  const html = await fetchText(`https://duckduckgo.com/html/?q=${q}&kl=us-en`, 12000, 2);

  const results: WebSearchResult[] = [];

  const itemRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>)/gi;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(html))) {
    const url = decodeHtml(m[1] ?? '').trim();
    const titleRaw = (m[2] ?? '').replace(/<[^>]+>/g, '');
    const snippetRaw = (m[3] ?? m[4] ?? '').replace(/<[^>]+>/g, '');

    const title = decodeHtml(titleRaw).trim();
    const snippet = decodeHtml(snippetRaw).trim();

    if (!url || !title) continue;
    results.push({ title, url, snippet: snippet || undefined });
    if (results.length >= maxResults) break;
  }

  return results;
}

export type WebFetchResult = {
  url: string;
  title?: string;
  text?: string;
};

export async function webFetch(url: string, timeoutMs = 12000): Promise<WebFetchResult> {
  const html = await fetchText(url, timeoutMs, 2);

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtml(titleMatch[1].replace(/\s+/g, ' ').trim()) : undefined;

  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const text = body.length > 0 ? decodeHtml(body.slice(0, 4000)) : undefined;
  return { url, title, text };
}
