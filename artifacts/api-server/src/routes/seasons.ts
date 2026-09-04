import { asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateSeasonBody,
  CreateSeasonParams,
  CreateSeasonResponse,
  ListSeasonsParams,
  ListSeasonsResponse,
} from "@workspace/api-zod";
import { db, seasonsTable, showsTable } from "@workspace/db";
import { requireAdminClerkAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/shows/:showId/seasons", async (req, res): Promise<void> => {
  const parsed = ListSeasonsParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await db.select().from(seasonsTable)
    .where(eq(seasonsTable.showId, parsed.data.showId))
    .orderBy(asc(seasonsTable.seasonNumber));
  res.json(ListSeasonsResponse.parse(rows));
});

router.post("/shows/:showId/seasons", requireAdminClerkAuth, async (req, res): Promise<void> => {
  const params = CreateSeasonParams.safeParse(req.params);
  const body = CreateSeasonBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error?.message ?? "Invalid season" });
    return;
  }
  const [show] = await db.select({ id: showsTable.id, mediaType: showsTable.mediaType })
    .from(showsTable)
    .where(eq(showsTable.id, params.data.showId));
  if (!show) {
    res.status(404).json({ error: "Series not found" });
    return;
  }
  if (show.mediaType !== "series") {
    res.status(400).json({ error: "Seasons can only be created for series" });
    return;
  }
  try {
    const [season] = await db.insert(seasonsTable).values({
      showId: params.data.showId,
      seasonNumber: body.data.seasonNumber,
      title: body.data.title ?? "",
    }).returning();
    res.status(201).json(CreateSeasonResponse.parse(season));
  } catch {
    res.status(409).json({ error: "That season already exists" });
  }
});

export default router;