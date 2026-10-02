import {
  db,
  developerSettingsTable,
  episodesTable,
  pool,
  seasonsTable,
  showsTable,
} from "@workspace/db";
import type { DeveloperSettings, Episode, Season, Show } from "@workspace/db";
import { firestore } from "../lib/firebase";

const importStateRef = firestore.collection("_system").doc("developmentPostgresImport");

async function collectionHasData(name: string): Promise<boolean> {
  const snapshot = await firestore.collection(name).limit(1).get();
  return !snapshot.empty;
}

async function importDevelopmentData() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("This import command can only run with NODE_ENV=development.");
  }

  console.info("Checking development PostgreSQL and Firestore before import...");
  const currentState = await importStateRef.get();
  if (currentState.get("status") === "completed") {
    console.info("Development PostgreSQL data was already imported; no changes made.");
    return;
  }

  if (!currentState.exists) {
    const existingCollections = [
      "shows",
      "seasons",
      "episodes",
      "developerSettings",
      "seasonUniqueKeys",
      "episodeUniqueKeys",
    ];
    for (const name of existingCollections) {
      if (await collectionHasData(name)) {
        throw new Error(
          `Firestore collection "${name}" is not empty. Import stopped to avoid overwriting existing Firebase data.`,
        );
      }
    }
  }

  const [shows, seasons, episodes, settings]: [
    Show[],
    Season[],
    Episode[],
    DeveloperSettings[],
  ] = await Promise.all([
    db.select().from(showsTable),
    db.select().from(seasonsTable),
    db.select().from(episodesTable),
    db.select().from(developerSettingsTable),
  ]);

  const seasonIds = new Set(seasons.map((season) => season.id));
  if (episodes.some((episode) => !seasonIds.has(episode.seasonId))) {
    throw new Error("Development database contains episodes without a matching season; import stopped.");
  }
  const showIds = new Set(shows.map((show) => show.id));
  if (seasons.some((season) => !showIds.has(season.showId))) {
    throw new Error("Development database contains seasons without a matching show; import stopped.");
  }

  await importStateRef.set({
    status: "importing",
    source: "development-postgresql",
    startedAt: new Date(),
    counts: {
      shows: shows.length,
      seasons: seasons.length,
      episodes: episodes.length,
      developerSettings: settings.length,
    },
  });

  const writer = firestore.bulkWriter();
  const writes: Promise<unknown>[] = [];
  for (const show of shows) {
    writes.push(writer.set(firestore.collection("shows").doc(String(show.id)), show));
  }
  for (const season of seasons) {
    writes.push(writer.set(firestore.collection("seasons").doc(String(season.id)), season));
    writes.push(writer.set(
      firestore.collection("seasonUniqueKeys").doc(
        `season-${season.showId}-${season.seasonNumber}`,
      ),
      { recordId: season.id },
    ));
  }
  for (const episode of episodes) {
    writes.push(writer.set(firestore.collection("episodes").doc(String(episode.id)), episode));
    writes.push(writer.set(
      firestore.collection("episodeUniqueKeys").doc(
        `episode-${episode.seasonId}-${episode.episodeNumber}`,
      ),
      { recordId: episode.id },
    ));
  }
  for (const setting of settings) {
    writes.push(writer.set(
      firestore.collection("developerSettings").doc(String(setting.id)),
      setting,
    ));
  }

  try {
    await Promise.all(writes);
    await writer.close();

    const counters = {
      shows: Math.max(0, ...shows.map((show) => show.id)),
      seasons: Math.max(0, ...seasons.map((season) => season.id)),
      episodes: Math.max(0, ...episodes.map((episode) => episode.id)),
    };
    await firestore.collection("_system").doc("idCounters").set(counters, { merge: true });
    await importStateRef.set({
      status: "completed",
      completedAt: new Date(),
      counts: {
        shows: shows.length,
        seasons: seasons.length,
        episodes: episodes.length,
        developerSettings: settings.length,
      },
    }, { merge: true });

    const [showCount, seasonCount, episodeCount] = await Promise.all([
      firestore.collection("shows").get(),
      firestore.collection("seasons").get(),
      firestore.collection("episodes").get(),
    ]);
    if (
      showCount.size !== shows.length ||
      seasonCount.size !== seasons.length ||
      episodeCount.size !== episodes.length
    ) {
      throw new Error("Firestore record counts do not match the development database after import.");
    }

    console.info(
      `Firestore import verified: ${shows.length} shows, ${seasons.length} seasons, ${episodes.length} episodes, ${settings.length} settings.`,
    );
  } catch (error) {
    await importStateRef.set({
      status: "failed",
      failedAt: new Date(),
    }, { merge: true });
    throw error;
  }
}

const keepAlive = setInterval(() => undefined, 1_000);
try {
  await importDevelopmentData();
} catch (error) {
  console.error("Development data import failed:", error);
  process.exitCode = 1;
} finally {
  clearInterval(keepAlive);
  await pool.end();
}