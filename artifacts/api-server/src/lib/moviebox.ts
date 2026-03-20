/**
 * MovieBox stream fetcher — Node.js port of the Python scraper.
 *
 * KEY DISCOVERY:
 *   The `id=` param in a MovieBox URL can be a stream resource ID, NOT the
 *   real subjectId. We always extract the real subjectId from __NUXT_DATA__.
 */

const SITE_BASE = "https://themoviebox.org";
const API_BASE = "https://h5-api.aoneroom.com";
const PLAY_ENDPOINT = `${API_BASE}/wefeed-h5api-bff/subject/play`;

const BASE_API_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Client-Info": JSON.stringify({ timezone: "Africa/Lagos" }),
  "X-Source": "",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Origin: SITE_BASE,
};

const HTML_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${SITE_BASE}/`,
};

export interface Stream {
  id: string;
  format: string;
  url: string;
  resolutions: string;
  size: string;
  duration: number;
  codecName: string;
}

export interface StreamResult {
  success: boolean;
  subjectId: string;
  slug: string;
  title: string;
  coverUrl: string;
  se: number;
  ep: number;
  streams: Stream[];
  hls: string[];
  dash: string[];
  freeNum: number;
  limited: boolean;
}

export interface StreamError {
  success: false;
  error: string;
}

function parseSlug(movieUrl: string): string | null {
  const m = movieUrl.match(/\/movies\/([^/?#]+)/);
  return m ? m[1] : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveRaw(raw: any[], idx: number | unknown): unknown {
  if (typeof idx === "number" && idx < raw.length) return raw[idx];
  return idx;
}

async function fetchPageData(movieUrl: string): Promise<{
  subjectId: string;
  slug: string;
  hasResource: boolean;
  seasons: { se: number; maxEp: number }[];
  title: string;
  coverUrl: string;
}> {
  const slug = parseSlug(movieUrl);
  if (!slug) throw new Error(`Could not extract slug from URL: ${movieUrl}`);

  const resp = await fetch(movieUrl, { headers: HTML_HEADERS });
  if (!resp.ok) throw new Error(`Page fetch failed: ${resp.status}`);
  const html = await resp.text();

  const nuxtMatch = html.match(
    /<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/
  );
  if (!nuxtMatch) throw new Error("Could not find __NUXT_DATA__ in page HTML");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = JSON.parse(nuxtMatch[1].trim());

  let subjectId = "";
  let hasResource = false;
  let title = "";
  let coverUrl = "";
  const seasons: { se: number; maxEp: number }[] = [];

  // Find subject info
  for (const entry of raw) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      !Array.isArray(entry) &&
      "subjectId" in entry &&
      "hasResource" in entry &&
      "detailPath" in entry
    ) {
      subjectId = String(resolveRaw(raw, entry.subjectId) ?? "");
      hasResource = Boolean(resolveRaw(raw, entry.hasResource));
      title = String(resolveRaw(raw, entry.title) ?? "");
      // cover -> url
      const coverObj = resolveRaw(raw, entry.cover);
      if (
        typeof coverObj === "object" &&
        coverObj !== null &&
        !Array.isArray(coverObj) &&
        "url" in (coverObj as object)
      ) {
        coverUrl = String(
          resolveRaw(raw, (coverObj as Record<string, unknown>)["url"]) ?? ""
        );
      }
      break;
    }
  }

  // Find resource/seasons
  for (const entry of raw) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      !Array.isArray(entry) &&
      "seasons" in entry &&
      "source" in entry
    ) {
      const seasonsIdx = (entry as Record<string, unknown>)["seasons"];
      const seasonsRaw = resolveRaw(raw, seasonsIdx);
      if (Array.isArray(seasonsRaw)) {
        for (const sIdx of seasonsRaw) {
          const s = resolveRaw(raw, sIdx);
          if (
            typeof s === "object" &&
            s !== null &&
            !Array.isArray(s) &&
            "se" in (s as object)
          ) {
            const sr = s as Record<string, unknown>;
            const se = Number(resolveRaw(raw, sr["se"]) ?? 0);
            const maxEp = Number(resolveRaw(raw, sr["maxEp"]) ?? 0);
            seasons.push({ se, maxEp });
          }
        }
      }
      break;
    }
  }

  return { subjectId, slug, hasResource, seasons, title, coverUrl };
}

function buildCandidates(
  seasons: { se: number; maxEp: number }[]
): [number, number][] {
  if (!seasons.length) return [[0, 0]];
  const candidates: [number, number][] = [];
  for (const { se, maxEp } of seasons) {
    const count = Math.max(maxEp, 1);
    for (let ep = 0; ep < count; ep++) {
      candidates.push([se, ep]);
    }
  }
  return candidates.length ? candidates : [[0, 0]];
}

async function fetchPlay(
  subjectId: string,
  slug: string,
  pageUrl: string,
  se: number,
  ep: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const params = new URLSearchParams({
    subjectId,
    se: String(se),
    ep: String(ep),
    detailPath: slug,
    lang: "en",
  });
  const resp = await fetch(`${PLAY_ENDPOINT}?${params}`, {
    headers: { ...BASE_API_HEADERS, Referer: pageUrl },
  });
  if (!resp.ok) throw new Error(`Play API error: ${resp.status}`);
  return resp.json();
}

export async function getStreams(
  movieUrl: string,
  se?: number,
  ep?: number
): Promise<StreamResult | StreamError> {
  let pageInfo: Awaited<ReturnType<typeof fetchPageData>>;
  try {
    pageInfo = await fetchPageData(movieUrl);
  } catch (err) {
    return { success: false, error: String(err) };
  }

  const { subjectId, slug, hasResource, seasons, title, coverUrl } = pageInfo;

  if (!subjectId) {
    return { success: false, error: "Could not extract subjectId from page" };
  }
  if (!hasResource) {
    return { success: false, error: "Movie has no available resource" };
  }

  const candidates: [number, number][] =
    se !== undefined && ep !== undefined
      ? [[se, ep]]
      : buildCandidates(seasons);

  for (const [trySe, tryEp] of candidates) {
    let data: ReturnType<typeof fetchPlay> extends Promise<infer T> ? T : never;
    try {
      data = await fetchPlay(subjectId, slug, movieUrl, trySe, tryEp);
    } catch {
      continue;
    }

    const d = (data as { data?: Record<string, unknown> })?.data ?? {};
    if (d["hasResource"] && Array.isArray(d["streams"]) && (d["streams"] as unknown[]).length > 0) {
      return {
        success: true,
        subjectId,
        slug,
        title,
        coverUrl,
        se: trySe,
        ep: tryEp,
        streams: d["streams"] as Stream[],
        hls: (d["hls"] as string[]) ?? [],
        dash: (d["dash"] as string[]) ?? [],
        freeNum: Number(d["freeNum"] ?? 999),
        limited: Boolean(d["limited"]),
      };
    }
  }

  return {
    success: false,
    error: "No streams found for any se/ep combination tried.",
  };
}
