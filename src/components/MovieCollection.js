"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function MovieCollection({ movies, genres, years, keyword }) {
  movies = movies || [];
  genres = genres || [];
  years = years || [];
  keyword = keyword || "";

  const [year, setYear] = useState("All");
  const [genre, setGenre] = useState("All");

  const filtered = movies
    .filter((m) => year === "All" || m.releaseYear == year)
    .filter((m) => genre === "All" || m.genres.includes(genre))
    .filter((m) => m.title.toLowerCase().includes(keyword.toLowerCase()))
    .sort((a, b) => b.releaseYear - a.releaseYear);

  return (
    <section className="w-full px-4 mt-10" id="movies">
      <div
        className={`flex items-center justify-between mb-6 ${
          Array.isArray(genres) && genres.length === 0 ? "hidden" : ""
        }`}
      >
        <h2 className="text-2xl font-bold">
          <span className="hidden md:inline">Our</span> Collections
        </h2>

        <div>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-24 md:w-48 bg-black/70 text-white px-3 py-1 rounded-xl border border-gray-600 text-sm focus:outline-none cursor-pointer overflow-hidden mr-3"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-24 md:w-48 bg-black/70 text-white px-3 py-1 rounded-xl border border-gray-600 text-sm focus:outline-none cursor-pointer overflow-hidden"
          >
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 gap-4 py-4">
        {filtered.map((m, i) => {
          const mId = m.movieId || m.tvId || m.id || m._id;
          const posterUrl = m.posterImage || "/images/no-photo.png";
          const href = m.isSeries
            ? `/tv/${m.tvId || m.id || mId}`
            : `/movie/${mId}`;
          return (
            <Link
              key={m._id || i}
              href={href}
              className="tv-card group rounded-xl overflow-hidden hover:scale-[1.03] focus:scale-[1.03] focus:ring-2 focus:ring-red-600 focus:shadow-[0_0_20px_rgba(220,38,38,0.8)] cursor-pointer transition-all duration-200 relative bg-zinc-900 aspect-[4/6] outline-none block z-0 hover:z-20 focus:z-30"
            >
              <Image
                src={posterUrl}
                alt={m.title || "poster"}
                width={300}
                height={450}
                className="w-full h-full object-cover rounded-xl group-hover:scale-[1.03] group-focus:scale-[1.03] transition-transform duration-200"
              />
              {/* Badge SERIES di pojok kiri atas untuk serial TV */}
              {m.isSeries && (
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/80 text-zinc-300 text-[9px] sm:text-[10px] font-semibold border border-zinc-700 shadow-md">
                  SERIES
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
