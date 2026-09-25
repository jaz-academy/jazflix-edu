export const revalidate = 60;
import MoviePage from "@/components/MoviePage";
import { connectDB } from "@/lib/db";
import MovieModel from "@/models/Movie";
import { getMovieDetails, isSafeMovie } from "@/lib/tmdb";
import { isItemBlacklisted, filterBlacklistedMovies } from "@/lib/blacklist";
import mongoose from "mongoose";

async function getLocalMovies() {
  await connectDB();
  const movies = await MovieModel.find().sort({ _id: -1 }).lean();
  return JSON.parse(JSON.stringify(movies));
}

export default async function Movie({ params }) {
  const { id } = await params;
  await connectDB();

  const isNumeric = !isNaN(Number(id));
  const isMongoId = mongoose.Types.ObjectId.isValid(id);

  // 1. Look up in MongoDB to see if we have this movie & its videoUrl
  let dbMovie = null;
  if (isNumeric) {
    dbMovie = await MovieModel.findOne({ movieId: Number(id) }).lean();
  }
  if (!dbMovie && isMongoId) {
    dbMovie = await MovieModel.findById(id).lean();
  }

  // 2. Determine the TMDB ID
  const tmdbId = dbMovie?.movieId || (isNumeric ? Number(id) : null);

  // Check blacklist early
  if (tmdbId) {
    const isBanned = await isItemBlacklisted(tmdbId, "movie");
    if (isBanned) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
          <h1 className="text-3xl font-bold mb-4 text-red-500">Konten Tidak Tersedia</h1>
          <p className="text-zinc-400 text-center max-w-md">
            Film ini tidak tersedia atau telah dinonaktifkan oleh administrator.
          </p>
        </div>
      );
    }
  }

  // 3. Fetch details from TMDB
  let movieData = null;
  if (tmdbId) {
    try {
      movieData = await getMovieDetails(tmdbId);
    } catch (err) {
      console.error(`Failed to fetch TMDB movie ${tmdbId}:`, err.message);
    }
  }

  // Fallback to dbMovie if TMDB failed
  if (!movieData && dbMovie) {
    movieData = {
      _id: String(dbMovie._id),
      movieId: dbMovie.movieId,
      id: dbMovie.movieId || dbMovie._id,
      title: dbMovie.title,
      originalTitle: dbMovie.originalTitle,
      description: dbMovie.description,
      plot: dbMovie.plot,
      releaseYear: dbMovie.releaseYear,
      duration: dbMovie.duration,
      ageRating: dbMovie.ageRating,
      rating: dbMovie.rating,
      posterImage: dbMovie.posterImage,
      bannerImage: dbMovie.bannerImage,
      trailerUrl: dbMovie.trailerUrl,
      genres: dbMovie.genres,
      director: dbMovie.director,
      actors: dbMovie.actors,
    };
  }

  if (!movieData || !isSafeMovie(movieData)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold mb-4 text-red-500">Konten Tidak Tersedia</h1>
        <p className="text-zinc-400 text-center max-w-md">
          Film ini tidak tersedia atau tidak memenuhi panduan kelayakan konten keluarga.
        </p>
      </div>
    );
  }

  // Check if videoUrl exists in MongoDB
  const hasVideo = Boolean(dbMovie && dbMovie.videoUrl);

  // Get similar movies from local catalog (filtered by blacklist)
  const rawLocal = await getLocalMovies();
  const allLocal = await filterBlacklistedMovies(rawLocal);
  const movieGenres = movieData.genres || [];
  const similars = allLocal.filter(
    (m) =>
      (m.movieId ? m.movieId !== tmdbId : String(m._id) !== String(dbMovie?._id)) &&
      (Array.isArray(m.genres) && m.genres.some((g) => movieGenres.includes(g)))
  );

  return (
    <MoviePage
      movies={similars.length > 0 ? similars : allLocal.slice(0, 18)}
      genres={[]}
      movie={movieData}
      hasVideo={hasVideo}
    />
  );
}
