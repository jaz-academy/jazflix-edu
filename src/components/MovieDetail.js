"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /(?:v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

export default function MovieDetail({ movie, hasVideo = false }) {
  const [showFullPlot, setShowFullPlot] = useState(false);
  const youTubeId = getYouTubeId(movie?.trailerUrl);
  const mId = movie?.movieId || movie?.id || movie?._id;

  if (!movie) return null;

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-xl overflow-hidden shadow-xl bg-zinc-900 relative min-h-[350px] lg:min-h-[500px]">
          {youTubeId ? (
            <iframe
              className="w-full h-full object-cover"
              src={`https://www.youtube.com/embed/${youTubeId}?autoplay=1&controls=1`}
              allowFullScreen
            ></iframe>
          ) : (
            <div className="relative w-full h-[350px] md:h-[500px]">
              <Image
                src={movie.bannerImage || movie.posterImage || "/images/hero-image.png"}
                alt={movie.title || "Movie banner"}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-6">
                <span className="text-zinc-400 text-sm italic">
                  Trailer tidak tersedia
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{movie.title}</h1>
            <div className="flex items-center gap-3 text-xs text-yellow-400 font-semibold">
              <span className="flex items-center gap-1">
                <i className="fa-solid fa-star text-[10px]" />
                <span>{movie.rating || 5}/10</span>
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-300">{movie.releaseYear || "N/A"}</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-300">{movie.ageRating || "PG"}</span>
            </div>

            <br />

            <div className="text-sm text-gray-300 space-y-2">
              {movie.originalTitle && (
                <p>
                  <span className="text-white font-semibold">Original: </span>
                  {movie.originalTitle}
                </p>
              )}
              {movie.genres && movie.genres.length > 0 && (
                <p>
                  <span className="text-white font-semibold">Genre: </span>
                  {Array.isArray(movie.genres) ? movie.genres.join(", ") : movie.genres}
                </p>
              )}
              {movie.duration && (
                <p>
                  <span className="text-white font-semibold">Runtime: </span>
                  {movie.duration}
                </p>
              )}
              {movie.director && movie.director.length > 0 && (
                <p>
                  <span className="text-white font-semibold">Director: </span>
                  {Array.isArray(movie.director) ? movie.director.join(", ") : movie.director}
                </p>
              )}
              {movie.actors && movie.actors.length > 0 && (
                <p>
                  <span className="text-white font-semibold">Actors: </span>
                  {Array.isArray(movie.actors) ? movie.actors.join(", ") : movie.actors}
                </p>
              )}
              {(movie.description || movie.plot) && (
                <p>
                  <span className="text-white font-semibold">Plot: </span>
                  {showFullPlot
                    ? (Array.isArray(movie.plot) ? movie.plot.join(" ") : movie.description || movie.plot)
                    : (movie.description || (Array.isArray(movie.plot) ? movie.plot[0] : movie.plot))?.length > 120
                    ? `${(movie.description || (Array.isArray(movie.plot) ? movie.plot[0] : movie.plot)).substring(0, 120)}...`
                    : (movie.description || (Array.isArray(movie.plot) ? movie.plot[0] : movie.plot))}
                  {(movie.description || movie.plot)?.length > 100 && (
                    <button
                      onClick={() => setShowFullPlot(!showFullPlot)}
                      className="text-red-500 hover:text-red-400 ml-2 font-semibold text-sm cursor-pointer"
                    >
                      {showFullPlot ? "Sembunyikan" : "Selengkapnya"}
                    </button>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Conditional Play Movie Button: Only show if videoUrl exists in MongoDB */}
          {hasVideo ? (
            <Link href={`/movie/${mId}/watch`}>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-sm mt-4 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 transition">
                <i className="fa-solid fa-play"></i> Play Movie
              </button>
            </Link>
          ) : (
            <div className="w-full bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 py-3 rounded-xl text-center text-xs mt-4 flex items-center justify-center gap-2">
              <i className="fa-solid fa-circle-info"></i> Belum tersedia untuk streaming di Jazflix
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
