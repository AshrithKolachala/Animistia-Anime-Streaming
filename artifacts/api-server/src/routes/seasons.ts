import { Router, type IRouter } from "express";
import {
  CreateSeasonBody,
  CreateSeasonParams,
  CreateSeasonResponse,
  ListSeasonsParams,
  ListSeasonsResponse,
} from "@workspace/api-zod";
import { requireAdminClerkAuth } from "../middlewares/auth";
import {
  createSeason,
  FirestoreConflictError,
  getShow,
  listSeasons,
} from "../lib/firestoreData";

const router: IRouter = Router();

router.get("/shows/:showId/seasons", async (req, res): Promise<void> => {
  const parsed = ListSeasonsParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await listSeasons(parsed.data.showId);
  res.json(ListSeasonsResponse.parse(rows));
});

router.post("/shows/:showId/seasons", requireAdminClerkAuth, async (req, res): Promise<void> => {
  const params = CreateSeasonParams.safeParse(req.params);
  const body = CreateSeasonBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error?.message ?? "Invalid season" });
    return;
  }
  const show = await getShow(params.data.showId);
  if (!show) {
    res.status(404).json({ error: "Series not found" });
    return;
  }
  if (show.mediaType !== "series") {
    res.status(400).json({ error: "Seasons can only be created for series" });
    return;
  }
  try {
    const season = await createSeason({
      showId: params.data.showId,
      seasonNumber: body.data.seasonNumber,
      title: body.data.title ?? "",
    });
    res.status(201).json(CreateSeasonResponse.parse(season));
  } catch (error) {
    if (!(error instanceof FirestoreConflictError)) throw error;
    res.status(409).json({ error: "That season already exists" });
  }
});

export default router;