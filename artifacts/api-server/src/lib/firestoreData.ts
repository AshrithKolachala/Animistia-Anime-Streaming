import type { DeveloperSettings, Episode, Season, Show } from "@workspace/db";
import {
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type Transaction,
} from "firebase-admin/firestore";
import { firestore } from "./firebase";

const shows = firestore.collection("shows");
const seasons = firestore.collection("seasons");
const episodes = firestore.collection("episodes");
const developerSettings = firestore.collection("developerSettings");
const system = firestore.collection("_system");
const countersRef = system.doc("idCounters");

type CollectionName = "shows" | "seasons" | "episodes";

export class FirestoreConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirestoreConflictError";
  }
}

function normalizeRecord<T>(snapshot: DocumentSnapshot<DocumentData>): T | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (!data) return null;

  for (const field of ["createdAt", "updatedAt"]) {
    const value = data[field];
    if (value instanceof Timestamp) data[field] = value.toDate();
  }

  return data as T;
}

function uniqueSeasonKey(showId: number, seasonNumber: number) {
  return `season-${showId}-${seasonNumber}`;
}

function uniqueEpisodeKey(seasonId: number, episodeNumber: number) {
  return `episode-${seasonId}-${episodeNumber}`;
}

async function nextIdInTransaction(
  transaction: Transaction,
  name: CollectionName,
): Promise<number> {
  const counterSnapshot = await transaction.get(countersRef);
  const stored = Number(counterSnapshot.get(name) ?? 0);
  if (stored > 0) return stored + 1;

  const collection = name === "shows" ? shows : name === "seasons" ? seasons : episodes;
  const existing = await transaction.get(collection.orderBy("id", "desc").limit(1));
  const maximum = existing.docs.reduce(
    (current, document) => Math.max(current, Number(document.get("id") ?? 0)),
    0,
  );
  return maximum + 1;
}

