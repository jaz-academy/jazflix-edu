import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { isItemBlacklisted } from "@/lib/blacklist";
import mongoose from "mongoose";
import Link from "next/link";
import CleanVideoPlayer from "@/components/CleanVideoPlayer";

export const revalidate = 60;

async function getMovie(id) {
  await connectDB();
  const isNumeric = !isNaN(Number(id));
  const isMongoId = mongoose.Types.ObjectId.isValid(id);

  let movie = null;
  if (isNumeric) {
    movie = await Movie.findOne({ movieId: Number(id) }).lean();
  }
  if (!movie && isMongoId) {
    movie = await Movie.findById(id).lean();
  }
  return movie ? JSON.parse(JSON.stringify(movie)) : null;
}

export default async function MovieWatch({ params }) {
  const { id } = await params;
  const movie = await getMovie(id);

  // Check blacklist
  const tmdbId = movie?.movieId || (!isNaN(Number(id)) ? Number(id) : null);
  if (tmdbId) {
    const isBanned = await isItemBlacklisted(tmdbId, "movie");
    if (isBanned) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
          <p className="text-xl font-semibold mb-4 text-center text-red-500">
            Film ini tidak dapat diputar karena telah dinonaktifkan oleh administrator.
          </p>
          <Link
            href="/"
            className="px-4 py-2 bg-red-600 rounded-lg text-sm hover:bg-red-700 transition"
          >
            Kembali ke Beranda
          </Link>
        </div>
      );
    }
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <p className="text-xl font-semibold mb-4 text-center">
          Data film tidak ditemukan di database Jazflix.
        </p>
        <Link
          href={`/movie/${id}`}
          className="px-4 py-2 bg-red-600 rounded-lg text-sm hover:bg-red-700 transition"
        >
          Kembali ke Detail Film
        </Link>
      </div>
    );
  }

  // Jika tidak ada videoUrl
  if (!movie.videoUrl) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <p className="text-xl font-semibold mb-4 text-center">
          Link video belum tersedia untuk film ini.
        </p>
        <Link
          href={`/movie/${id}`}
          className="px-4 py-2 bg-red-600 rounded-lg text-sm hover:bg-red-700 transition"
        >
          Kembali ke Detail Film
        </Link>
      </div>
    );
  }

  return (
    <CleanVideoPlayer
      title={movie.title || "Film"}
      subTitle={movie.releaseYear ? `${movie.releaseYear} • ${movie.duration || ""}` : ""}
      backUrl={`/movie/${id}`}
      videoUrl={movie.videoUrl}
    />
  );
}
