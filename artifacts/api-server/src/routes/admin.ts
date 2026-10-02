import { Router, type IRouter } from "express";
import {
  GetDeveloperLockResponse,
  UpdateDeveloperLockBody,
  UpdateDeveloperLockResponse,
  VerifyDeveloperLockBody,
  VerifyDeveloperLockResponse,
} from "@workspace/api-zod";
import { hashPassword, verifyPassword } from "../lib/password";
import { requireAdminClerkAuth } from "../middlewares/auth";
import {
  getDeveloperSettings,
  updateDeveloperSettings,
} from "../lib/firestoreData";

const router: IRouter = Router();

async function getSettings() {
  return getDeveloperSettings();
}

router.get("/admin/lock", requireAdminClerkAuth, async (_req, res): Promise<void> => {
  const settings = await getSettings();
  res.json(GetDeveloperLockResponse.parse({
    enabled: settings.lockEnabled,
    configured: Boolean(settings.passwordHash),
  }));
});

router.put("/admin/lock", requireAdminClerkAuth, async (req, res): Promise<void> => {
  const parsed = UpdateDeveloperLockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const current = await getSettings();
  const updated = await updateDeveloperSettings({
    lockEnabled: parsed.data.enabled,
    passwordHash: parsed.data.password ? hashPassword(parsed.data.password) : current.passwordHash,
  });
  res.json(UpdateDeveloperLockResponse.parse({
    enabled: updated.lockEnabled,
    configured: Boolean(updated.passwordHash),
  }));
});

router.post("/admin/lock/verify", requireAdminClerkAuth, async (req, res): Promise<void> => {
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