export async function listShows(): Promise<Show[]> {
  const snapshot = await shows.get();
  return snapshot.docs
    .map((document) => normalizeRecord<Show>(document)!)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

export async function getShow(id: number): Promise<Show | null> {
  return normalizeRecord<Show>(await shows.doc(String(id)).get());
}

export async function createShow(data: Omit<Show, "id" | "createdAt">): Promise<Show> {
  return firestore.runTransaction(async (transaction) => {
    const id = await nextIdInTransaction(transaction, "shows");
    const show: Show = { ...data, id, createdAt: new Date() };
    transaction.set(countersRef, { shows: id }, { merge: true });
    transaction.create(shows.doc(String(id)), show);
    return show;
  });
}

export async function updateShow(
  id: number,
  patch: Partial<Omit<Show, "id" | "createdAt">>,
): Promise<Show | null> {
  return firestore.runTransaction(async (transaction) => {
    const reference = shows.doc(String(id));
    const current = normalizeRecord<Show>(await transaction.get(reference));
    if (!current) return null;
    const updated = { ...current, ...patch };
    transaction.set(reference, patch, { merge: true });
    return updated;
  });
}

export async function deleteShow(id: number): Promise<Show | null> {
  const show = await getShow(id);
  if (!show) return null;

  const seasonSnapshot = await seasons.where("showId", "==", id).get();
  const seasonRecords = seasonSnapshot.docs
    .map((document) => normalizeRecord<Season>(document)!)
    .filter(Boolean);
  const seasonIds = new Set(seasonRecords.map((season) => season.id));
  const episodeSnapshot = await episodes.get();
  const episodeRecords = episodeSnapshot.docs
    .map((document) => normalizeRecord<Episode>(document)!)
    .filter((episode) => seasonIds.has(episode.seasonId));

  const writer = firestore.bulkWriter();
  for (const episode of episodeRecords) {
    writer.delete(episodes.doc(String(episode.id)));
    writer.delete(firestore.collection("episodeUniqueKeys").doc(
      uniqueEpisodeKey(episode.seasonId, episode.episodeNumber),
    ));
  }
  for (const season of seasonRecords) {
    writer.delete(seasons.doc(String(season.id)));
    writer.delete(firestore.collection("seasonUniqueKeys").doc(
      uniqueSeasonKey(season.showId, season.seasonNumber),
    ));
  }
  writer.delete(shows.doc(String(id)));
  await writer.close();
  return show;
}

export async function listSeasons(showId: number): Promise<Season[]> {
  const snapshot = await seasons.where("showId", "==", showId).get();
  return snapshot.docs
    .map((document) => normalizeRecord<Season>(document)!)
    .sort((left, right) => left.seasonNumber - right.seasonNumber);
}

export async function getSeason(id: number): Promise<Season | null> {
  return normalizeRecord<Season>(await seasons.doc(String(id)).get());
}

export async function createSeason(data: {
  showId: number;
  seasonNumber: number;
  title: string;
}): Promise<Season> {
  return firestore.runTransaction(async (transaction) => {
    const showReference = shows.doc(String(data.showId));
    const uniqueReference = firestore.collection("seasonUniqueKeys")
      .doc(uniqueSeasonKey(data.showId, data.seasonNumber));
    const [showSnapshot, uniqueSnapshot] = await Promise.all([
      transaction.get(showReference),
      transaction.get(uniqueReference),
    ]);
    if (!showSnapshot.exists) throw new Error("Series not found");
    if (uniqueSnapshot.exists) throw new FirestoreConflictError("That season already exists");

    const id = await nextIdInTransaction(transaction, "seasons");
    const season: Season = { ...data, id, createdAt: new Date() };
    transaction.set(countersRef, { seasons: id }, { merge: true });
    transaction.create(seasons.doc(String(id)), season);
    transaction.create(uniqueReference, { recordId: id });
    return season;
  });
}

export async function listEpisodes(seasonId: number): Promise<Episode[]> {
  const snapshot = await episodes.where("seasonId", "==", seasonId).get();
  return snapshot.docs
    .map((document) => normalizeRecord<Episode>(document)!)
    .sort((left, right) => left.episodeNumber - right.episodeNumber);
}

export async function isFreeEpisodeAsset(objectPath: string): Promise<boolean | null> {
  const [videoMatches, captionMatches] = await Promise.all([
    episodes.where("videoPath", "==", objectPath).get(),
    episodes.where("captionsPath", "==", objectPath).get(),
  ]);
  const matches = new Map<string, Episode>();
  for (const document of [...videoMatches.docs, ...captionMatches.docs]) {
    const episode = normalizeRecord<Episode>(document);
    if (episode) matches.set(String(episode.id), episode);
  }
  if (matches.size === 0) return null;

  const seasonNumbers = new Map<number, number | null>();
  await Promise.all(
    [...new Set([...matches.values()].map((episode) => episode.seasonId))].map(
      async (seasonId) => {
        const season = await getSeason(seasonId);
        seasonNumbers.set(seasonId, season?.seasonNumber ?? null);
      },
    ),
  );

  const includesFreeEpisode = [...matches.values()].some(
    (episode) =>
      episode.episodeNumber === 1 && seasonNumbers.get(episode.seasonId) === 1,
  );
  return includesFreeEpisode;
}

export async function getEpisode(id: number): Promise<Episode | null> {
  return normalizeRecord<Episode>(await episodes.doc(String(id)).get());
}

export async function createEpisode(data: Omit<Episode, "id" | "createdAt">): Promise<Episode> {
  return firestore.runTransaction(async (transaction) => {
    const seasonReference = seasons.doc(String(data.seasonId));
    const seasonSnapshot = await transaction.get(seasonReference);
    if (!seasonSnapshot.exists) throw new Error("Season not found");

    const showReference = shows.doc(String(seasonSnapshot.get("showId")));
    const uniqueReference = firestore.collection("episodeUniqueKeys")
      .doc(uniqueEpisodeKey(data.seasonId, data.episodeNumber));
    const [showSnapshot, uniqueSnapshot] = await Promise.all([
      transaction.get(showReference),
      transaction.get(uniqueReference),
    ]);
    if (!showSnapshot.exists) throw new Error("Series not found");
    if (uniqueSnapshot.exists) {
      throw new FirestoreConflictError("That episode number already exists in this season");
    }

    const id = await nextIdInTransaction(transaction, "episodes");
    const seasonEpisodes = await transaction.get(
      episodes.where("seasonId", "==", data.seasonId),
    );
    const episode: Episode = { ...data, id, createdAt: new Date() };
    transaction.set(countersRef, { episodes: id }, { merge: true });
    transaction.create(episodes.doc(String(id)), episode);
    transaction.create(uniqueReference, { recordId: id });
    transaction.set(
      showReference,
      { episodesCount: seasonEpisodes.size + 1 },
      { merge: true },
    );
    return episode;
  });
}

export async function updateEpisode(
  id: number,
  patch: Pick<Episode, "episodeNumber" | "title" | "synopsis" | "sourceType" | "videoUrl" | "videoPath" | "captionsPath">,
): Promise<Episode | null> {
  return firestore.runTransaction(async (transaction) => {
    const reference = episodes.doc(String(id));
    const current = normalizeRecord<Episode>(await transaction.get(reference));
    if (!current) return null;

    const oldUniqueReference = firestore.collection("episodeUniqueKeys")
      .doc(uniqueEpisodeKey(current.seasonId, current.episodeNumber));
    const newUniqueReference = firestore.collection("episodeUniqueKeys")
      .doc(uniqueEpisodeKey(current.seasonId, patch.episodeNumber));
    const newUniqueSnapshot = oldUniqueReference.path === newUniqueReference.path
      ? null
      : await transaction.get(newUniqueReference);
    if (newUniqueSnapshot?.exists && Number(newUniqueSnapshot.get("recordId")) !== id) {
      throw new FirestoreConflictError("That episode number already exists in this season");
    }

    if (oldUniqueReference.path !== newUniqueReference.path) {
      transaction.delete(oldUniqueReference);
      transaction.set(newUniqueReference, { recordId: id });
    }
    transaction.set(reference, patch, { merge: true });
    return { ...current, ...patch };
  });
}

export async function deleteEpisode(id: number): Promise<Episode | null> {
  return firestore.runTransaction(async (transaction) => {
    const reference = episodes.doc(String(id));
    const current = normalizeRecord<Episode>(await transaction.get(reference));
    if (!current) return null;

    const seasonReference = seasons.doc(String(current.seasonId));
    const seasonSnapshot = await transaction.get(seasonReference);
    const remaining = await transaction.get(
      episodes.where("seasonId", "==", current.seasonId),
    );
    transaction.delete(reference);
    transaction.delete(
      firestore.collection("episodeUniqueKeys")
        .doc(uniqueEpisodeKey(current.seasonId, current.episodeNumber)),
    );

    if (seasonSnapshot.exists) {
      const showId = Number(seasonSnapshot.get("showId"));
      transaction.set(
        shows.doc(String(showId)),
        { episodesCount: Math.max(0, remaining.size - 1) },
        { merge: true },
      );
    }
    return current;
  });
}

export async function getDeveloperSettings(): Promise<DeveloperSettings> {
  const reference = developerSettings.doc("1");
  return firestore.runTransaction(async (transaction) => {
    const existing = normalizeRecord<DeveloperSettings>(await transaction.get(reference));
    if (existing) return existing;
    const created: DeveloperSettings = {
      id: 1,
      lockEnabled: true,
      passwordHash: null,
      updatedAt: new Date(),
    };
    transaction.create(reference, created);
    return created;
  });
}

export async function updateDeveloperSettings(
  patch: Pick<DeveloperSettings, "lockEnabled" | "passwordHash">,
): Promise<DeveloperSettings> {
  const reference = developerSettings.doc("1");
  const updatedAt = new Date();
  await reference.set({ id: 1, ...patch, updatedAt }, { merge: true });
  return (await getDeveloperSettings());
}

export { firestore };