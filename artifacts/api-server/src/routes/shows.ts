import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateShowBody,
  CreateShowResponse,
  DeleteShowParams,
  GetHighlightsResponse,
  GetShowParams,
  GetShowResponse,
  ListShowsQueryParams,
  ListShowsResponse,
  UpdateShowBody,
  UpdateShowParams,
  UpdateShowResponse,
} from "@workspace/api-zod";
import { db, showsTable } from "@workspace/db";
import { requireClerkAuth } from "../middlewares/auth";

const router: IRouter = Router();

function slugify(title: string): string {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "show";
  return `${base}-${Date.now().toString(36)}`;
}

router.get("/shows", async (req, res): Promise<void> => {
  const parsed = ListShowsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { query, genre, sourceType } = parsed.data;
  const rows = await db.select().from(showsTable).orderBy(desc(showsTable.createdAt));
  const needle = query?.toLowerCase().trim();
  const filtered = rows.filter((show) => {
    const matchesQuery = !needle || show.title.toLowerCase().includes(needle) || show.synopsis.toLowerCase().includes(needle);
    const matchesGenre = !genre || show.genres.some((item) => item.toLowerCase() === genre.toLowerCase());
    const matchesSource = !sourceType || show.sourceType === sourceType;
    return matchesQuery && matchesGenre && matchesSource;
  });
  res.json(ListShowsResponse.parse(filtered));
});

router.get("/shows/:id", async (req, res): Promise<void> => {
  const params = GetShowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [show] = await db.select().from(showsTable).where(eq(showsTable.id, params.data.id));
  if (!show) {
    res.status(404).json({ error: "Show not found" });
    return;
  }
  res.json(GetShowResponse.parse(show));
});

router.get("/highlights", async (_req, res): Promise<void> => {
  const rows = await db.select().from(showsTable).orderBy(desc(showsTable.createdAt));
  res.json(GetHighlightsResponse.parse({
    featured: rows.filter((show) => show.featured).slice(0, 5),
    trending: rows.slice(0, 6),
    latest: rows.slice(0, 6),
  }));
});

router.post("/shows", requireClerkAuth, async (req, res): Promise<void> => {
  const parsed = CreateShowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  if (data.mediaType === "movie" && data.sourceType === "youtube" && !data.videoUrl) {
    res.status(400).json({ error: "YouTube shows require a video URL" });
    return;
  }
  if (data.mediaType === "movie" && data.sourceType === "uploaded" && !data.videoPath) {
    res.status(400).json({ error: "Uploaded shows require a video path" });
    return;
  }
  const [show] = await db.insert(showsTable).values({
    ...data,
    slug: slugify(data.title),
    episodesCount: data.mediaType === "series" ? 0 : 1,
    videoUrl: data.mediaType === "series" ? null : data.videoUrl,
    videoPath: data.mediaType === "series" ? null : data.videoPath,
  }).returning();
  res.status(201).json(CreateShowResponse.parse(show));
});

router.patch("/shows/:id", requireClerkAuth, async (req, res): Promise<void> => {
  const params = UpdateShowParams.safeParse(req.params);
  const parsed = UpdateShowBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error?.message ?? "Invalid show" });
    return;
  }
  if (parsed.data.mediaType === "movie" && parsed.data.sourceType === "youtube" && !parsed.data.videoUrl) {
    res.status(400).json({ error: "YouTube movies require a video URL" });
    return;
  }
  if (parsed.data.mediaType === "movie" && parsed.data.sourceType === "uploaded" && !parsed.data.videoPath) {
    res.status(400).json({ error: "Uploaded movies require a video path" });
    return;
  }
  if (parsed.data.mediaType === "series") {
    parsed.data.videoUrl = null;
    parsed.data.videoPath = null;
  }
  const [show] = await db.update(showsTable).set(parsed.data).where(eq(showsTable.id, params.data.id)).returning();
  if (!show) {
    res.status(404).json({ error: "Show not found" });
    return;
  }
  res.json(UpdateShowResponse.parse(show));
});

router.delete("/shows/:id", requireClerkAuth, async (req, res): Promise<void> => {
  const params = DeleteShowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [show] = await db.delete(showsTable).where(eq(showsTable.id, params.data.id)).returning();
  if (!show) {
    res.status(404).json({ error: "Show not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;