import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const showsTable = pgTable("shows", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  synopsis: text("synopsis").notNull(),
  genres: text("genres").array().notNull().default([]),
  year: integer("year").notNull(),
  rating: real("rating").notNull().default(0),
  episodesCount: integer("episodes_count").notNull().default(1),
  thumbnailUrl: text("thumbnail_url"),
  bannerUrl: text("banner_url"),
  sourceType: text("source_type", { enum: ["uploaded", "youtube"] }).notNull(),
  videoUrl: text("video_url"),
  videoPath: text("video_path"),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShowSchema = createInsertSchema(showsTable).omit({
  id: true,
  slug: true,
  createdAt: true,
});

export type InsertShow = z.infer<typeof insertShowSchema>;
export type Show = typeof showsTable.$inferSelect;