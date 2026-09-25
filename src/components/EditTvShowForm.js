"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EditTvShowForm({ initialTvShow }) {
  const router = useRouter();
  const [activeSeason, setActiveSeason] = useState(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState({});
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [saving, setSaving] = useState(false);

  // Group existing episodes from initialTvShow by season
  useEffect(() => {
    if (!initialTvShow) return;

    const map = {};
    const existing = initialTvShow.episodes || [];
    existing.forEach((ep) => {
      const s = ep.seasonNumber || 1;
      if (!map[s]) map[s] = [];
      map[s].push(ep);
    });

    // If season 1 has episodes, set active to 1, or the first available season
    const firstS = Object.keys(map)[0] ? Number(Object.keys(map)[0]) : 1;
    setActiveSeason(firstS);
    setSeasonEpisodes(map);

    // If some season is empty, we can fetch from TMDB
    loadSeasonData(firstS, map);
  }, [initialTvShow]);

  const loadSeasonData = async (sNum, currentMap = seasonEpisodes) => {
    if (currentMap[sNum] && currentMap[sNum].length > 0) {
      return;
    }
    setLoadingSeason(true);
    try {
      const res = await fetch(`/api/tmdb/tv/${initialTvShow.tvId}/season/${sNum}`);
      const data = await res.json();
      const fetched = (data.episodes || []).map((ep) => ({
        seasonNumber: sNum,
        episodeNumber: ep.episodeNumber,
        name: ep.name,
        overview: ep.overview,
        stillImage: ep.stillImage,
        airDate: ep.airDate,
        runtime: ep.runtime,
        videoUrl: "",
      }));

      // Merge with any existing videoUrls
      setSeasonEpisodes((prev) => ({
        ...prev,
        [sNum]: fetched,
      }));
    } catch (err) {
      console.error(`Failed to load season ${sNum} from TMDB:`, err);
    } finally {
      setLoadingSeason(false);
    }
  };

  const handleSeasonChange = (sNum) => {
    setActiveSeason(sNum);
    loadSeasonData(sNum);
  };

  const handleVideoUrlChange = (sNum, epNum, url) => {
    setSeasonEpisodes((prev) => {
      const list = prev[sNum] || [];
      const updated = list.map((ep) =>
        ep.episodeNumber === epNum ? { ...ep, videoUrl: url } : ep
      );
      return { ...prev, [sNum]: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const allEpisodes = [];
      Object.values(seasonEpisodes).forEach((eps) => {
        allEpisodes.push(...eps);
      });

      const payload = {
        episodes: allEpisodes,
      };

      const res = await fetch(`/api/tv/${initialTvShow._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Data serial TV & video episode berhasil diperbarui!");
        router.push("/admin/tv");
      } else {
        const err = await res.json();
        alert(err.message || "Gagal memperbarui data.");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Terjadi kesalahan saat memperbarui.");
    } finally {
      setSaving(false);
    }
  };

  if (!initialTvShow) {
    return (
      <div className="py-20 text-center text-white">
        <h2 className="text-xl font-bold">Serial TV Tidak Ditemukan</h2>
        <Link href="/admin/tv" className="text-red-500 mt-2 inline-block">
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  const currentEpisodesList = seasonEpisodes[activeSeason] || [];
  const numSeasons = initialTvShow.numberOfSeasons || 1;
  const seasonsArray = Array.from({ length: numSeasons }, (_, i) => i + 1);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Link href="/admin/tv" className="hover:text-white transition">
              Kelola Serial TV
            </Link>
            <i className="fa-solid fa-chevron-right text-[10px]" />
            <span className="text-zinc-200">Kelola Episode</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <i className="fa-solid fa-pen-to-square text-amber-500" />
            <span>Kelola Episode: {initialTvShow.title}</span>
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Show Metadata Summary Banner */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6">
          <div className="w-24 h-36 relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-700 flex-shrink-0 mx-auto md:mx-0">
            <Image
              src={initialTvShow.posterImage || "/images/no-photo.png"}
              alt={initialTvShow.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 space-y-1.5 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-red-600 text-white text-xs font-bold">
                TMDB: {initialTvShow.tvId}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-semibold">
                {initialTvShow.releaseYear || "N/A"}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-yellow-400 text-xs font-bold flex items-center gap-1">
                <i className="fa-solid fa-star text-[10px]" />
                <span>{initialTvShow.rating}</span>
              </span>
            </div>
            <h2 className="text-xl font-black text-white">
              {initialTvShow.title}
            </h2>
            <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
              {initialTvShow.description || "Tidak ada ringkasan sinopsis."}
            </p>
            <div className="text-xs text-zinc-400 pt-1 flex items-center gap-3">
              <span>Total Musim: {numSeasons}</span>
              <span>•</span>
              <Link
                href={`/tv/${initialTvShow.tvId}`}
                target="_blank"
                className="text-red-400 hover:underline flex items-center gap-1"
              >
                <span>Buka Halaman Streaming</span>
                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
              </Link>
            </div>
          </div>
        </div>

        {/* Season & Episode Manager */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-layer-group text-red-500" />
                <span>Pilih Musim & Konfigurasi Video URL</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pilih musim dan perbarui link streaming episode di bawah ini.
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
                {seasonsArray.map((sNum) => {
                  const count = (seasonEpisodes[sNum] || []).filter(
                    (e) => e.videoUrl && e.videoUrl.trim()
                  ).length;
                  return (
                    <option key={sNum} value={sNum}>
                      Season {sNum} {count > 0 ? `(${count} video)` : ""}
                    </option>
                  );
                })}
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
                      src={
                        ep.stillImage ||
                        initialTvShow.bannerImage ||
                        "/images/hero-image.png"
                      }
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
                        className={`w-full pl-8 pr-3 py-2 bg-zinc-900 border rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none font-mono ${
                          ep.videoUrl
                            ? "border-emerald-500/50 focus:border-emerald-500"
                            : "border-zinc-700 focus:border-red-500"
                        }`}
                      />
                      <i
                        className={`fa-solid fa-link absolute left-2.5 top-2.5 text-xs ${
                          ep.videoUrl ? "text-emerald-400" : "text-zinc-500"
                        }`}
                      />
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
                <span>Menyimpan Perubahan...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-check" />
                <span>Simpan Perubahan Episode</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
