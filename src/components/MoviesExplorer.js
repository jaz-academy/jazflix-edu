"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

export default function MoviesExplorer({
  initialMovies = [],
  genres = [],
  initialCategory = "popular",
}) {
  const [movies, setMovies] = useState(initialMovies);
  const [category, setCategory] = useState(initialCategory);
  const [genre, setGenre] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(50);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const searchTimer = useRef(null);

  const categories = [
    { id: "available", label: "Tersedia", icon: "fa-solid fa-play text-red-500" },
    { id: "popular", label: "Populer", icon: "fa-solid fa-fire text-red-500" },
    { id: "now_playing", label: "Now Playing", icon: "fa-solid fa-clapperboard text-zinc-400" },
    { id: "upcoming", label: "Mendatang", icon: "fa-solid fa-calendar-days text-zinc-400" },
    { id: "top_rated", label: "Rating Tertinggi", icon: "fa-solid fa-star text-yellow-500" },
  ];

  // Fetch movies when category or genre changes
  const fetchMovies = async (newCategory, newGenre, query, pageNum = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        category: newCategory,
        genre: newGenre,
        query: query.trim(),
        page: pageNum.toString(),
      });
      const res = await fetch(`/api/tmdb/movies?${params.toString()}`);
      const data = await res.json();
      const results = data.results || [];

      if (append) {
        setMovies((prev) => [...prev, ...results]);
      } else {
        setMovies(results);
      }
      setTotalPages(data.totalPages || 1);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to fetch movies:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCategoryChange = (catId) => {
    setCategory(catId);
    setSearchQuery("");
    fetchMovies(catId, genre, "", 1, false);
  };

  const handleGenreChange = (genreId) => {
    setGenre(genreId);
    fetchMovies(category, genreId, searchQuery, 1, false);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchMovies(category, genre, val, 1, false);
    }, 400);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchMovies(category, genre, searchQuery, page + 1, true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-20 text-white space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3 tracking-tight">
            <span>Movies</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Koleksi film bioskop dan rilis terkini.
          </p>
        </div>

        {/* Real-time Search Bar */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari judul film..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
          />
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-zinc-400 text-xs" />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-3 text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Genre Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Category Tabs (Desktop / Tablet: sm and up) */}
        <div className="hidden sm:flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                category === cat.id && !searchQuery
                  ? "bg-red-600 text-white shadow-lg shadow-red-900/30"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
              }`}
            >
              {cat.icon && <i className={cat.icon} />}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Mobile Filter Selects (sm:hidden) */}
        <div className="flex sm:hidden items-center gap-2 w-full">
          <div className="flex-1">
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {genres.length > 0 && (
            <div className="flex-1">
              <select
                value={genre}
                onChange={(e) => handleGenreChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="">Semua Genre</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Genre Selector (Desktop / Tablet: sm and up) */}
        {genres.length > 0 && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Genre:</span>
            <select
              value={genre}
              onChange={(e) => handleGenreChange(e.target.value)}
              className="px-3.5 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="">Semua Genre</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Active Search / Filter Indicator */}
      {searchQuery && (
        <div className="text-xs text-zinc-400 flex items-center gap-2">
          <span>Hasil pencarian untuk:</span>
          <strong className="text-red-400">"{searchQuery}"</strong>
          <span>({movies.length} film ditemukan)</span>
        </div>
      )}

      {/* Movies Grid */}
      {loading ? (
        <div className="py-32 text-center text-zinc-400 flex items-center justify-center">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-red-500" />
        </div>
      ) : movies.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 bg-zinc-950/60 rounded-2xl border border-zinc-800/80">
          <i className="fa-solid fa-film text-4xl mb-3 block text-zinc-600" />
          <h3 className="text-base font-bold text-white mb-1">Tidak Ada Film Ditemukan</h3>
          <p className="text-xs text-zinc-400">
            Coba kata kunci pencarian lain atau pilih kategori genre yang berbeda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {movies.map((m) => {
            const mId = m.movieId || m.id || m._id;
            return (
              <Link
                key={mId}
                href={`/movie/${mId}`}
                className="group flex flex-col justify-between rounded-2xl overflow-hidden bg-zinc-900/90 border border-zinc-800/80 hover:border-red-500/60 transition-all duration-300 hover:scale-105 shadow-xl"
              >
                {/* Poster Box */}
                <div className="aspect-[4/6] relative bg-zinc-950 overflow-hidden">
                  <Image
                    src={m.posterImage || "/images/no-photo.png"}
                    alt={m.title}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                    className="object-cover group-hover:scale-105 transition duration-300"
                  />

                  {/* Rating Badge */}
                  {m.rating && m.rating !== "N/A" && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md text-yellow-400 text-xs font-bold border border-yellow-500/30 shadow-md flex items-center gap-1">
                      <i className="fa-solid fa-star text-[10px]" />
                      <span>{m.rating}</span>
                    </div>
                  )}

                  {/* Top-Left: Age Rating */}
                  {m.ageRating && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-zinc-300 text-[10px] font-semibold border border-zinc-700">
                      {m.ageRating}
                    </div>
                  )}

                  {/* Bottom-Right: Play icon kotak merah border jika film tersedia di Jazflix */}
                  {m.hasVideo && (
                    <div
                      className="absolute bottom-2.5 right-2.5 w-6 h-6 rounded-md bg-red-600/90 border border-red-400/80 text-white flex items-center justify-center shadow-lg shadow-red-950/60 backdrop-blur-sm pointer-events-none"
                      title="Tersedia untuk ditonton di Jazflix"
                    >
                      <i className="fa-solid fa-play text-[10px] ml-0.5" />
                    </div>
                  )}
                </div>

                {/* Movie Meta Information */}
                <div className="p-3.5 flex flex-col justify-between flex-1">
                  <div>
                    <h2 className="font-bold text-sm text-white group-hover:text-red-400 transition line-clamp-1 leading-snug">
                      {m.title}
                    </h2>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                      <span>{m.releaseYear || "N/A"}</span>
                      {m.duration && <span>{m.duration}</span>}
                    </div>
                  </div>

                  {/* Genres Preview */}
                  {m.genres?.length > 0 && (
                    <div className="text-[10px] text-zinc-500 truncate mt-2 pt-2 border-t border-zinc-800">
                      {m.genres.slice(0, 2).join(", ")}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Incremental Load More Button */}
      {!loading && movies.length > 0 && page < totalPages && (
        <div className="pt-10 flex flex-col items-center justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-8 py-3.5 rounded-xl bg-zinc-900 hover:bg-red-600 disabled:opacity-50 text-white font-bold text-sm border border-zinc-700 hover:border-red-500 shadow-xl transition-all duration-200 cursor-pointer flex items-center gap-3 group"
          >
            {loadingMore ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-red-500" />
                <span>Memuat Lebih Banyak...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-arrow-down transition-transform group-hover:translate-y-1" />
                <span>Muat Lebih Banyak Film</span>
              </>
            )}
          </button>
          <p className="text-xs text-zinc-500 mt-2">
            Halaman {page} dari {totalPages}
          </p>
        </div>
      )}
    </div>
  );
}
