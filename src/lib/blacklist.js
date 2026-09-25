import { connectDB } from "./db";
import Blacklist from "@/models/Blacklist";

// In-memory cache for fast lookups without querying MongoDB on every request
let cache = {
  movie: new Set(),
  tv: new Set(),
  person: new Set(),
  lastFetched: 0,
};

const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

export function invalidateBlacklistCache() {
  cache.lastFetched = 0;
}

export async function getActiveBlacklistSets() {
  const now = Date.now();
  if (now - cache.lastFetched < CACHE_TTL_MS && cache.lastFetched > 0) {
    return cache;
  }

  try {
    await connectDB();
    const activeItems = await Blacklist.find(
      { isActive: true },
      { tmdbId: 1, mediaType: 1 }
    ).lean();

    const movieSet = new Set();
    const tvSet = new Set();
    const personSet = new Set();

    for (const item of activeItems) {
      if (item.tmdbId) {
        const idNum = Number(item.tmdbId);
        if (item.mediaType === "movie") movieSet.add(idNum);
        else if (item.mediaType === "tv") tvSet.add(idNum);
        else if (item.mediaType === "person") personSet.add(idNum);
      }
    }

    cache = {
      movie: movieSet,
      tv: tvSet,
      person: personSet,
      lastFetched: now,
    };
  } catch (error) {
    console.error("Failed to load blacklist cache from MongoDB:", error);
    // Return stale cache if error occurs
  }

  return cache;
}

export async function isItemBlacklisted(tmdbId, mediaType) {
  if (!tmdbId || !mediaType) return false;
  const sets = await getActiveBlacklistSets();
  const idNum = Number(tmdbId);
  if (isNaN(idNum)) return false;

  const targetSet = sets[mediaType];
  return targetSet ? targetSet.has(idNum) : false;
}

export async function filterBlacklistedMovies(movies = []) {
  if (!Array.isArray(movies) || movies.length === 0) return [];
  const sets = await getActiveBlacklistSets();
  const banned = sets.movie;
  if (!banned || banned.size === 0) return movies;

  return movies.filter((m) => {
    const id = Number(m.id || m.movieId || m._id);
    return !banned.has(id);
  });
}

export async function filterBlacklistedTv(tvShows = []) {
  if (!Array.isArray(tvShows) || tvShows.length === 0) return [];
  const sets = await getActiveBlacklistSets();
  const banned = sets.tv;
  if (!banned || banned.size === 0) return tvShows;

  return tvShows.filter((t) => {
    const id = Number(t.id || t.tvId || t._id);
    return !banned.has(id);
  });
}

export async function filterBlacklistedPeople(people = []) {
  if (!Array.isArray(people) || people.length === 0) return [];
  const sets = await getActiveBlacklistSets();
  const banned = sets.person;
  if (!banned || banned.size === 0) return people;

  return people.filter((p) => {
    const id = Number(p.id || p._id);
    return !banned.has(id);
  });
}
