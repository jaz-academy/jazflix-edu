import { NextResponse } from "next/server";
import { getTvShowsPaginated, getTvGenres } from "@/lib/tmdb";
import { connectDB } from "@/lib/db";
import TvShow from "@/models/TvShow";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "popular";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const genre = searchParams.get("genre") || "";
    const query = searchParams.get("query") || "";

    // Handle Category "Tersedia" (TV shows with episode videoUrl in MongoDB)
    if (category === "available") {
      await connectDB();
      const filter = {
        "episodes.videoUrl": { $exists: true, $ne: "" },
      };

      if (query && query.trim()) {
        filter.$or = [
          { title: { $regex: query.trim(), $options: "i" } },
          { originalTitle: { $regex: query.trim(), $options: "i" } },
        ];
      }

      if (genre) {
        let genreName = genre;
        try {
          const genresList = await getTvGenres();
          const matched = genresList.find((g) => String(g.id) === String(genre));
          if (matched) genreName = matched.name;
        } catch (e) {
          // fallback
        }
        filter.genres = { $regex: genreName, $options: "i" };
      }

      const limit = 20;
      const skip = Math.max(0, (page - 1) * limit);

      const totalResults = await TvShow.countDocuments(filter);
      const totalPages = Math.max(1, Math.ceil(totalResults / limit));

      const localShows = await TvShow.find(filter)
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const results = localShows.map((s) => ({
        _id: s.tvId ? String(s.tvId) : String(s._id),
        tvId: s.tvId || s._id,
        id: s.tvId || s._id,
        title: s.title,
        originalTitle: s.originalTitle || s.title,
        description: s.description || "",
        plot: s.description || "",
        releaseYear: s.releaseYear || null,
        numberOfSeasons: s.numberOfSeasons || 1,
        numberOfEpisodes: s.numberOfEpisodes || (s.episodes ? s.episodes.length : 0),
        rating: s.rating || "N/A",
        posterImage: s.posterImage || "",
        bannerImage: s.bannerImage || "",
        trailerUrl: s.trailerUrl || "",
        genres: s.genres || [],
        ageRating: s.ageRating || "TV-14",
        hasVideo: true,
      }));

      return NextResponse.json({
        page,
        totalPages,
        totalResults,
        results,
      });
    }

    const data = await getTvShowsPaginated({ category, page, genre, query });

    try {
      await connectDB();
      const localShows = await TvShow.find(
        { "episodes.videoUrl": { $exists: true, $ne: "" } },
        { tvId: 1, title: 1, episodes: 1 }
      ).lean();

      const localTvIdSet = new Set(
        localShows
          .filter((s) => s.tvId && s.episodes?.some((e) => e.videoUrl && e.videoUrl.trim()))
          .map((s) => Number(s.tvId))
      );
      const localTvTitles = new Set(
        localShows
          .filter((s) => s.title && s.episodes?.some((e) => e.videoUrl && e.videoUrl.trim()))
          .map((s) => s.title.trim().toLowerCase())
      );

      data.results = (data.results || []).map((t) => {
        const numId = Number(t.id || t.tvId);
        const isIdMatch = !isNaN(numId) && localTvIdSet.has(numId);
        const isTitleMatch = t.title && localTvTitles.has(t.title.trim().toLowerCase());
        return {
          ...t,
          hasVideo: Boolean(isIdMatch || isTitleMatch),
        };
      });
    } catch (dbErr) {
      console.error("Failed to check local TV videoUrl in API:", dbErr);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Error in /api/tmdb/tv:", err);
    return NextResponse.json(
      { error: "Failed to fetch TV shows", results: [], page: 1, totalPages: 1 },
      { status: 500 }
    );
  }
}
