import { Router, Request, Response } from "express";

const router = Router();

const API_BASE = "https://h5-api.aoneroom.com";
const SITE = "https://themoviebox.org";

const MB_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/json",
  "X-Client-Info": JSON.stringify({ timezone: "Africa/Lagos" }),
  "X-Source": "",
  Origin: SITE,
  Referer: `${SITE}/`,
};

router.get("/search", async (req: Request, res: Response) => {
  const q = (req.query.q as string)?.trim();
  const page = parseInt((req.query.page as string) || "1", 10);
  const perPage = Math.min(parseInt((req.query.perPage as string) || "10", 10), 50);

  if (!q) {
    res.status(400).json({ success: false, error: "Missing query parameter: q" });
    return;
  }

  // playerBase: optional override so callers can specify the domain explicitly
  const playerBaseOverride = (req.query.playerBase as string)?.trim();

  const playerBase = playerBaseOverride || (() => {
    // When behind Replit's proxy the real host comes from x-forwarded-host
    const proto =
      (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() ||
      "https";
    const host =
      (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim() ||
      req.headers.origin?.replace(/^https?:\/\//, "") ||
      req.headers.host ||
      "";
    return `${proto}://${host}`;
  })();

  try {
    const mbRes = await fetch(`${API_BASE}/wefeed-h5api-bff/subject/search`, {
      method: "POST",
      headers: MB_HEADERS,
      body: JSON.stringify({ keyword: q, page, perPage, lang: "en" }),
    });

    if (!mbRes.ok) {
      res.status(502).json({ success: false, error: `Upstream error: ${mbRes.status}` });
      return;
    }

    const json = (await mbRes.json()) as {
      code: number;
      data: {
        pager: { totalCount: number; hasMore: boolean };
        items: Array<{
          subjectId: string;
          subjectType: number;
          title: string;
          detailPath: string;
          cover: { url: string } | null;
          releaseDate: string;
          genre: string;
          imdbRatingValue: string;
          subtitles: string;
          duration: number;
          countryName: string;
        }>;
      };
    };

    if (json.code !== 0) {
      res.status(502).json({ success: false, error: "Upstream returned error code" });
      return;
    }

    const results = json.data.items.map((item) => {
      const movieboxUrl = `${SITE}/${item.subjectType === 2 ? "tvshow" : "movies"}/${item.detailPath}?id=${item.subjectId}`;
      const iframeUrl = `${playerBase}/?url=${encodeURIComponent(movieboxUrl)}`;
      return {
        subjectId: item.subjectId,
        subjectType: item.subjectType,
        title: item.title,
        detailPath: item.detailPath,
        coverUrl: item.cover?.url || null,
        releaseDate: item.releaseDate,
        genre: item.genre,
        imdbRating: item.imdbRatingValue,
        subtitles: item.subtitles,
        duration: item.duration,
        country: item.countryName,
        movieboxUrl,
        iframeUrl,
      };
    });

    res.setHeader("Cache-Control", "no-store");
    res.json({
      success: true,
      query: q,
      page,
      perPage,
      total: json.data.pager.totalCount,
      hasMore: json.data.pager.hasMore,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
