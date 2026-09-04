import { asc, eq, count } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateEpisodeBody,
  CreateEpisodeParams,
  CreateEpisodeResponse,
  DeleteEpisodeParams,
  ListEpisodesParams,
  ListEpisodesResponse,
} from "@workspace/api-zod";
import { db, episodesTable, seasonsTable, showsTable } from "@workspace/db";
import { requireClerkAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/seasons/:seasonId/episodes", async (req, res): Promise<void> => {
  const parsed = ListEpisodesParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await db.select().from(episodesTable)
    .where(eq(episodesTable.seasonId, parsed.data.seasonId))
    .orderBy(asc(episodesTable.episodeNumber));
  res.json(ListEpisodesResponse.parse(rows));
});

router.post("/seasons/:seasonId/episodes", requireClerkAuth, async (req, res): Promise<void> => {
  const params = CreateEpisodeParams.safeParse(req.params);
  const body = CreateEpisodeBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error?.message ?? "Invalid episode" });
    return;
  }
  const [season] = await db.select({
    id: seasonsTable.id,
    showId: seasonsTable.showId,
    mediaType: showsTable.mediaType,
  }).from(seasonsTable)
    .innerJoin(showsTable, eq(showsTable.id, seasonsTable.showId))
    .where(eq(seasonsTable.id, params.data.seasonId));
  if (!season) {
    res.status(404).json({ error: "Season not found" });
    return;
  }
  if (season.mediaType !== "series") {
    res.status(400).json({ error: "Episodes can only be added to series" });
    return;
  }
  if (body.data.sourceType === "youtube" && !body.data.videoUrl) {
    res.status(400).json({ error: "YouTube episodes require a video URL" });
    return;
  }
  if (body.data.sourceType === "uploaded" && !body.data.videoPath) {
    res.status(400).json({ error: "Uploaded episodes require a video path" });
    return;
  }
  try {
    const [episode] = await db.insert(episodesTable).values({
      seasonId: params.data.seasonId,
      episodeNumber: body.data.episodeNumber,
      title: body.data.title,
      synopsis: body.data.synopsis,
      sourceType: body.data.sourceType,
      videoUrl: body.data.videoUrl ?? null,
      videoPath: body.data.videoPath ?? null,
    }).returning();
    const [{ value: episodeCount }] = await db.select({ value: count() }).from(episodesTable).where(eq(episodesTable.seasonId, params.data.seasonId));
    await db.update(showsTable).set({ episodesCount: Number(episodeCount) }).where(eq(showsTable.id, season.showId));
    res.status(201).json(CreateEpisodeResponse.parse(episode));
  } catch {
    res.status(409).json({ error: "That episode number already exists in this season" });
  }
});

router.delete("/episodes/:id", requireClerkAuth, async (req, res): Promise<void> => {
  const params = DeleteEpisodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [episode] = await db.delete(episodesTable).where(eq(episodesTable.id, params.data.id)).returning();
  if (!episode) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }
  const [season] = await db.select().from(seasonsTable).where(eq(seasonsTable.id, episode.seasonId));
  if (season) {
    const [{ value: episodeCount }] = await db.select({ value: count() }).from(episodesTable).where(eq(episodesTable.seasonId, season.id));
    await db.update(showsTable).set({ episodesCount: Number(episodeCount) }).where(eq(showsTable.id, season.showId));
  }
  res.sendStatus(204);
});

export default router;