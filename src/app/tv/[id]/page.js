export const revalidate = 60;
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TvDetail from "@/components/TvDetail";
import { getTvShowDetails, getTvSeasonEpisodes, getTvShowsPaginated, isSafeMovie } from "@/lib/tmdb";
import { isItemBlacklisted, filterBlacklistedTv } from "@/lib/blacklist";
import { connectDB } from "@/lib/db";
import TvShow from "@/models/TvShow";

export default async function TvPage({ params }) {
  const { id } = await params;

  // Check blacklist early
  const isBanned = await isItemBlacklisted(id, "tv");
  if (isBanned) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <Navbar />
        <h1 className="text-3xl font-bold mb-4 text-red-500">Konten Tidak Tersedia</h1>
        <p className="text-zinc-400 text-center max-w-md">
          Serial TV ini tidak tersedia atau telah dinonaktifkan oleh administrator.
        </p>
      </div>
    );
  }

  let tv = null;
  let initialEpisodes = [];
  let similarTv = [];
  let localTv = null;

  try {
    tv = await getTvShowDetails(id);
    if (tv && isSafeMovie(tv)) {
      const seasonNum = tv.seasons?.[0]?.season_number || 1;
      const seasonData = await getTvSeasonEpisodes(id, seasonNum);
      initialEpisodes = seasonData.episodes || [];

      // Fetch similar popular TV shows
      const pop = await getTvShowsPaginated({ category: "popular", page: 1 });
      const rawSimilar = (pop.results || []).filter((item) => String(item.id) !== String(id));
      similarTv = await filterBlacklistedTv(rawSimilar);

      // Fetch local TV from MongoDB to check configured video URLs
      try {
        await connectDB();
        localTv = await TvShow.findOne({ tvId: Number(id) }).lean();
      } catch (dbErr) {
        console.error("Failed to connect to MongoDB in TV detail:", dbErr);
      }
    }
  } catch (err) {
    console.error(`Failed to load TV ${id}:`, err);
  }

  if (!tv || !isSafeMovie(tv)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <Navbar />
        <h1 className="text-3xl font-bold mb-4 text-red-500">Konten Tidak Tersedia</h1>
        <p className="text-zinc-400 text-center max-w-md">
          Serial TV ini tidak ditemukan atau tidak memenuhi panduan konten keluarga.
        </p>
      </div>
    );
  }

  const firstSeason = tv.seasons?.[0]?.season_number || 1;
  const episodesWithStatus = initialEpisodes.map((ep) => {
    const dbEp = localTv?.episodes?.find(
      (e) => e.seasonNumber === firstSeason && e.episodeNumber === ep.episodeNumber
    );
    return {
      ...ep,
      hasVideo: Boolean(dbEp?.videoUrl && dbEp.videoUrl.trim()),
    };
  });

  const hasDbVideo = Boolean(
    localTv?.episodes?.some((e) => e.videoUrl && e.videoUrl.trim())
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <TvDetail
        tv={tv}
        initialEpisodes={episodesWithStatus}
        similarTv={similarTv}
        hasDbVideo={hasDbVideo}
        localEpisodes={JSON.parse(JSON.stringify(localTv?.episodes || []))}
      />
      <Footer />
    </div>
  );
}
