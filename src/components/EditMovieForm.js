"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /(?:v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

export default function EditMovieForm({ id, genres = [] }) {
  const [errors, setErrors] = useState({});
  const [movie, setMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResyncing, setIsResyncing] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    fetch(`/api/movies/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setMovie(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (movie) {
      adjustTextareaHeight();
    }
  }, [movie?.description, movie?.plot]);

  const setVal = (key, val) => setMovie((prev) => ({ ...prev, [key]: val }));

  // TMDB Search
  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/tmdb/search?query=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Re-sync with TMDB
  const handleSyncWithTmdb = async (tmdbId) => {
    const targetId = tmdbId || movie.movieId;
    if (!targetId) {
      alert("Masukkan TMDB ID terlebih dahulu!");
      return;
    }
    setIsResyncing(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/tmdb/movie/${targetId}`);
      const data = await res.json();
      if (data && data.movieId) {
        setMovie((prev) => ({
          ...prev,
          movieId: data.movieId,
          imdbId: data.imdbId || prev.imdbId,
          title: data.title || prev.title,
          originalTitle: data.originalTitle || prev.originalTitle,
          description: data.description || prev.description,
          plot: data.plot || prev.plot,
          releaseYear: data.releaseYear || prev.releaseYear,
          duration: data.duration || prev.duration,
          ageRating: data.ageRating || prev.ageRating,
          rating: data.rating || prev.rating,
          posterImage: data.posterImage || prev.posterImage,
          bannerImage: data.bannerImage || prev.bannerImage,
          trailerUrl: data.trailerUrl || prev.trailerUrl,
          genres: data.genres?.length ? data.genres : prev.genres,
          director: data.director?.length ? data.director : prev.director,
          actors: data.actors?.length ? data.actors : prev.actors,
        }));
        alert(`Berhasil sinkronisasi dengan TMDB: ${data.title}`);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal sinkronisasi data dari TMDB.");
    } finally {
      setIsResyncing(false);
    }
  };

  const update = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!movie.title) newErrors.title = true;
    if (!movie.videoUrl) newErrors.videoUrl = "Video URL wajib diisi!";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      const res = await fetch(`/api/movies/${id}`, {
        method: "PUT",
        body: JSON.stringify(movie),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Gagal mengupdate movie");
      window.location.href = "/admin";
    } catch (err) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-20 text-zinc-400 flex items-center justify-center">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-red-500" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="text-center py-20 text-red-500">
        Film tidak ditemukan.
      </div>
    );
  }

  const trailerYouTubeId = getYouTubeId(movie.trailerUrl);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-red-500 flex items-center gap-2">
            <i className="fa-solid fa-pen-to-square" /> Edit Film: {movie.title}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Edit informasi film, sinkronkan ulang dengan TMDB, dan pastikan link
            video terisi.
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition"
        >
          <i className="fa-solid fa-arrow-left mr-1" /> Kembali
        </Link>
      </div>

      {/* TMDB Re-sync & Search Tool */}
      <div className="bg-zinc-900/90 border border-zinc-700/70 p-5 rounded-2xl mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="w-full md:w-1/2 relative">
            <label className="text-xs text-zinc-400 font-semibold mb-1 flex items-center gap-1.5 uppercase tracking-wider">
              <i className="fa-solid fa-magnifying-glass text-red-500" />
              <span>Cari di TMDB untuk Re-sync</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari judul baru di TMDB..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 bg-black/60 border border-zinc-600 rounded-xl text-sm focus:border-red-500 focus:outline-none"
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5 text-xs text-zinc-400">
                  <i className="fa-solid fa-spinner fa-spin" />
                </div>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50 divide-y divide-zinc-800">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSyncWithTmdb(item.id)}
                    className="p-3 hover:bg-zinc-800 cursor-pointer flex items-center gap-3 transition"
                  >
                    <div className="w-10 h-14 relative bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                      {item.posterImage ? (
                        <Image
                          src={item.posterImage}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                          No Pic
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <span>{item.originalTitle}</span>
                        <span>•</span>
                        <span>{item.releaseYear || "N/A"}</span>
                        {item.rating && (
                          <>
                            <span>•</span>
                            <span className="text-yellow-400 flex items-center gap-1">
                              <i className="fa-solid fa-star text-[10px]" />
                              {item.rating}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-blue-600/80 text-white flex-shrink-0">
                      Pilih & Sinkron
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct Re-sync Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSyncWithTmdb(movie.movieId)}
              disabled={!movie.movieId || isResyncing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2"
            >
              <i
                className={`fa-solid fa-rotate ${isResyncing ? "fa-spin" : ""}`}
              />
              {isResyncing
                ? "Menyinkronkan..."
                : `Re-sync Data TMDB (#${movie.movieId || "N/A"})`}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={update} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Form Inputs */}
        <div className="lg:col-span-2 bg-white/5 p-6 rounded-2xl border border-white/10 space-y-5">
          <h2 className="text-lg font-bold border-b border-zinc-700 pb-3 flex items-center gap-2">
            <i className="fa-solid fa-pen-nib text-red-500" /> Detail Film
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400">TMDB Movie ID</label>
              <input
                type="number"
                value={movie.movieId || ""}
                onChange={(e) => setVal("movieId", Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">IMDb ID</label>
              <input
                type="text"
                value={movie.imdbId || ""}
                onChange={(e) => setVal("imdbId", e.target.value)}
                placeholder="tt..."
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm text-zinc-300"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">
                Judul Film (Title) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={movie.title || ""}
                onChange={(e) => setVal("title", e.target.value)}
                className={`w-full mt-1 px-3 py-2 bg-black/40 border ${
                  errors.title
                    ? "border-red-500 animate-pulse"
                    : "border-zinc-700"
                } rounded-lg text-sm`}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">
                Judul Asli (Original Title)
              </label>
              <input
                type="text"
                value={movie.originalTitle || ""}
                onChange={(e) => setVal("originalTitle", e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">Tahun Rilis</label>
              <input
                type="number"
                value={movie.releaseYear || ""}
                onChange={(e) => setVal("releaseYear", e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">
                Durasi (contoh: 120 min)
              </label>
              <input
                type="text"
                value={movie.duration || ""}
                onChange={(e) => setVal("duration", e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">Rating (1 - 10)</label>
              <input
                type="text"
                value={movie.rating || ""}
                onChange={(e) => setVal("rating", e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">Rating Umur</label>
              <input
                type="text"
                value={movie.ageRating || ""}
                onChange={(e) => setVal("ageRating", e.target.value)}
                placeholder="G, PG, PG-13, R, NC-17"
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400">
              Ringkasan / Sinopsis
            </label>
            <textarea
              ref={textareaRef}
              rows={3}
              value={
                Array.isArray(movie.plot)
                  ? movie.plot.join("\n")
                  : movie.description || ""
              }
              onInput={adjustTextareaHeight}
              onChange={(e) => {
                setVal("description", e.target.value);
                setVal("plot", [e.target.value]);
              }}
              placeholder="Sinopsis film..."
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm focus:border-red-500 focus:outline-none resize-none overflow-hidden"
            />
          </div>

          {/* Cast & Genres */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs text-zinc-400">
                Sutradara (Director)
              </label>
              <input
                type="text"
                value={
                  Array.isArray(movie.director)
                    ? movie.director.join(", ")
                    : movie.director || ""
                }
                onChange={(e) =>
                  setVal(
                    "director",
                    e.target.value.split(",").map((s) => s.trim()),
                  )
                }
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">
                Aktor / Aktris (Actors)
              </label>
              <input
                type="text"
                value={
                  Array.isArray(movie.actors)
                    ? movie.actors.join(", ")
                    : movie.actors || ""
                }
                onChange={(e) =>
                  setVal(
                    "actors",
                    e.target.value.split(",").map((s) => s.trim()),
                  )
                }
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-zinc-400">
                Genres (pisahkan dengan koma)
              </label>
              <input
                type="text"
                value={
                  Array.isArray(movie.genres)
                    ? movie.genres.join(", ")
                    : movie.genres || ""
                }
                onChange={(e) =>
                  setVal(
                    "genres",
                    e.target.value.split(",").map((s) => s.trim()),
                  )
                }
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Links Section */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <i className="fa-solid fa-link text-red-500" /> Aset Media & Video
              Link
            </h3>

            {/* MANDATORY Video URL */}
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/40">
              <label className="text-xs font-bold text-red-400 flex items-center gap-2">
                <i className="fa-solid fa-video" /> Video Film URL (Wajib Diisi
                - Google Drive / Direct URL) *
              </label>
              <input
                type="text"
                placeholder="https://drive.google.com/file/d/.../preview atau link video lainnya"
                value={movie.videoUrl || ""}
                onChange={(e) => setVal("videoUrl", e.target.value)}
                className={`w-full mt-2 px-3 py-2.5 bg-black/60 border ${
                  errors.videoUrl
                    ? "border-red-500 animate-pulse ring-2 ring-red-500/50"
                    : "border-red-800/60"
                } rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none`}
              />
              {errors.videoUrl && (
                <p className="text-xs text-red-400 mt-1 font-semibold">
                  {errors.videoUrl}
                </p>
              )}

              {movie.videoUrl && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={movie.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 border border-red-500/40 text-xs font-medium transition cursor-pointer"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" /> Uji di Tab Baru
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(movie.videoUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium transition cursor-pointer"
                  >
                    <i className={`fa-solid ${copied ? "fa-check text-green-400" : "fa-copy"}`} />
                    {copied ? "Link Disalin!" : "Salin Link (Untuk Jendela Penyamaran / Incognito)"}
                  </button>
                </div>
              )}

              <p className="text-[11px] text-zinc-400 mt-2.5 flex items-start gap-1.5">
                <i className="fa-solid fa-circle-info text-zinc-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Tips Uji Akses Publik:</strong> Buka link di jendela <em>Incognito / Private Window</em> (<code>Ctrl+Shift+N</code>). Jika video dapat diputar langsung tanpa permintaan login akun Google, link sudah valid &amp; publik.
                </span>
              </p>
            </div>

            <div>
              <label className="text-xs text-zinc-400">
                YouTube Trailer URL
              </label>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={movie.trailerUrl || ""}
                onChange={(e) => setVal("trailerUrl", e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">
                Poster Image URL (Portrait)
              </label>
              <input
                type="text"
                value={movie.posterImage || ""}
                onChange={(e) => setVal("posterImage", e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">
                Banner Image URL (Landscape Backdrop)
              </label>
              <input
                type="text"
                value={movie.bannerImage || ""}
                onChange={(e) => setVal("bannerImage", e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-red-900/40 cursor-pointer flex items-center justify-center gap-2 mt-4"
          >
            <i className="fa-solid fa-floppy-disk" /> Simpan Perubahan Film
          </button>
        </div>

        {/* Right 1 Col: Live Interactive Previews */}
        <div className="space-y-6">
          <div className="sticky top-24 space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-200">
              <i className="fa-solid fa-eye text-red-500" /> Live Interactive
              Preview
            </h2>

            {/* Poster Card Preview */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-2">
                Poster Preview (Portrait)
              </span>
              <div className="w-full aspect-[4/6] relative rounded-xl overflow-hidden bg-zinc-900 shadow-xl border border-zinc-700">
                {movie.posterImage ? (
                  <Image
                    src={movie.posterImage}
                    alt="Poster Preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-xs p-4 text-center">
                    <i className="fa-regular fa-image text-3xl mb-2" />
                    Belum ada poster
                  </div>
                )}
              </div>
            </div>

            {/* Banner Preview */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-2">
                Banner Preview (Landscape)
              </span>
              <div className="w-full aspect-[16/9] relative rounded-xl overflow-hidden bg-zinc-900 shadow-xl border border-zinc-700">
                {movie.bannerImage ? (
                  <Image
                    src={movie.bannerImage}
                    alt="Banner Preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-xs p-4 text-center">
                    <i className="fa-regular fa-image text-3xl mb-2" />
                    Belum ada banner
                  </div>
                )}
              </div>
            </div>

            {/* YouTube Trailer Preview */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-2">
                Trailer Player Preview
              </span>
              <div className="w-full aspect-[16/9] relative rounded-xl overflow-hidden bg-zinc-900 shadow-xl border border-zinc-700">
                {trailerYouTubeId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${trailerYouTubeId}`}
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-xs p-4 text-center">
                    <i className="fa-brands fa-youtube text-3xl mb-2 text-zinc-700" />
                    Trailer YouTube akan muncul di sini
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
