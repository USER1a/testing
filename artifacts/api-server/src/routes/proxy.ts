import { Router, type IRouter } from "express";

const router: IRouter = Router();

const ALLOWED_CDNS = [
  "hakunaymatata.com",
  "aoneroom.com",
];

function isAllowedUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    return ALLOWED_CDNS.some((host) => u.hostname.endsWith(host));
  } catch {
    return false;
  }
}

/**
 * GET /api/proxy?url=<encoded_cdn_url>
 *
 * Proxies video streams from the MovieBox CDN, injecting the required
 * Referer header so the CDN allows the request.
 * Passes through Range headers so browsers can seek through videos.
 */
router.get("/proxy", async (req, res) => {
  const rawUrl = req.query["url"];

  if (!rawUrl || typeof rawUrl !== "string") {
    res.status(400).json({ error: "Missing url query parameter" });
    return;
  }

  if (!isAllowedUrl(rawUrl)) {
    res.status(403).json({ error: "URL not from an allowed domain" });
    return;
  }

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Referer: "https://themoviebox.org/",
    Origin: "https://themoviebox.org",
  };

  // Forward Range header for video seeking support
  const range = req.headers["range"];
  if (range) {
    headers["Range"] = range;
  }

  try {
    const upstream = await fetch(rawUrl, { headers });

    if (!upstream.ok && upstream.status !== 206) {
      res.status(upstream.status).json({
        error: `Upstream returned ${upstream.status}`,
      });
      return;
    }

    // Pass through the important response headers
    const passthroughHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "last-modified",
      "etag",
    ];
    for (const h of passthroughHeaders) {
      const val = upstream.headers.get(h);
      if (val) res.setHeader(h, val);
    }

    // Override Content-Disposition so browsers play inline, not download
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "no-store");

    res.status(upstream.status);

    if (!upstream.body) {
      res.end();
      return;
    }

    // Stream the body to the browser
    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          break;
        }
        const ok = res.write(value);
        if (!ok) {
          await new Promise((resolve) => res.once("drain", resolve));
        }
      }
    };
    await pump();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: String(err) });
    }
  }
});

export default router;
