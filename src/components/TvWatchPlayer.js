"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /(?:v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

function extractDriveId(url) {
  if (!url) return null;
  const patterns = [
    /\/d\/([^/]+)/,
    /id=([^&]+)/,
    /\/file\/([^/?]+)/,
    /\/open\?id=([^&]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

export default function TvWatchPlayer({
  tv,
  currentSeasonNumber,
  currentEpisodeNumber,
  seasonEpisodes = [],
  embedUrl = null,
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [playerMode, setPlayerMode] = useState("clean");

  const isDrive =
    embedUrl &&
    (embedUrl.includes("drive.google.com") || embedUrl.includes("docs.google.com"));
  const driveId = isDrive ? extractDriveId(embedUrl) : null;
  const streamSrc = isDrive && driveId ? `/api/stream/gdrive?fileId=${driveId}` : embedUrl;

  const currentEpisode =
    seasonEpisodes.find((ep) => ep.episodeNumber === currentEpisodeNumber) ||
    seasonEpisodes[0] || {
      episodeNumber: currentEpisodeNumber,
      seasonNumber: currentSeasonNumber,
      name: `Episode ${currentEpisodeNumber}`,
      overview: "",
    };

  const hasPrev = currentEpisodeNumber > 1;
  const hasNext = currentEpisodeNumber < seasonEpisodes.length;

  const goToEpisode = (epNum) => {
    setDrawerOpen(false);
    router.push(`/tv/${tv.id}/watch?season=${currentSeasonNumber}&episode=${epNum}`);
  };

  const youTubeId = getYouTubeId(tv?.trailerUrl);

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col overflow-hidden relative select-none">
      {/* Top Header Bar */}
      <header className="h-14 bg-black/90 border-b border-zinc-800 px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-3">
          <Link
            href={`/tv/${tv.id}`}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <i className="fa-solid fa-arrow-left" />
            <span>Kembali ke Detail</span>
          </Link>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-white truncate max-w-md">
              {tv.title}
              <span className="text-red-500 ml-2 font-normal">
                S{currentSeasonNumber} • E{currentEpisode.episodeNumber}: {currentEpisode.name}
              </span>
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isDrive && (
            <button
              onClick={() => setPlayerMode(playerMode === "clean" ? "embed" : "clean")}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Ganti Mode Pemutar"
            >
              <i
                className={
                  playerMode === "clean"
                    ? "fa-brands fa-google-drive text-yellow-400"
                    : "fa-solid fa-play text-red-500"
                }
              />
              <span className="hidden md:inline">
                {playerMode === "clean" ? "Mode Embed" : "Mode Player"}
              </span>
            </button>
          )}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              drawerOpen
                ? "bg-red-600 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            <i className="fa-solid fa-layer-group" />
            <span>Pilih Episode ({seasonEpisodes.length})</span>
          </button>
        </div>
      </header>

      {/* Main Video Area with Drawer */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Video Player Frame */}
        <div className="flex-1 w-full h-full bg-black relative flex items-center justify-center">
          {embedUrl ? (
            playerMode === "clean" ? (
              <div className="w-full h-full relative flex items-center justify-center bg-black">
                <video
                  key={`tv-video-${currentSeasonNumber}-${currentEpisodeNumber}`}
                  src={streamSrc}
                  controls
                  playsInline
                  webkit-playsinline="true"
                  x5-playsinline="true"
                  className="w-full h-full object-contain"
                  onError={() => setPlayerMode("embed")}
                />
              </div>
            ) : (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
                style={{ border: 0 }}
              />
            )
          ) : youTubeId ? (
            <div className="w-full h-full flex flex-col">
              <iframe
                src={`https://www.youtube.com/embed/${youTubeId}?autoplay=1&controls=1`}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
                style={{ border: 0 }}
              />
              <div className="absolute bottom-16 left-4 z-30 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl text-xs text-yellow-400 border border-yellow-500/30">
                <i className="fa-solid fa-circle-info mr-1.5" />
                Streaming episode ini belum di-upload di server, memutar trailer resmi.
              </div>
            </div>
          ) : (
            <div className="text-center p-8 max-w-md">
              <i className="fa-solid fa-video-slash text-4xl text-zinc-600 mb-3 block" />
              <h2 className="text-lg font-bold text-white mb-2">Video Belum Tersedia</h2>
              <p className="text-xs text-zinc-400 mb-4">
                Episode ini belum memiliki file streaming yang terhubung di server Jazflix.
              </p>
              <Link
                href={`/tv/${tv.id}`}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Kembali ke Detail Serial
              </Link>
            </div>
          )}
        </div>

        {/* Slide-over Episode Selector Drawer */}
        {drawerOpen && (
          <aside className="absolute right-0 top-0 bottom-0 w-80 md:w-96 bg-zinc-950/95 border-l border-zinc-800 z-50 flex flex-col shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Season {currentSeasonNumber}</h3>
                <p className="text-[11px] text-zinc-400">{seasonEpisodes.length} Episode Tersedia</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {seasonEpisodes.map((ep) => {
                const isCurrent = ep.episodeNumber === currentEpisode.episodeNumber;
                return (
                  <div
                    key={ep.id}
                    onClick={() => goToEpisode(ep.episodeNumber)}
                    className={`p-2.5 rounded-xl cursor-pointer flex gap-3 transition ${
                      isCurrent
                        ? "bg-red-600/20 border border-red-500/50"
                        : "bg-zinc-900/60 hover:bg-zinc-800/80 border border-transparent"
                    }`}
                  >
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-zinc-950 flex-shrink-0">
                      <Image
                        src={ep.stillImage || "/images/hero-image.png"}
                        alt={ep.name}
                        fill
                        className="object-cover"
                      />
                      {isCurrent && (
                        <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center">
                          <i className="fa-solid fa-play text-white text-xs" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span>Eps {ep.episodeNumber}</span>
                          {ep.hasVideo && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                              HD
                            </span>
                          )}
                        </div>
                        {ep.runtime && <span>{ep.runtime}</span>}
                      </div>
                      <div className={`font-semibold text-xs truncate ${isCurrent ? "text-red-400" : "text-white"}`}>
                        {ep.name}
                      </div>
                      <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                        {ep.overview || "Episode " + ep.episodeNumber}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Episode Navigation Bar */}
      <footer className="h-14 bg-black/90 border-t border-zinc-800 px-4 flex items-center justify-between z-40">
        <button
          onClick={() => hasPrev && goToEpisode(currentEpisodeNumber - 1)}
          disabled={!hasPrev}
          className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-zinc-300 hover:text-white transition flex items-center gap-2 cursor-pointer"
        >
          <i className="fa-solid fa-backward-step" />
          <span className="hidden sm:inline">Episode Sebelumnya</span>
        </button>

        <div className="text-center">
          <div className="text-xs font-bold text-white">
            Season {currentSeasonNumber} • Episode {currentEpisode.episodeNumber}
          </div>
          <div className="text-[10px] text-zinc-400 truncate max-w-xs sm:max-w-md">
            {currentEpisode.name}
          </div>
        </div>

        <button
          onClick={() => hasNext && goToEpisode(currentEpisodeNumber + 1)}
          disabled={!hasNext}
          className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition flex items-center gap-2 cursor-pointer shadow-md shadow-red-900/30"
        >
          <span className="hidden sm:inline">Episode Selanjutnya</span>
          <i className="fa-solid fa-forward-step" />
        </button>
      </footer>
    </div>
  );
}
