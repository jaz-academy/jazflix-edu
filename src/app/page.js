export const revalidate = 60;
import HomePage from "@/components/HomePage";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import TvShow from "@/models/TvShow";
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  getTvShowsPaginated,
  enrichMovieTrailer,
} from "@/lib/tmdb";
import { filterBlacklistedMovies, filterBlacklistedTv } from "@/lib/blacklist";

async function getLocalMovies() {
  await connectDB();
  const movies = await Movie.find().sort({ _id: -1 }).lean();
  return JSON.parse(JSON.stringify(movies));
}

async function getLocalTvShows() {
  await connectDB();
  const shows = await TvShow.find().sort({ _id: -1 }).lean();
  return JSON.parse(JSON.stringify(shows));
}

export default async function Home() {
  const [rawMovies, rawTvShows] = await Promise.all([
    getLocalMovies(),
    getLocalTvShows(),
  ]);

  // Filter out blacklisted local movies and series
  const localMovies = await filterBlacklistedMovies(rawMovies);
  const localTvShows = await filterBlacklistedTv(rawTvShows);

  // Filter local TV shows that have at least one episode with videoUrl
  const localTvWithVideo = localTvShows.filter((s) =>
    Boolean(s.episodes && s.episodes.some((e) => e.videoUrl && e.videoUrl.trim()))
  );

  // Movie IDs & titles with video in MongoDB
  const localMovieIdSet = new Set(
    localMovies
      .filter((m) => Boolean(m.videoUrl && m.videoUrl.trim() && (m.movieId || m.id)))
      .map((m) => Number(m.movieId || m.id))
      .filter((num) => !isNaN(num) && num > 0)
  );

  const localMovieTitles = new Set(
    localMovies
      .filter((m) => Boolean(m.videoUrl && m.videoUrl.trim() && m.title))
      .map((m) => m.title.trim().toLowerCase())
  );

  const attachMovieHasVideo = (movieList = []) =>
    movieList.map((m) => {
      const numId = Number(m.id || m.movieId);
      const isIdMatch = !isNaN(numId) && localMovieIdSet.has(numId);
      const isTitleMatch = m.title && localMovieTitles.has(m.title.trim().toLowerCase());
      return {
        ...m,
        hasVideo: Boolean(isIdMatch || isTitleMatch || m.hasVideo),
      };
    });

  // TV IDs & titles with video in MongoDB
  const localTvIdSet = new Set(
    localTvWithVideo
      .filter((s) => s.tvId || s.id)
      .map((s) => Number(s.tvId || s.id))
      .filter((num) => !isNaN(num) && num > 0)
  );

  const localTvTitles = new Set(
    localTvWithVideo
      .filter((s) => s.title)
      .map((s) => s.title.trim().toLowerCase())
  );

  const attachTvHasVideo = (tvList = []) =>
    tvList.map((t) => {
      const numId = Number(t.id || t.tvId);
      const isIdMatch = !isNaN(numId) && localTvIdSet.has(numId);
      const isTitleMatch = t.title && localTvTitles.has(t.title.trim().toLowerCase());
      return {
        ...t,
        hasVideo: Boolean(isIdMatch || isTitleMatch || t.hasVideo),
      };
    });

  let heroMovies = [];
  let trendingWeekly = [];
  let popular = [];
  let topRated = [];
  let upcoming = [];

  let seriesPopular = [];
  let seriesTopRated = [];
  let seriesShowing = [];

  try {
    const [
      trendingWeeklyRes,
      trendingWeeklyP2,
      popularRes,
      popularP2,
      topRatedRes,
      upcomingRes,
      popTvRes,
      topTvRes,
      showTvRes,
    ] = await Promise.all([
      getTrendingMovies("week", 1),
      getTrendingMovies("week", 2),
      getPopularMovies(1),
      getPopularMovies(2),
      getTopRatedMovies(1),
      getUpcomingMovies(1),
      getTvShowsPaginated({ category: "popular", page: 1 }),
      getTvShowsPaginated({ category: "top_rated", page: 1 }),
      getTvShowsPaginated({ category: "on_the_air", page: 1 }),
    ]);

    // Apply blacklist filter to TMDB results
    const [
      safeTrendingWeekly,
      safeTrendingP2,
      safePopular,
      safePopularP2,
      safeTopRated,
      safeUpcoming,
      safePopTv,
      safeTopTv,
      safeShowTv,
    ] = await Promise.all([
      filterBlacklistedMovies(trendingWeeklyRes),
      filterBlacklistedMovies(trendingWeeklyP2),
      filterBlacklistedMovies(popularRes),
      filterBlacklistedMovies(popularP2),
      filterBlacklistedMovies(topRatedRes),
      filterBlacklistedMovies(upcomingRes),
      filterBlacklistedTv(popTvRes.results || []),
      filterBlacklistedTv(topTvRes.results || []),
      filterBlacklistedTv(showTvRes.results || []),
    ]);

    const trendingWeeklyAttached = attachMovieHasVideo(safeTrendingWeekly);
    const trendingP2Attached = attachMovieHasVideo(safeTrendingP2);
    const popularAttached = attachMovieHasVideo(safePopular);
    const popularP2Attached = attachMovieHasVideo(safePopularP2);
    const topRatedAttached = attachMovieHasVideo(safeTopRated);
    const upcomingAttached = attachMovieHasVideo(safeUpcoming);

    trendingWeekly = trendingWeeklyAttached;
    popular = popularAttached;
    topRated = topRatedAttached;
    upcoming = upcomingAttached;

    seriesPopular = attachTvHasVideo(safePopTv);
    seriesTopRated = attachTvHasVideo(safeTopTv);
    seriesShowing = attachTvHasVideo(safeShowTv);

    // Kumpulkan 10-20 film dari trending weekly & popular yang sudah ada video di MongoDB
    const seenHeroIds = new Set();
    const availableHeroCandidates = [];

    const candidatePool = [
      ...trendingWeeklyAttached,
      ...trendingP2Attached,
      ...popularAttached,
      ...popularP2Attached,
    ];

    for (const m of candidatePool) {
      const idNum = Number(m.id || m.movieId);
      if (m.hasVideo && !seenHeroIds.has(idNum)) {
        seenHeroIds.add(idNum);
        availableHeroCandidates.push(m);
        if (availableHeroCandidates.length >= 20) break;
      }
    }

    // Jika film dengan video dari trending & popular masih kurang dari 10:
    // Lengkapi dengan film lokal MongoDB lainnya yang memiliki videoUrl
    if (availableHeroCandidates.length < 10) {
      const otherLocalWithVideo = localMovies.filter(
        (m) =>
          Boolean(m.videoUrl && m.videoUrl.trim()) &&
          !seenHeroIds.has(Number(m.movieId || m.id || m._id))
      );

      for (const m of otherLocalWithVideo) {
        seenHeroIds.add(Number(m.movieId || m.id || m._id));
        availableHeroCandidates.push({
          ...m,
          id: m.movieId || m._id,
          hasVideo: true,
        });
        if (availableHeroCandidates.length >= 20) break;
      }
    }

    // Jika koleksi database lokal masih kosong/sangat sedikit (< 5), fallback isi dengan trending weekly teratas
    if (availableHeroCandidates.length < 5) {
      for (const m of trendingWeeklyAttached) {
        const idNum = Number(m.id || m.movieId);
        if (!seenHeroIds.has(idNum)) {
          seenHeroIds.add(idNum);
          availableHeroCandidates.push(m);
          if (availableHeroCandidates.length >= 10) break;
        }
      }
    }

    // Ambil maksimal 20 film teratas dan pastikan trailer YouTube-nya terisi untuk Hero Banner
    const rawHeroList = availableHeroCandidates.slice(0, 20);
    heroMovies = await Promise.all(
      rawHeroList.map((m) => enrichMovieTrailer(m))
    );
  } catch (error) {
    console.error("Failed to fetch TMDB data for home page, falling back:", error);
    const localWithVideo = localMovies.filter((m) => Boolean(m.videoUrl && m.videoUrl.trim()));
    heroMovies = attachMovieHasVideo(localWithVideo.slice(0, 15));
    trendingWeekly = heroMovies;
    popular = attachMovieHasVideo(localMovies.slice(0, 20));
    topRated = popular;
    upcoming = popular;

    const fallbackTv = attachTvHasVideo(
      localTvWithVideo.map((s) => ({
        id: s.tvId || s._id,
        tvId: s.tvId || s._id,
        title: s.title,
        bannerImage: s.bannerImage,
        posterImage: s.posterImage,
        genres: s.genres,
        rating: s.rating,
        releaseYear: s.releaseYear,
        ageRating: s.ageRating || "TV-14",
        hasVideo: true,
      }))
    );
    seriesPopular = fallbackTv;
    seriesTopRated = fallbackTv;
    seriesShowing = fallbackTv;
  }

  // Combine Movies & TV Series for "Our Collection"
  const formattedMovies = localMovies.map((m) => ({
    ...m,
    isSeries: false,
  }));

  const formattedSeries = localTvWithVideo.map((s) => ({
    _id: String(s._id),
    id: s.tvId || s._id,
    movieId: s.tvId || s._id,
    tvId: s.tvId || s._id,
    title: s.title,
    releaseYear: s.releaseYear,
    posterImage: s.posterImage,
    genres: s.genres || [],
    isSeries: true,
  }));

  const allCollections = [...formattedMovies, ...formattedSeries].sort(
    (a, b) => (b.releaseYear || 0) - (a.releaseYear || 0)
  );

  const genres = [
    "All",
    ...new Set(allCollections.flatMap((item) => item.genres || []).filter(Boolean)),
  ];

  const years = [
    "All",
    ...new Set(allCollections.map((item) => item.releaseYear).filter(Boolean)),
  ]
    .sort()
    .reverse();

  return (
    <HomePage
      movies={allCollections}
      genres={genres}
      years={years}
      trending={heroMovies}
      trendingWeekly={trendingWeekly}
      populars={popular}
      topRated={topRated}
      upcoming={upcoming}
      seriesPopular={seriesPopular}
      seriesTopRated={seriesTopRated}
      seriesShowing={seriesShowing}
    />
  );
}
