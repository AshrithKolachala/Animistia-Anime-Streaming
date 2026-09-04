import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { seasonsTable } from "./seasons";

export const episodesTable = pgTable("episodes", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().references(() => seasonsTable.id, { onDelete: "cascade" }),
  episodeNumber: integer("episode_number").notNull(),
  title: text("title").notNull(),
  synopsis: text("synopsis").notNull().default(""),
  sourceType: text("source_type", { enum: ["uploaded", "youtube"] }).notNull(),
  videoUrl: text("video_url"),
  videoPath: text("video_path"),
  captionsPath: text("captions_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  seasonEpisodeUnique: unique("episodes_season_id_episode_number_unique").on(table.seasonId, table.episodeNumber),
}));

export const insertEpisodeSchema = createInsertSchema(episodesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;
export type Episode = typeof episodesTable.$inferSelect;