"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";

const remove = async (id) => {
  if (!confirm("Yakin mau hapus data ini?")) return;
  await fetch(`/api/movies/${id}`, { method: "DELETE" });
  window.location.reload();
};

export default function TableMovies({ movies = [], genres = [], years = [] }) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [videoFilter, setVideoFilter] = useState("");

  const perPage = 10;

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const sRaw = search.trim();
    const s = sRaw.toLowerCase();

    let list = movies.filter((m) => {
      // normalize fields
      const title = (m.title || "").toString().toLowerCase();
      const original = (m.originalTitle || m.original_title || "")
        .toString()
        .toLowerCase();
      const movieYear = m.releaseYear || m.year || "";
      const genresField = m.genres || m.tags || "";

      // text matching: title OR original OR numeric year
      const textMatch = s === "" || title.includes(s) || original.includes(s);

      const yearMatch = year === "" || !year || movieYear == year;

      // genre matching (support array or comma string)
      const genreMatch =
        genre === "" ||
        (Array.isArray(genresField)
          ? genresField.includes(genre)
          : genresField
              .toString()
              .toLowerCase()
              .split(",")
              .map((g) => g.trim())
              .includes(genre.toString().toLowerCase()));

      const matchVideo =
        videoFilter === "" ||
        (videoFilter === "yes" && Boolean(m.videoUrl)) ||
        (videoFilter === "no" && !Boolean(m.videoUrl));

      // combine: text OR year must match, and all other filters must match
      return textMatch && yearMatch && genreMatch && matchVideo;
    });

    // tambahkan SORT
    if (sortBy) {
      list = [...list].sort((a, b) => {
        const A = a[sortBy];
        const B = b[sortBy];

        if (A < B) return sortDir === "asc" ? -1 : 1;
        if (A > B) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [search, year, genre, videoFilter, movies, sortBy, sortDir]);

  // pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (Math.min(page, totalPages) - 1) * perPage;
  const paginated = filtered.slice(start, start + perPage);

  // helpers
  const gotoPage = (p) => setPage(Math.max(1, Math.min(totalPages, p)));

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 text-white">
      <h2 className="text-2xl font-bold mb-6">Manage Movies</h2>

      {/* FILTER BAR */}
      <div className="flex items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search movie..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-sm w-60"
        />

        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-sm hidden md:block"
        >
          <option value="">All Years</option>
          {years.map((y, i) => (
            <option key={i} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={genre}
          onChange={(e) => {
            setGenre(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-sm hidden md:block"
        >
          <option value="">All Genres</option>
          {genres.map((g, i) => (
            <option key={i} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={videoFilter}
          onChange={(e) => {
            setVideoFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-sm hidden lg:block"
        >
          <option value="">All Video Status</option>
          <option value="yes">Ada Video Link</option>
          <option value="no">Kosong Video Link</option>
        </select>

        <Link
          href="/admin/add"
          className="px-6 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700"
        >
          Add <span className="hidden sm:inline">New Movie</span>
        </Link>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white/5 rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-gray-300 cursor-pointer">
            <tr>
              <th className="px-4 py-3">Poster</th>
              <th
                className="px-4 py-3"
                onClick={() => handleSort("originalTitle")}
              >
                Title & TMDB ID
              </th>
              <th
                className="px-4 py-3"
                onClick={() => handleSort("releaseYear")}
              >
                Year
              </th>
              <th
                className="px-4 py-3 hidden md:table-cell"
                onClick={() => handleSort("genres")}
              >
                Genres
              </th>
              <th
                className="px-4 py-3 hidden lg:table-cell"
                onClick={() => handleSort("rating")}
              >
                Rating
              </th>
              <th className="px-4 py-3 hidden lg:table-cell">Video</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((movie) => (
              <tr
                key={movie._id}
                className="border-t border-white/10 hover:bg-white/10"
              >
                <td className="px-4 py-3">
                  <div className="w-16 h-20 relative rounded-lg overflow-hidden bg-zinc-900">
                    <Image
                      src={
                        movie.posterImage ||
                        movie.bannerImage ||
                        "/images/no-photo.png"
                      }
                      alt={movie.title || "Poster"}
                      width={64}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 max-w-[220px]">
                  <div className="font-semibold text-white truncate">
                    {movie.title}
                  </div>
                  <div className="text-xs text-zinc-400 truncate">
                    {movie.originalTitle}
                  </div>
                  {movie.movieId ? (
                    <a
                      href={`https://www.themoviedb.org/movie/${movie.movieId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-[11px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 hover:bg-blue-800"
                    >
                      TMDB: #{movie.movieId}
                    </a>
                  ) : (
                    <span className="inline-block mt-1 text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      No TMDB ID
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{movie.releaseYear || "-"}</td>
                <td className="px-4 py-3 max-w-[180px] truncate hidden md:table-cell text-zinc-300">
                  {Array.isArray(movie.genres) ? movie.genres.join(", ") : "-"}
                </td>
                <td className="px-4 py-3 text-yellow-300 hidden lg:table-cell">
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-star text-xs" />
                    <span>{movie.rating || "N/A"}</span>
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {movie.videoUrl ? (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                      <i className="fa-solid fa-check text-[10px]" /> Ada
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-950 text-red-300 border border-red-800 flex items-center gap-1 w-fit">
                      <i className="fa-solid fa-xmark text-[10px]" /> Kosong
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/movie/${movie.movieId || movie._id}`}
                    target="_blank"
                    className="text-blue-400 text-lg mr-3 hover:text-blue-300"
                    title="View movie"
                  >
                    <i className="fa-solid fa-eye" />
                  </Link>
                  <Link
                    href={`/admin/${movie._id}`}
                    className="text-yellow-500 text-lg mr-3 hover:text-yellow-400"
                    title="Edit movie"
                  >
                    <i className="fa-solid fa-pen-to-square" />
                  </Link>
                  <button
                    onClick={() => remove(movie._id)}
                    className="text-red-500 text-lg mr-3 cursor-pointer hover:text-red-400"
                    title="Delete movie"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-end items-center gap-2 mt-4 text-xs">
        <button
          onClick={() => page > 1 && setPage(page - 1)}
          className="px-3 py-1 bg-black/40 border border-gray-700 rounded hover:bg-white/10"
        >
          Prev
        </button>

        <span className="text-gray-400">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => page < totalPages && setPage(page + 1)}
          className="px-3 py-1 bg-black/40 border border-gray-700 rounded hover:bg-white/10"
        >
          Next
        </button>
      </div>
    </div>
  );
}
