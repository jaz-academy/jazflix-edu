import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import Blacklist from "@/models/Blacklist";
import { tmdbFetch, formatTmdbMovie, formatTmdbTv, formatTmdbPerson } from "@/lib/tmdb";

function checkSuperadmin(req) {
  let token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    token = req.cookies.get("token")?.value;
  }
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== "superadmin") {
    return null;
  }
  return decoded;
}

export async function GET(req) {
  const superadmin = checkSuperadmin(req);
  if (!superadmin) {
    return NextResponse.json(
      { error: "Akses ditolak: Hanya superadmin yang diizinkan." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const mediaType = searchParams.get("mediaType") || "movie"; // movie, tv, person
    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);

    if (!query.trim()) {
      // If query is empty, return trending/popular for this mediaType as discover suggestion
      let tmdbPath = "";
      if (mediaType === "movie") {
        tmdbPath = `/movie/popular?page=${page}&language=en-US`;
      } else if (mediaType === "tv") {
        tmdbPath = `/tv/popular?page=${page}&language=en-US`;
      } else {
        tmdbPath = `/trending/person/week?page=${page}&language=en-US`;
      }

      const tmdbData = await tmdbFetch(tmdbPath);
      return await mergeBlacklistStatus(tmdbData.results || [], mediaType);
    }

    let searchPath = "";
    if (mediaType === "movie") {
      searchPath = `/search/movie?query=${encodeURIComponent(query)}&page=${page}&language=en-US`;
    } else if (mediaType === "tv") {
      searchPath = `/search/tv?query=${encodeURIComponent(query)}&page=${page}&language=en-US`;
    } else {
      searchPath = `/search/person?query=${encodeURIComponent(query)}&page=${page}&language=en-US`;
    }

    const tmdbData = await tmdbFetch(searchPath);
    return await mergeBlacklistStatus(tmdbData.results || [], mediaType);
  } catch (error) {
    console.error("Error in TMDB search for blacklist:", error);
    return NextResponse.json(
      { error: "Gagal mencari data di TMDB" },
      { status: 500 }
    );
  }
}

async function mergeBlacklistStatus(rawResults, mediaType) {
  await connectDB();

  // Format TMDB items
  const formatted = rawResults
    .map((item) => {
      if (mediaType === "movie") return formatTmdbMovie(item);
      if (mediaType === "tv") return formatTmdbTv(item);
      return formatTmdbPerson(item);
    })
    .filter(Boolean);

  const ids = formatted.map((item) => Number(item.id)).filter(Boolean);

  // Look up existing blacklist records for these IDs
  const existing = await Blacklist.find({
    mediaType,
    tmdbId: { $in: ids },
  }).lean();

  const existingMap = new Map();
  for (const b of existing) {
    existingMap.set(Number(b.tmdbId), b);
  }

  const results = formatted.map((item) => {
    const b = existingMap.get(Number(item.id));
    return {
      id: item.id,
      title: item.title || item.name,
      originalTitle: item.originalTitle || item.title || item.name,
      posterImage: item.posterImage || item.profileImage || "",
      releaseYear: item.releaseYear || null,
      department: item.department || "",
      isBlacklisted: Boolean(b),
      blacklistId: b?._id ? String(b._id) : null,
      isActive: b ? b.isActive : false,
      reason: b?.reason || "",
    };
  });

  return NextResponse.json({ results });
}
