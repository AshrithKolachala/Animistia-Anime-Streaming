import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

export function requireClerkAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}