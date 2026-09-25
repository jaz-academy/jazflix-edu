"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AddTvShowForm() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedTv, setSelectedTv] = useState(null);
  const [activeSeason, setActiveSeason] = useState(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState({}); // { [seasonNum]: [episodes] }
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef(null);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/tmdb/tv?query=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const selectTvShow = async (show) => {
    setLoadingDetails(true);
    setSearchResults([]);
    setSearchQuery(show.title);

    try {
      // 1. Fetch full TV details
      const res = await fetch(`/api/tmdb/tv/${show.id}`);
      const tvData = await res.json();
      setSelectedTv(tvData);

      const firstSeason = tvData.seasons?.[0]?.season_number || 1;
      setActiveSeason(firstSeason);

      // 2. Fetch episodes for all seasons in parallel or first season
      const seasonData = await fetch(
        `/api/tmdb/tv/${show.id}/season/${firstSeason}`
      ).then((r) => r.json());

      const eps = (seasonData.episodes || []).map((ep) => ({
        seasonNumber: ep.seasonNumber || firstSeason,
        episodeNumber: ep.episodeNumber,
        name: ep.name,
        overview: ep.overview,
        stillImage: ep.stillImage,
        airDate: ep.airDate,
        runtime: ep.runtime,
        videoUrl: "",
      }));

      setSeasonEpisodes({ [firstSeason]: eps });
    } catch (err) {
      console.error("Failed to load show details:", err);
      alert("Gagal memuat detail serial dari TMDB.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSeasonChange = async (sNum) => {
    setActiveSeason(sNum);
    if (seasonEpisodes[sNum]) return; // already loaded

    setLoadingSeason(true);
    try {
      const seasonData = await fetch(
        `/api/tmdb/tv/${selectedTv.id}/season/${sNum}`
      ).then((r) => r.json());

      const eps = (seasonData.episodes || []).map((ep) => ({
        seasonNumber: ep.seasonNumber || sNum,
        episodeNumber: ep.episodeNumber,
        name: ep.name,
        overview: ep.overview,
        stillImage: ep.stillImage,
        airDate: ep.airDate,
        runtime: ep.runtime,
        videoUrl: "",
      }));

      setSeasonEpisodes((prev) => ({ ...prev, [sNum]: eps }));
    } catch (err) {
      console.error(`Failed to load season ${sNum}:`, err);
    } finally {
      setLoadingSeason(false);
    }
  };

  const handleVideoUrlChange = (sNum, epNum, url) => {
    setSeasonEpisodes((prev) => {
      const currentList = prev[sNum] || [];
      const updated = currentList.map((ep) =>
        ep.episodeNumber === epNum ? { ...ep, videoUrl: url } : ep
      );
      return { ...prev, [sNum]: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTv) {
      alert("Pilih serial TV terlebih dahulu dari TMDB.");
      return;
    }

    setSaving(true);
    try {
      // Flatten all episodes from all loaded seasons
      const allEpisodes = [];
      Object.values(seasonEpisodes).forEach((eps) => {
        allEpisodes.push(...eps);
      });

      const payload = {
        tvId: selectedTv.id,
        title: selectedTv.title,
        originalTitle: selectedTv.originalTitle,
        description: selectedTv.description,
        releaseYear: selectedTv.releaseYear,
        rating: selectedTv.rating,
        ageRating: selectedTv.ageRating,
        posterImage: selectedTv.posterImage,
        bannerImage: selectedTv.bannerImage,
        trailerUrl: selectedTv.trailerUrl,
        genres: selectedTv.genres || [],
        numberOfSeasons: selectedTv.numberOfSeasons || 1,
        numberOfEpisodes: selectedTv.numberOfEpisodes || allEpisodes.length,
        episodes: allEpisodes,
      };

      const res = await fetch("/api/tv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/admin/tv");
      } else {
        const err = await res.json();
        alert(err.message || "Gagal menyimpan serial TV.");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  const currentEpisodesList = seasonEpisodes[activeSeason] || [];
  const seasonsList = selectedTv?.seasons || [
    { season_number: 1, name: "Season 1" },
  ];

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Link href="/admin/tv" className="hover:text-white transition">
              Kelola Serial TV
            </Link>
            <i className="fa-solid fa-chevron-right text-[10px]" />
            <span className="text-zinc-200">Tambah Serial Baru</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <i className="fa-solid fa-plus-circle text-red-500" />
            <span>Daftarkan Serial TV & Video Episode</span>
          </h1>
        </div>

        <Link
          href="/admin/tv"
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold transition flex items-center gap-2"
        >
          <i className="fa-solid fa-arrow-left" />
          <span>Kembali ke Daftar</span>
        </Link>
      </div>

      {/* Step 1: TMDB Search Box */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 mb-8 relative">
        <h2 className="text-base font-bold mb-1 flex items-center gap-2">
          <i className="fa-solid fa-magnifying-glass text-red-500 text-sm" />
          <span>Langkah 1: Cari Serial TV dari TMDB</span>
        </h2>
        <p className="text-xs text-zinc-400 mb-4">
          Ketik judul drama serial, anime, atau acara TV untuk mengambil metadata, musim, dan episode secara otomatis.
        </p>

        <div className="relative max-w-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Contoh: Breaking Bad, Stranger Things, Arcane..."
            className="w-full pl-10 pr-10 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
          />
          <i className="fa-solid fa-film absolute left-3.5 top-3.5 text-zinc-500 text-sm" />
          {isSearching && (
            <i className="fa-solid fa-spinner fa-spin absolute right-3.5 top-3.5 text-red-500 text-sm" />
          )}

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-zinc-800">
              {searchResults.map((show) => (
                <div
                  key={show.id}
                  onClick={() => selectTvShow(show)}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-800/80 cursor-pointer transition"
                >
                  <div className="w-10 h-14 relative bg-zinc-950 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={show.posterImage || "/images/no-photo.png"}
                      alt={show.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white truncate">
                      {show.title}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                      <span>{show.releaseYear || "N/A"}</span>
                      {show.seasonsCount && (
                        <span className="text-zinc-500">• {show.seasonsCount} Musim</span>
                      )}
                      {show.rating && (
                        <span className="text-yellow-400 flex items-center gap-1">
                          <i className="fa-solid fa-star text-[10px]" />
                          {show.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loadingDetails && (
        <div className="py-20 text-center text-zinc-400 flex items-center justify-center">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-red-500" />
        </div>
      )}

      {/* Step 2: Show Preview & Episodes Configuration */}
      {selectedTv && !loadingDetails && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* TV Metadata Summary Banner */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6">
            <div className="w-28 h-40 relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-700 flex-shrink-0 mx-auto md:mx-0">
              <Image
                src={selectedTv.posterImage || "/images/no-photo.png"}
                alt={selectedTv.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 space-y-2 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-red-600 text-white text-xs font-bold">
                  TMDB: {selectedTv.id}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-semibold">
                  {selectedTv.releaseYear || "N/A"}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-yellow-400 text-xs font-bold flex items-center gap-1">
                  <i className="fa-solid fa-star text-[10px]" />
                  <span>{selectedTv.rating}</span>
                </span>
              </div>
              <h2 className="text-2xl font-black text-white">
                {selectedTv.title}
              </h2>
              {selectedTv.originalTitle && selectedTv.originalTitle !== selectedTv.title && (
                <p className="text-xs text-zinc-400 italic">
                  Judul Asli: {selectedTv.originalTitle}
                </p>
              )}
              <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                {selectedTv.description || "Tidak ada ringkasan sinopsis."}
              </p>
              <div className="text-xs text-zinc-400 pt-1 flex items-center gap-3">
                <span>Total Musim: {selectedTv.numberOfSeasons || seasonsList.length}</span>
                <span>?</span>
                <span>Total Episode: {selectedTv.numberOfEpisodes || "Banyak"}</span>
              </div>
            </div>
          </div>

          {/* Episode Configuration Section */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-red-500" />
                  <span>Langkah 2: Isi Link Video Episode</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Pilih musim di bawah lalu masukkan tautan video streaming (Google Drive / URL MP4 / Embed) untuk setiap episode.
                </p>
              </div>

              {/* Season Select Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-medium">Musim:</span>
                <select
                  value={activeSeason}
                  onChange={(e) => handleSeasonChange(Number(e.target.value))}
                  className="px-3.5 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-red-500 cursor-pointer shadow-md"
                >
                  {seasonsList.map((s) => (
                    <option key={s.season_number} value={s.season_number}>
                      {s.name || `Season ${s.season_number}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingSeason ? (
              <div className="py-16 text-center text-zinc-400 flex items-center justify-center">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-red-500" />
              </div>
            ) : currentEpisodesList.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                <i className="fa-solid fa-film text-3xl mb-2 block" />
                <span>Tidak ada data episode pada musim ini.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {currentEpisodesList.map((ep) => (
                  <div
                    key={ep.episodeNumber}
                    className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col md:flex-row md:items-center gap-4"
                  >
                    {/* Episode Thumbnail */}
                    <div className="w-32 aspect-video relative rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0 border border-zinc-800">
                      <Image
                        src={ep.stillImage || selectedTv.bannerImage || "/images/hero-image.png"}
                        alt={ep.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-bold text-zinc-300">
                        {ep.runtime || "45m"}
                      </div>
                    </div>

                    {/* Episode Info */}
                    <div className="w-full md:w-64 flex-shrink-0">
                      <div className="text-xs font-bold text-red-500">
                        S{activeSeason} • Episode {ep.episodeNumber}
                      </div>
                      <div className="text-sm font-bold text-white truncate mt-0.5">
                        {ep.name || `Episode ${ep.episodeNumber}`}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                        {ep.overview || "Tidak ada ringkasan sinopsis."}
                      </div>
                    </div>

                    {/* Video URL Input & Test Button */}
                    <div className="flex-1 flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={ep.videoUrl || ""}
                          onChange={(e) =>
                            handleVideoUrlChange(
                              activeSeason,
                              ep.episodeNumber,
                              e.target.value
                            )
                          }
                          placeholder="Paste Google Drive URL / MP4 / Embed link..."
                          className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 font-mono"
                        />
                        <i className="fa-solid fa-link absolute left-2.5 top-2.5 text-zinc-500 text-xs" />
                      </div>

                      {ep.videoUrl && (
                        <a
                          href={ep.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer"
                          title="Buka link di tab baru untuk menguji"
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                          <span className="hidden sm:inline">Test Link</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Save Action */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-800">
            <Link
              href="/admin/tv"
              className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold transition"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold shadow-xl shadow-red-900/30 transition cursor-pointer flex items-center gap-2"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" />
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check" />
                  <span>Simpan Serial TV & Episode</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
