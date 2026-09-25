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

const getDriveId = (url) => {
  if (!url) return null;
  const patterns = [
    /\/d\/([^/]+)/,
    /id=([^&]+)/,
    /\/file\/([^/?]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
};

const getEmbedUrl = (rawUrl) => {
  if (!rawUrl) return null;
  if (rawUrl.includes("drive.google.com") || rawUrl.includes("docs.google.com")) {
    const fileId = getDriveId(rawUrl);
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview?autoplay=1`;
    }
  }
  return rawUrl;
};

export default function TvDetail({
  tv,
  initialEpisodes = [],
  similarTv = [],
  hasDbVideo = false,
  localEpisodes = [],
}) {
  const [showFullPlot, setShowFullPlot] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(
    tv?.seasons?.[0]?.season_number || 1
  );
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [loadingSeason, setLoadingSeason] = useState(false);

  // Find the first episode that has a video link in local database
  const firstPlayableEp = localEpisodes.find(
    (e) => e.videoUrl && e.videoUrl.trim()
  );

  // Selected Episode (default null -> displays full TV Show; when clicked -> displays episode data)
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [loadingEpisodeTrailer, setLoadingEpisodeTrailer] = useState(false);

  // View Mode: 'stream' (if hasDbVideo) or 'trailer'
  // When an episode is selected, prioritize that episode's trailerUrl (do not fall back to main TV show trailer)
  const youTubeId = getYouTubeId(
    selectedEpisode ? selectedEpisode.trailerUrl : tv?.trailerUrl
  );
  const [viewMode, setViewMode] = useState(hasDbVideo && firstPlayableEp ? "stream" : "trailer");

  // Handler when clicking episode card / preview image
  const selectEpisode = async (ep) => {
    // 1. Set current episode data immediately
    setSelectedEpisode(ep);

    // 2. If episode has video in local db, set streamingEp
    const dbEp = localEpisodes.find(
      (e) => e.seasonNumber === (ep.seasonNumber || selectedSeason) && e.episodeNumber === ep.episodeNumber
    );
    if (dbEp?.videoUrl) {
      setStreamingEp(dbEp);
    }

    // 3. Switch view to trailer for this episode
    setViewMode("trailer");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // 4. If episode does not have its own trailerUrl, fetch it from TMDB episode API with YouTube fallback
    if (!ep.trailerUrl) {
      setLoadingEpisodeTrailer(true);
      try {
        const sNum = ep.seasonNumber || selectedSeason;
        const res = await fetch(
          `/api/tmdb/tv/${tv.id}/season/${sNum}/episode/${ep.episodeNumber}?title=${encodeURIComponent(tv.title || "")}`
        );
        if (res.ok) {
          const detail = await res.json();
          if (detail) {
            setSelectedEpisode((prev) =>
              prev && prev.episodeNumber === ep.episodeNumber
                ? { ...prev, ...detail, trailerUrl: detail.trailerUrl || "" }
                : prev
            );
            // Cache in episodes array so subsequent clicks are instant
            setEpisodes((prev) =>
              prev.map((e) =>
                e.episodeNumber === ep.episodeNumber
                  ? { ...e, trailerUrl: detail.trailerUrl || "" }
                  : e
              )
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch episode trailer:", err);
      } finally {
        setLoadingEpisodeTrailer(false);
      }
    }
  };

  const resetToTvShow = () => {
    setSelectedEpisode(null);
    setViewMode(hasDbVideo && firstPlayableEp ? "stream" : "trailer");
  };

  const handleSeasonChange = async (seasonNum) => {
    setSelectedSeason(seasonNum);
    setSelectedEpisode(null);
    setLoadingSeason(true);
    try {
      const [seasonRes, localRes] = await Promise.all([
        fetch(`/api/tmdb/tv/${tv.id}/season/${seasonNum}`).then((r) => r.json()),
        fetch(`/api/tv/${tv.id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      const eps = (seasonRes.episodes || []).map((e) => {
        const dbEp = localRes?.episodes?.find(
          (x) => x.seasonNumber === seasonNum && x.episodeNumber === e.episodeNumber
        );
        return {
          ...e,
          hasVideo: Boolean(dbEp?.videoUrl && dbEp.videoUrl.trim()),
          videoUrl: dbEp?.videoUrl || "",
        };
      });

      setEpisodes(eps);
    } catch (err) {
      console.error("Failed to load season episodes:", err);
    } finally {
      setLoadingSeason(false);
    }
  };

  const playEpisodeInHero = (ep) => {
    const dbEp = localEpisodes.find(
      (e) => e.seasonNumber === (ep.seasonNumber || selectedSeason) && e.episodeNumber === ep.episodeNumber
    ) || { ...ep, videoUrl: ep.videoUrl };

    setStreamingEp(dbEp);
    setViewMode("stream");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!tv) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-24 pb-16 text-white space-y-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href="/" className="hover:text-white transition">Home</Link>
        <span>/</span>
        <Link href="/tv" className="hover:text-white transition">TV Shows</Link>
        <span>/</span>
        <span className="text-red-500 truncate max-w-xs">{tv.title}</span>
      </div>

      {/* Main Info Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left 2 Cols: Media Viewport (Stream Player / Trailer) */}
        <div className="md:col-span-2 flex flex-col justify-between space-y-3">
          {/* Menu View Switcher Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasDbVideo && streamingEp && (
                <button
                  onClick={() => setViewMode("stream")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    viewMode === "stream"
                      ? "bg-red-600 text-white shadow-lg shadow-red-900/30"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  }`}
                >
                  <i className="fa-solid fa-play text-[10px]" />
                  <span>
                    Streaming: S{streamingEp.seasonNumber} E{streamingEp.episodeNumber}
                  </span>
                </button>
              )}
              {Boolean(youTubeId || selectedEpisode || tv?.trailerUrl) && (
                <button
                  onClick={() => setViewMode("trailer")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    viewMode === "trailer"
                      ? "bg-red-600 text-white shadow-lg shadow-red-900/30"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  }`}
                >
                  <i className="fa-solid fa-film text-[10px]" />
                  <span>
                    {selectedEpisode
                      ? `Trailer: S${selectedEpisode.seasonNumber || selectedSeason} E${selectedEpisode.episodeNumber}`
                      : "Trailer Resmi"}
                  </span>
                </button>
              )}
            </div>

            {/* Direct Link to Fullscreen Watch Player or Reset to Main Show */}
            <div className="flex items-center gap-3">
              {selectedEpisode && (
                <button
                  onClick={resetToTvShow}
                  className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 font-semibold transition cursor-pointer"
                  title="Kembali ke Info Utama Serial TV"
                >
                  <i className="fa-solid fa-rotate-left text-[11px]" />
                  <span>Info Serial</span>
                </button>
              )}
              {viewMode === "stream" && streamingEp && (
                <Link
                  href={`/tv/${tv.id}/watch?season=${streamingEp.seasonNumber}&episode=${streamingEp.episodeNumber}`}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 font-semibold transition"
                  title="Buka Pemutar Layar Penuh"
                >
                  <span>Layar Penuh</span>
                  <i className="fa-solid fa-expand text-[11px]" />
                </Link>
              )}
            </div>
          </div>

          {/* Video Player Container */}
          <div className="rounded-2xl overflow-hidden shadow-2xl bg-zinc-900 relative min-h-[350px] md:min-h-[480px] border border-zinc-800 flex-1">
            {loadingEpisodeTrailer && (
              <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center text-white backdrop-blur-sm">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-red-500" />
              </div>
            )}

            {viewMode === "stream" && streamingEp?.videoUrl ? (
              <iframe
                key={`stream-${streamingEp.seasonNumber}-${streamingEp.episodeNumber}`}
                className="w-full h-full min-h-[350px] md:min-h-[480px]"
                src={getEmbedUrl(streamingEp.videoUrl)}
                allow="autoplay; fullscreen"
                allowFullScreen
                style={{ border: 0 }}
              />
            ) : youTubeId ? (
              <iframe
                key={`trailer-${youTubeId}-${selectedEpisode ? selectedEpisode.episodeNumber : "main"}`}
                className="w-full h-full min-h-[350px] md:min-h-[480px] object-cover"
                src={`https://www.youtube.com/embed/${youTubeId}?autoplay=1&controls=1`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                style={{ border: 0 }}
              />
            ) : (
              <div className="relative w-full h-[350px] md:h-[480px]">
                <Image
                  src={
                    selectedEpisode?.stillImage ||
                    tv.bannerImage ||
                    tv.posterImage ||
                    "/images/hero-image.png"
                  }
                  alt={selectedEpisode?.name || tv.title || "TV Banner"}
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent flex items-end p-6">
                  <span className="text-zinc-400 text-xs italic bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-md">
                    {selectedEpisode
                      ? `Trailer untuk Episode ${selectedEpisode.episodeNumber} tidak tersedia`
                      : "Trailer & link video tidak tersedia"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Metadata & Action Card */}
        <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-red-500 uppercase tracking-widest block">
                    {selectedEpisode
                      ? `Episode ${selectedEpisode.episodeNumber}`
                      : "Serial Televisi"}
                  </span>
                  {selectedEpisode && (
                    <button
                      onClick={resetToTvShow}
                      className="text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800 transition cursor-pointer"
                    >
                      Kembali ke Serial
                    </button>
                  )}
                </div>
                <h1 className="text-2xl font-black text-white leading-tight">
                  {selectedEpisode
                    ? `${selectedEpisode.episodeNumber}. ${selectedEpisode.name}`
                    : tv.title}
                </h1>
                {selectedEpisode && (
                  <p className="text-xs text-zinc-400 mt-1 font-semibold">
                    {tv.title} • Season {selectedEpisode.seasonNumber || selectedSeason}
                  </p>
                )}
              </div>

              {/* Rating Badge */}
              {(selectedEpisode ? selectedEpisode.rating : tv.rating) &&
                (selectedEpisode ? selectedEpisode.rating : tv.rating) !== "N/A" && (
                  <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-yellow-500/30 text-yellow-400 text-sm font-bold flex items-center gap-1.5 shadow-md flex-shrink-0">
                    <i className="fa-solid fa-star text-xs" />
                    <span>{selectedEpisode ? selectedEpisode.rating : tv.rating}</span>
                  </div>
                )}
            </div>

            {/* Tags & Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 font-semibold">
                {tv.ageRating || "TV-14"}
              </span>

              {selectedEpisode ? (
                <>
                  {selectedEpisode.airDate && (
                    <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 font-semibold flex items-center gap-1">
                      <i className="fa-solid fa-calendar text-[10px]" />
                      <span>{selectedEpisode.airDate}</span>
                    </span>
                  )}
                  {selectedEpisode.runtime && (
                    <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 font-semibold flex items-center gap-1">
                      <i className="fa-solid fa-clock text-[10px]" />
                      <span>{selectedEpisode.runtime}</span>
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-md bg-red-950/60 border border-red-800/40 text-red-300 text-[11px] font-semibold">
                    S{selectedEpisode.seasonNumber || selectedSeason} E{selectedEpisode.episodeNumber}
                  </span>
                </>
              ) : (
                <>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 font-semibold">
                    {tv.releaseYear || "N/A"}
                    {tv.endYear && tv.endYear !== tv.releaseYear ? ` - ${tv.endYear}` : ""}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 font-semibold">
                    {tv.numberOfSeasons || 1} Musim
                  </span>
                  {tv.status && (
                    <span className="px-2.5 py-1 rounded-md bg-red-950/60 border border-red-800/40 text-red-300 text-[11px] font-semibold">
                      {tv.status}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Creators & Overview */}
            <div className="text-xs text-zinc-300 space-y-2.5 pt-2">
              {!selectedEpisode && tv.originalTitle && tv.originalTitle !== tv.title && (
                <p>
                  <span className="text-zinc-400 font-medium">Judul Asli: </span>
                  <span className="text-white">{tv.originalTitle}</span>
                </p>
              )}
              {tv.genres?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tv.genres.map((g, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
              {!selectedEpisode && tv.creators?.length > 0 && (
                <p>
                  <span className="text-zinc-400 font-medium">Kreator: </span>
                  <span className="text-white font-semibold">{tv.creators.join(", ")}</span>
                </p>
              )}
              {tv.actors?.length > 0 && (
                <p>
                  <span className="text-zinc-400 font-medium">Pemeran: </span>
                  <span className="text-white">{tv.actors.join(", ")}</span>
                </p>
              )}

              {/* Synopsis / Description (Episode vs TV Show) */}
              {(selectedEpisode ? selectedEpisode.overview : tv.description) && (
                <div className="pt-2">
                  <span className="text-zinc-400 font-medium block mb-1">
                    {selectedEpisode ? "Sinopsis Episode:" : "Sinopsis:"}
                  </span>
                  <p className="text-zinc-300 leading-relaxed text-xs">
                    {(() => {
                      const desc = selectedEpisode
                        ? selectedEpisode.overview || "Tidak ada ringkasan sinopsis untuk episode ini."
                        : tv.description;
                      if (showFullPlot || desc.length <= 160) return desc;
                      return `${desc.substring(0, 160)}...`;
                    })()}
                    {((selectedEpisode ? selectedEpisode.overview : tv.description) || "").length >
                      160 && (
                      <button
                        onClick={() => setShowFullPlot(!showFullPlot)}
                        className="text-red-500 hover:text-red-400 ml-1.5 font-semibold cursor-pointer underline inline-block"
                      >
                        {showFullPlot ? "Sembunyikan" : "Selengkapnya"}
                      </button>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Conditional Play Button: Dynamic according to selected episode or full TV series */}
          {(() => {
            const currentPlayTarget = selectedEpisode
              ? localEpisodes.find(
                  (e) =>
                    e.seasonNumber === (selectedEpisode.seasonNumber || selectedSeason) &&
                    e.episodeNumber === selectedEpisode.episodeNumber &&
                    Boolean(e.videoUrl && e.videoUrl.trim())
                )
              : firstPlayableEp;

            if (currentPlayTarget) {
              return (
                <Link
                  href={`/tv/${tv.id}/watch?season=${currentPlayTarget.seasonNumber}&episode=${currentPlayTarget.episodeNumber}`}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold text-sm transition shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <i className="fa-solid fa-play transition-transform group-hover:scale-110" />
                  <span>
                    Play {selectedEpisode ? `Episode ${selectedEpisode.episodeNumber}` : "Serial"} (S
                    {currentPlayTarget.seasonNumber} E{currentPlayTarget.episodeNumber})
                  </span>
                </Link>
              );
            }

            return (
              <div className="w-full bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 py-3.5 rounded-xl text-center text-xs flex items-center justify-center gap-2">
                <i className="fa-solid fa-circle-info" />
                <span>
                  {selectedEpisode
                    ? `Episode ${selectedEpisode.episodeNumber} belum tersedia untuk streaming`
                    : "Belum tersedia untuk streaming di Jazflix"}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Episode Explorer Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <i className="fa-solid fa-layer-group text-red-500" />
              <span>Episodes</span>
            </h2>
          </div>

          {/* Seasons Switcher Select */}
          {tv.seasons && tv.seasons.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-medium">Musim:</span>
              <select
                value={selectedSeason}
                onChange={(e) => handleSeasonChange(Number(e.target.value))}
                className="px-3.5 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-red-500 cursor-pointer shadow-md"
              >
                {tv.seasons.map((s) => (
                  <option key={s.season_number} value={s.season_number}>
                    {s.name || `Season ${s.season_number}`}
                    {s.episode_count ? ` (${s.episode_count} eps)` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Episode Cards Grid */}
        {loadingSeason ? (
          <div className="py-20 text-center text-zinc-400 flex items-center justify-center">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-red-500" />
          </div>
        ) : episodes.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800/60">
            <i className="fa-solid fa-film text-3xl mb-2 block" />
            <span>Tidak ada data episode untuk Season {selectedSeason}.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {episodes.map((ep) => (
              <div
                key={ep.id || `${selectedSeason}-${ep.episodeNumber}`}
                className="bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden transition duration-200 flex flex-col justify-between group shadow-lg"
              >
                <div>
                  {/* Episode Still Image (Klik untuk memuat trailer & detail episode di atas) */}
                  <div
                    onClick={() => selectEpisode(ep)}
                    className="relative w-full aspect-video bg-zinc-950 overflow-hidden cursor-pointer group/still"
                    title={`Klik untuk lihat trailer & detail ${ep.name}`}
                  >
                    <Image
                      src={ep.stillImage || "/images/hero-image.png"}
                      alt={ep.name}
                      fill
                      className="object-cover group-hover/still:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-red-400 text-[11px] font-bold border border-red-500/30">
                      S{ep.seasonNumber || selectedSeason} • E{ep.episodeNumber}
                    </div>
                    {ep.rating && ep.rating !== "N/A" && (
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-yellow-400 text-[11px] font-semibold border border-yellow-500/30 flex items-center gap-1">
                        <i className="fa-solid fa-star text-[10px]" />
                        <span>{ep.rating}</span>
                      </div>
                    )}
                    {/* Hover Overlay Play Icon */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/still:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg shadow-red-900/50 transform scale-90 group-hover/still:scale-100 transition-transform">
                        <i className="fa-solid fa-play text-sm ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Episode Details */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-white group-hover:text-red-400 transition line-clamp-1">
                        {ep.episodeNumber}. {ep.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                      {ep.airDate && (
                        <span className="flex items-center gap-1">
                          <i className="fa-solid fa-calendar text-[10px]" />
                          <span>{ep.airDate}</span>
                        </span>
                      )}
                      {ep.runtime && (
                        <span className="flex items-center gap-1">
                          <i className="fa-solid fa-clock text-[10px]" />
                          <span>{ep.runtime}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {ep.overview || "Tidak ada ringkasan sinopsis untuk episode ini."}
                    </p>
                  </div>
                </div>

                {/* Watch Button / Availability Indicator */}
                <div className="p-4 pt-0 space-y-2">
                  {ep.hasVideo ? (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tv/${tv.id}/watch?season=${ep.seasonNumber || selectedSeason}&episode=${ep.episodeNumber}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer border border-red-500 shadow-md shadow-red-900/30"
                      >
                        <i className="fa-solid fa-play text-[10px]" />
                        <span>Tonton Episode {ep.episodeNumber} (HD)</span>
                      </Link>
                      <button
                        onClick={() => playEpisodeInHero(ep)}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                        title="Putar langsung di layar atas"
                      >
                        <i className="fa-solid fa-tv text-xs" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full py-2 px-3 rounded-xl bg-zinc-800/60 text-zinc-500 text-xs font-semibold flex items-center justify-center gap-1.5 border border-zinc-800 text-center">
                      <i className="fa-solid fa-circle-info text-[10px]" />
                      <span>Belum Tersedia untuk Streaming</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Similar TV Shows Section */}
      {similarTv?.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <i className="fa-solid fa-tv text-red-500" />
            <span>Rekomendasi Serupa</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {similarTv.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                href={`/tv/${item.id}`}
                className="group rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-red-500/50 transition hover:scale-105 duration-200"
              >
                <div className="aspect-[4/6] relative bg-zinc-950">
                  <Image
                    src={item.posterImage || "/images/no-photo.png"}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-yellow-400 font-bold flex items-center gap-0.5">
                    <i className="fa-solid fa-star text-[9px]" />
                    <span>{item.rating}</span>
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="font-semibold text-xs text-white truncate group-hover:text-red-400">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {item.releaseYear || "N/A"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
