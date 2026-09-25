"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === null) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

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

export default function CleanVideoPlayer({
  title = "Film",
  backUrl = "/",
  videoUrl = "",
  subTitle = "",
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const isDrive =
    videoUrl &&
    (videoUrl.includes("drive.google.com") || videoUrl.includes("docs.google.com"));
  const driveId = isDrive ? extractDriveId(videoUrl) : null;

  // Stream source url: if Drive, stream through our clean API proxy; else direct url
  const streamSrc = isDrive && driveId
    ? `/api/stream/gdrive?fileId=${driveId}`
    : videoUrl;

  // Player mode: 'clean' (default HTML5 Jazflix player) or 'embed' (Drive iframe fallback)
  const [playerMode, setPlayerMode] = useState("clean");

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Auto-hide controls timer
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3500);
    }
  }, [isPlaying]);

  // Handle Play / Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.log("Play interrupted:", err));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Handle Seek
  const handleSeek = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const seekTime = Math.max(0, Math.min(pos * duration, duration));
    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
    resetControlsTimeout();
  };

  // Skip 10 seconds forward / backward
  const skipTime = (seconds) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    resetControlsTimeout();
  };

  // Double tap on mobile to skip
  const handleTap = (e) => {
    resetControlsTimeout();
  };

  // Handle Volume Change
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMute = !isMuted;
    videoRef.current.muted = newMute;
    setIsMuted(newMute);
    if (!newMute && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  // Handle Fullscreen Toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if (containerRef.current.webkitRequestFullscreen) {
          await containerRef.current.webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  // Picture in Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP error:", err);
    }
  };

  // Handle Speed Change
  const changeSpeed = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  // Sync fullscreen change event
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["input", "textarea"].includes(document.activeElement?.tagName?.toLowerCase())) {
        return;
      }
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          skipTime(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          skipTime(10);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "arrowup":
          e.preventDefault();
          setVolume((v) => {
            const nv = Math.min(1, v + 0.1);
            if (videoRef.current) videoRef.current.volume = nv;
            return nv;
          });
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume((v) => {
            const nv = Math.max(0, v - 0.1);
            if (videoRef.current) videoRef.current.volume = nv;
            return nv;
          });
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay]);

  // Video Time Update & Buffer
  const onTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);

    // Calculate buffered range
    if (videoRef.current.buffered.length > 0) {
      try {
        const bufferedEnd = videoRef.current.buffered.end(
          videoRef.current.buffered.length - 1
        );
        if (duration > 0) {
          setBuffered((bufferedEnd / duration) * 100);
        }
      } catch (e) {}
    }
  };

  const onLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
      // Autoplay
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Embed URL for Google Drive fallback
  const driveEmbedUrl = isDrive && driveId
    ? `https://drive.google.com/file/d/${driveId}/preview?autoplay=1`
    : videoUrl;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onClick={handleTap}
      className="w-full h-screen bg-black overflow-hidden relative select-none flex flex-col justify-between"
    >
      {/* Fallback Mode: Google Drive iframe Embed */}
      {playerMode === "embed" ? (
        <div className="w-full h-full relative">
          {/* Header Switcher Bar */}
          <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between">
            <Link
              href={backUrl}
              className="px-3.5 py-2 bg-black/80 hover:bg-black text-white rounded-xl text-xs backdrop-blur-md flex items-center gap-2 border border-zinc-800 transition"
            >
              <i className="fa-solid fa-arrow-left" />
              <span>Kembali</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 bg-black/70 px-3 py-1.5 rounded-lg border border-zinc-800 hidden sm:inline-block">
                Mode: Embed Google Drive
              </span>
              <button
                onClick={() => setPlayerMode("clean")}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-red-950/60 cursor-pointer"
              >
                <i className="fa-solid fa-play text-[10px]" />
                <span>Gunakan Pemutar Jazflix</span>
              </button>
            </div>
          </div>

          <iframe
            src={driveEmbedUrl}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
            style={{ border: 0 }}
          />
        </div>
      ) : (
        /* Clean Custom Player */
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {/* Main Video Element: playsInline prevents mobile browser from hijacking controls */}
          <video
            ref={videoRef}
            src={streamSrc}
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => {
              setIsLoading(false);
              setIsPlaying(true);
            }}
            onPause={() => setIsPlaying(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />

          {/* Loading Spinner */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 pointer-events-none z-20">
              <i className="fa-solid fa-spinner fa-spin text-4xl text-red-500 mb-3" />
              <span className="text-xs text-zinc-300 font-medium">Memuat video...</span>
            </div>
          )}

          {/* Stream Error Notification & Fallback Prompt */}
          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 z-40 text-center">
              <i className="fa-solid fa-triangle-exclamation text-4xl text-yellow-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Kendala Pemutaran Langsung</h3>
              <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
                Server Google Drive membatasi akses streaming langsung untuk file ini. Anda dapat tetap menonton film menggunakan Mode Embed Google Drive.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPlayerMode("embed")}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-950/60 transition cursor-pointer flex items-center gap-2"
                >
                  <i className="fa-solid fa-play" />
                  <span>Buka Mode Embed Drive</span>
                </button>
                <Link
                  href={backUrl}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  Kembali
                </Link>
              </div>
            </div>
          )}

          {/* Center Play Button Overlay on Pause */}
          {!isPlaying && !isLoading && !hasError && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 cursor-pointer transition-opacity"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-950/80 transition-transform transform hover:scale-110">
                <i className="fa-solid fa-play text-xl sm:text-2xl ml-1" />
              </div>
            </div>
          )}

          {/* Top Bar Overlay */}
          <div
            className={`absolute top-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-30 transition-opacity duration-300 flex items-center justify-between ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="flex items-center gap-3 truncate max-w-xl">
              <Link
                href={backUrl}
                className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-zinc-800 text-white text-xs border border-zinc-700/60 backdrop-blur-md flex items-center gap-2 transition flex-shrink-0 cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left text-[11px]" />
                <span className="hidden sm:inline">Kembali</span>
              </Link>
              <div className="truncate">
                <h1 className="text-sm sm:text-base font-bold text-white truncate leading-tight">
                  {title}
                </h1>
                {subTitle && (
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{subTitle}</p>
                )}
              </div>
            </div>

            {/* Switch to Drive Embed Button */}
            {isDrive && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setPlayerMode("embed")}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-zinc-700/60 backdrop-blur-md transition cursor-pointer flex items-center gap-1.5"
                  title="Jika mengalami kendala, beralih ke iframe Google Drive bawaan"
                >
                  <i className="fa-brands fa-google-drive text-[11px] text-yellow-400" />
                  <span className="hidden md:inline">Mode Embed</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Player Controls Overlay */}
          <div
            className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-30 transition-opacity duration-300 space-y-2 sm:space-y-3 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Scrubber Progress Bar */}
            <div
              className="relative w-full h-2.5 sm:h-3 group/progress cursor-pointer flex items-center"
              onClick={handleSeek}
            >
              {/* Background Track */}
              <div className="w-full h-1 sm:h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                {/* Buffered Bar */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-zinc-600 transition-all duration-200"
                  style={{ width: `${buffered}%` }}
                />
                {/* Played Progress Bar */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-red-600 rounded-full"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              {/* Scrubber Handle */}
              <div
                className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full shadow-md -translate-x-1/2 scale-0 group-hover/progress:scale-100 transition-transform pointer-events-none"
                style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>

            {/* Control Buttons Bar */}
            <div className="flex items-center justify-between gap-3 text-white text-xs sm:text-sm">
              {/* Left Controls */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition cursor-pointer text-white"
                  title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                >
                  <i
                    className={`fa-solid ${isPlaying ? "fa-pause" : "fa-play"} text-sm sm:text-base`}
                  />
                </button>

                {/* 10s Rewind */}
                <button
                  onClick={() => skipTime(-10)}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition cursor-pointer text-zinc-300 hover:text-white"
                  title="Mundur 10 detik"
                >
                  <i className="fa-solid fa-rotate-left text-xs sm:text-sm" />
                </button>

                {/* 10s Fast-Forward */}
                <button
                  onClick={() => skipTime(10)}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition cursor-pointer text-zinc-300 hover:text-white"
                  title="Maju 10 detik"
                >
                  <i className="fa-solid fa-rotate-right text-xs sm:text-sm" />
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    onClick={toggleMute}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition cursor-pointer text-zinc-300 hover:text-white"
                    title={isMuted ? "Unmute (M)" : "Mute (M)"}
                  >
                    <i
                      className={`fa-solid ${
                        isMuted || volume === 0
                          ? "fa-volume-xmark text-red-500"
                          : volume < 0.5
                          ? "fa-volume-low"
                          : "fa-volume-high"
                      } text-xs sm:text-sm`}
                    />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-14 sm:w-20 h-1 accent-red-600 bg-zinc-700 rounded-lg cursor-pointer hidden sm:block"
                  />
                </div>

                {/* Time Display */}
                <div className="text-[11px] sm:text-xs text-zinc-400 font-mono tracking-tight ml-1">
                  <span className="text-white">{formatTime(currentTime)}</span>
                  <span className="mx-1 text-zinc-600">/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1.5 sm:gap-3">
                {/* Playback Speed Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-2 py-1 rounded-md hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                    title="Kecepatan Pemutaran"
                  >
                    {playbackRate}x
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-10 right-0 bg-zinc-900 border border-zinc-800 rounded-xl py-1.5 w-24 shadow-2xl z-50 text-xs flex flex-col">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changeSpeed(rate)}
                          className={`px-3 py-1.5 text-left hover:bg-white/10 transition cursor-pointer ${
                            playbackRate === rate ? "text-red-500 font-bold" : "text-zinc-300"
                          }`}
                        >
                          {rate === 1 ? "1x (Normal)" : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Picture in Picture */}
                <button
                  onClick={togglePiP}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition cursor-pointer text-zinc-300 hover:text-white hidden sm:flex"
                  title="Picture in Picture"
                >
                  <i className="fa-solid fa-up-right-from-square text-xs" />
                </button>

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition cursor-pointer text-zinc-300 hover:text-white"
                  title="Layar Penuh (F)"
                >
                  <i
                    className={`fa-solid ${
                      isFullscreen ? "fa-compress" : "fa-expand"
                    } text-xs sm:text-sm`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
