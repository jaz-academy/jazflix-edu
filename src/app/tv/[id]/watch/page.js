export const revalidate = 60;
import TvWatchPlayer from "@/components/TvWatchPlayer";
import { getTvShowDetails, getTvSeasonEpisodes, isSafeMovie } from "@/lib/tmdb";
import { isItemBlacklisted } from "@/lib/blacklist";
import { connectDB } from "@/lib/db";
import TvShow from "@/models/TvShow";
import Movie from "@/models/Movie";
import Link from "next/link";

function getDriveId(url) {
  const patterns = [
    /\/d\/([^/]+)/,
    /id=([^&]+)/,
    /\/file\/([^/?]+)/,
  ];
  for (const p of patterns) {
    const match = url?.match(p);
    if (match) return match[1];
  }
  return null;
}

export default async function TvWatchPage({ params, searchParams }) {
  const { id } = await params;
  const sParams = await searchParams;
  const season = parseInt(sParams?.season || "1", 10);
  const episode = parseInt(sParams?.episode || "1", 10);

  // Check blacklist
  const isBanned = await isItemBlacklisted(id, "tv");
  if (isBanned) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Serial Tidak Tersedia</h1>
        <p className="text-zinc-400 text-sm mb-4">
          Serial TV ini tidak dapat diputar karena telah dinonaktifkan oleh administrator.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-red-600 rounded-lg text-sm hover:bg-red-700 transition"
        >
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  let tv = null;
  let seasonData = { episodes: [] };

  try {
    tv = await getTvShowDetails(id);
    if (tv && isSafeMovie(tv)) {
      seasonData = await getTvSeasonEpisodes(id, season);
    }
  } catch (err) {
    console.error(`Failed to load TV watch for ${id}:`, err);
  }

  if (!tv || !isSafeMovie(tv)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Serial Tidak Ditemukan</h1>
        <p className="text-zinc-400 text-sm">Serial TV tidak dapat dimuat atau telah dibatasi.</p>
      </div>
    );
  }

  // Check MongoDB for matching videoUrl in TvShow collection
  let embedUrl = null;
  let localTv = null;

  try {
    await connectDB();
    localTv = await TvShow.findOne({ tvId: Number(id) }).lean();

    if (localTv) {
      // Find matching episode in MongoDB
      const epDoc = localTv.episodes?.find(
        (e) => e.seasonNumber === season && e.episodeNumber === episode
      );

      let rawUrl = epDoc?.videoUrl || null;
      if (rawUrl && rawUrl.trim()) {
        embedUrl = rawUrl.trim();
        if (embedUrl.includes("drive.google.com") || embedUrl.includes("docs.google.com")) {
          const fileId = getDriveId(embedUrl);
          if (fileId) {
            embedUrl = `https://drive.google.com/file/d/${fileId}/preview?autoplay=1`;
          }
        }
      }
    }

    // Fallback: check legacy Movie entry if any
    if (!embedUrl) {
      const legacyMovie = await Movie.findOne({ movieId: Number(id) }).lean();
      if (legacyMovie?.videoUrl) {
        embedUrl = legacyMovie.videoUrl;
        if (embedUrl.includes("drive.google.com") || embedUrl.includes("docs.google.com")) {
          const fileId = getDriveId(embedUrl);
          if (fileId) {
            embedUrl = `https://drive.google.com/file/d/${fileId}/preview?autoplay=1`;
          }
        }
      }
    }
  } catch (e) {
    console.error("MongoDB check error in TV watch:", e);
  }

  // Annotate episodes with whether they have a video in database
  const episodesWithStatus = (seasonData.episodes || []).map((ep) => {
    const dbEp = localTv?.episodes?.find(
      (e) => e.seasonNumber === season && e.episodeNumber === ep.episodeNumber
    );
    return {
      ...ep,
      hasVideo: Boolean(dbEp?.videoUrl && dbEp.videoUrl.trim()),
    };
  });

  return (
    <TvWatchPlayer
      tv={tv}
      currentSeasonNumber={season}
      currentEpisodeNumber={episode}
      seasonEpisodes={episodesWithStatus}
      embedUrl={embedUrl}
    />
  );
}
