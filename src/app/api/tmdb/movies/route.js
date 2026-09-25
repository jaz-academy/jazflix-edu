import { NextResponse } from "next/server";
import { getMoviesPaginated, getMovieGenres } from "@/lib/tmdb";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "popular";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const genre = searchParams.get("genre") || "";
    const query = searchParams.get("query") || "";

    // Handle Category "Tersedia" (Movies with videoUrl in MongoDB)
    if (category === "available") {
      await connectDB();
      const filter = {
        videoUrl: { $exists: true, $ne: "" },
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
          const genresList = await getMovieGenres();
          const matched = genresList.find((g) => String(g.id) === String(genre));
          if (matched) genreName = matched.name;
        } catch (e) {
          // fallback
        }
        filter.genres = { $regex: genreName, $options: "i" };
      }

      const limit = 20;
      const skip = Math.max(0, (page - 1) * limit);

      const totalResults = await Movie.countDocuments(filter);
      const totalPages = Math.max(1, Math.ceil(totalResults / limit));

      const localMovies = await Movie.find(filter)
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const results = localMovies.map((m) => ({
        _id: m.movieId ? String(m.movieId) : String(m._id),
        movieId: m.movieId || m._id,
        id: m.movieId || m._id,
        imdbId: m.imdbId || null,
        title: m.title,
        originalTitle: m.originalTitle || m.title,
        description: m.description || "",
        plot: m.description || "",
        releaseYear: m.releaseYear || null,
        rating: m.rating || "N/A",
        duration: m.duration || "",
        posterImage: m.posterImage || "",
        bannerImage: m.bannerImage || "",
        trailerUrl: m.trailerUrl || "",
        genres: m.genres || [],
        ageRating: m.ageRating || "PG-13",
        director: m.director || [],
        actors: m.actors || [],
        hasVideo: true,
      }));

      return NextResponse.json({
        page,
        totalPages,
        totalResults,
        results,
      });
    }

    const data = await getMoviesPaginated({ category, page, genre, query });

    try {
      await connectDB();
      const localMovies = await Movie.find(
        { videoUrl: { $exists: true, $ne: "" } },
        { movieId: 1, title: 1 }
      ).lean();

      const localMovieIdSet = new Set(
        localMovies
          .filter((m) => m.movieId)
          .map((m) => Number(m.movieId))
      );
      const localMovieTitles = new Set(
        localMovies
          .filter((m) => m.title)
          .map((m) => m.title.trim().toLowerCase())
      );

      data.results = (data.results || []).map((m) => {
        const numId = Number(m.id || m.movieId);
        const isIdMatch = !isNaN(numId) && localMovieIdSet.has(numId);
        const isTitleMatch = m.title && localMovieTitles.has(m.title.trim().toLowerCase());
        return {
          ...m,
          hasVideo: Boolean(isIdMatch || isTitleMatch),
        };
      });
    } catch (dbErr) {
      console.error("Failed to check local movie videoUrl in API:", dbErr);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Error in /api/tmdb/movies:", err);
    return NextResponse.json(
      { error: "Failed to fetch movies", results: [], page: 1, totalPages: 1 },
      { status: 500 }
    );
  }
}
