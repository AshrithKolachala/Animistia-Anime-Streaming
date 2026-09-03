import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const developerSettingsTable = pgTable("developer_settings", {
  id: integer("id").primaryKey().default(1),
  lockEnabled: boolean("lock_enabled").notNull().default(true),
  passwordHash: text("password_hash"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeveloperSettingsSchema = createInsertSchema(developerSettingsTable).omit({
  updatedAt: true,
});

export type InsertDeveloperSettings = z.infer<typeof insertDeveloperSettingsSchema>;
export type DeveloperSettings = typeof developerSettingsTable.$inferSelect;