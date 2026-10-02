import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  CreateEpisodeBody,
  CreateEpisodeParams,
  CreateEpisodeResponse,
  DeleteEpisodeParams,
  ListEpisodesParams,
  ListEpisodesResponse,
  UpdateEpisodeBody,
  UpdateEpisodeParams,
  UpdateEpisodeResponse,
} from "@workspace/api-zod";
import { requireAdminClerkAuth } from "../middlewares/auth";
import {
  createEpisode,
  deleteEpisode,
  FirestoreConflictError,
  getSeason,
  getShow,
  listEpisodes,
  updateEpisode,
} from "../lib/firestoreData";

const router: IRouter = Router();

router.get("/seasons/:seasonId/episodes", async (req, res): Promise<void> => {
  const parsed = ListEpisodesParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.setHeader("Cache-Control", "private, no-store");
  res.vary("Cookie");
  const season = await getSeason(parsed.data.seasonId);
  const signedIn = Boolean(getAuth(req).userId);
  const rows = await listEpisodes(parsed.data.seasonId);
  const visibleRows = rows.map((episode) => {
    const isFreePreview =
      season?.seasonNumber === 1 && episode.episodeNumber === 1;
    if (signedIn || isFreePreview) return episode;
    return {
      ...episode,
      videoUrl: null,
      videoPath: null,
      captionsPath: null,
    };
  });
  res.json(ListEpisodesResponse.parse(visibleRows));
});

router.post("/seasons/:seasonId/episodes", requireAdminClerkAuth, async (req, res): Promise<void> => {
  const params = CreateEpisodeParams.safeParse(req.params);
  const body = CreateEpisodeBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error?.message ?? "Invalid episode" });
    return;
  }
  const season = await getSeason(params.data.seasonId);
  if (!season) {
    res.status(404).json({ error: "Season not found" });
    return;
  }
  const show = await getShow(season.showId);
  if (!show || show.mediaType !== "series") {
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
    const episode = await createEpisode({
      seasonId: params.data.seasonId,
      episodeNumber: body.data.episodeNumber,
      title: body.data.title,
      synopsis: body.data.synopsis,
      sourceType: body.data.sourceType,
      videoUrl: body.data.videoUrl ?? null,
      videoPath: body.data.videoPath ?? null,
      captionsPath: body.data.captionsPath ?? null,
    });
    res.status(201).json(CreateEpisodeResponse.parse(episode));
  } catch (error) {
    if (!(error instanceof FirestoreConflictError)) throw error;
    res.status(409).json({ error: "That episode number already exists in this season" });
  }
});

router.patch("/episodes/:id", requireAdminClerkAuth, async (req, res): Promise<void> => {
  const params = UpdateEpisodeParams.safeParse(req.params);
  const body = UpdateEpisodeBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error?.message ?? "Invalid episode" });
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
    const episode = await updateEpisode(params.data.id, {
      episodeNumber: body.data.episodeNumber,
      title: body.data.title,
      synopsis: body.data.synopsis,
      sourceType: body.data.sourceType,
      videoUrl: body.data.videoUrl ?? null,
      videoPath: body.data.videoPath ?? null,
      captionsPath: body.data.captionsPath ?? null,
    });
    if (!episode) {
      res.status(404).json({ error: "Episode not found" });
      return;
    }
    res.json(UpdateEpisodeResponse.parse(episode));
  } catch (error) {
    if (!(error instanceof FirestoreConflictError)) throw error;
    res.status(409).json({ error: "That episode number already exists in this season" });
  }
});

router.delete("/episodes/:id", requireAdminClerkAuth, async (req, res): Promise<void> => {
  const params = DeleteEpisodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const episode = await deleteEpisode(params.data.id);
  if (!episode) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;