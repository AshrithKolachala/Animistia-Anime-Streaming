import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { showsTable } from "./shows";

export const seasonsTable = pgTable("seasons", {
  id: serial("id").primaryKey(),
  showId: integer("show_id").notNull().references(() => showsTable.id, { onDelete: "cascade" }),
  seasonNumber: integer("season_number").notNull(),
  title: text("title").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  showSeasonUnique: unique("seasons_show_id_season_number_unique").on(table.showId, table.seasonNumber),
}));

export const insertSeasonSchema = createInsertSchema(seasonsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type Season = typeof seasonsTable.$inferSelect;