import { Router, type IRouter } from "express";
import { GetStreamsQueryParams } from "@workspace/api-zod";
import { getStreams } from "../lib/moviebox.js";

const router: IRouter = Router();

router.get("/streams", async (req, res) => {
  const parsed = GetStreamsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Missing required query param: url" });
    return;
  }

  const { url, se, ep } = parsed.data;
  if (!url) {
    res.status(400).json({ success: false, error: "Missing required query param: url" });
    return;
  }

  // Never cache — signed stream URLs expire quickly
  res.setHeader("Cache-Control", "no-store");

  try {
    const result = await getStreams(
      url,
      se !== undefined ? Number(se) : undefined,
      ep !== undefined ? Number(ep) : undefined
    );

    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
