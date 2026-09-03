import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetDeveloperLockResponse,
  UpdateDeveloperLockBody,
  UpdateDeveloperLockResponse,
  VerifyDeveloperLockBody,
  VerifyDeveloperLockResponse,
} from "@workspace/api-zod";
import { db, developerSettingsTable } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/password";
import { requireClerkAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function getSettings() {
  const [existing] = await db.select().from(developerSettingsTable).where(eq(developerSettingsTable.id, 1));
  if (existing) return existing;
  const [created] = await db.insert(developerSettingsTable).values({ id: 1 }).returning();
  return created;
}

router.get("/admin/lock", requireClerkAuth, async (_req, res): Promise<void> => {
  const settings = await getSettings();
  res.json(GetDeveloperLockResponse.parse({
    enabled: settings.lockEnabled,
    configured: Boolean(settings.passwordHash),
  }));
});

router.put("/admin/lock", requireClerkAuth, async (req, res): Promise<void> => {
  const parsed = UpdateDeveloperLockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const current = await getSettings();
  const [updated] = await db.update(developerSettingsTable).set({
    lockEnabled: parsed.data.enabled,
    passwordHash: parsed.data.password ? hashPassword(parsed.data.password) : current.passwordHash,
    updatedAt: new Date(),
  }).where(eq(developerSettingsTable.id, 1)).returning();
  res.json(UpdateDeveloperLockResponse.parse({
    enabled: updated.lockEnabled,
    configured: Boolean(updated.passwordHash),
  }));
});

router.post("/admin/lock/verify", requireClerkAuth, async (req, res): Promise<void> => {
  const parsed = VerifyDeveloperLockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const settings = await getSettings();
  const verified = !settings.lockEnabled || Boolean(settings.passwordHash && verifyPassword(parsed.data.password, settings.passwordHash));
  res.json(VerifyDeveloperLockResponse.parse({ verified }));
});

export default router;