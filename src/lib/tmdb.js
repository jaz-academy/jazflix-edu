const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const DEFAULT_BEARER =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjY2MzYmNkZmRiOGMyNzMzNWE1ZTJmYTIyZWY2Yzc3OSIsIm5iZiI6MTcxMTE3NzAzOS45MjksInN1YiI6IjY1ZmU3ZDRmMWIxZjNjMDE3Yzk4ZTFhOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.1PlR_trKl9bLOsh2sp32-XOlXbBzjMB2zDL1MnXN5dk";

function getAuth() {
  const token =
    process.env.TMDB_KEY ||
    process.env.NEXT_PUBLIC_TMDB_KEY ||
    process.env.NEXT_PUBLIC_TMDB_BEARER ||
    DEFAULT_BEARER;

  if (!token) return { type: "none" };

  if (token.startsWith("eyJ")) {
    return {
      type: "bearer",
      headers: { Authorization: `Bearer ${token}` },
    };
  }

  return {
    type: "key",
    key: token,
    headers: {},
  };
}

export async function tmdbFetch(path, options = {}) {
  const auth = getAuth();
  let url = `${TMDB_BASE_URL}${path}`;

  if (auth.type === "key") {
    url += `${path.includes("?") ? "&" : "?"}api_key=${auth.key}`;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...auth.headers,
      ...(options.headers || {}),
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[TMDB API Error] ${res.status}: ${errorText} (URL: ${url})`);
    throw new Error(`TMDB fetch failed with status ${res.status}`);
  }

  return res.json();
}

export function getPosterUrl(path, size = "w500") {
  if (!path) return "/images/no-photo.png";
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getBackdropUrl(path, size = "original") {
  if (!path) return "/images/hero-image.png";
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getProfileUrl(path, size = "w500") {
  if (!path) return "/images/no-photo.png";
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getStillUrl(path, size = "w500") {
  if (!path) return "/images/hero-image.png";
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getTrailerUrl(videos) {
  if (!videos || !videos.results || videos.results.length === 0) return null;
  const trailer =
    videos.results.find(
      (v) => v.type === "Trailer" && v.site === "YouTube" && v.official
    ) ||
    videos.results.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
    videos.results.find((v) => v.type === "Teaser" && v.site === "YouTube") ||
    videos.results.find((v) => v.type === "Clip" && v.site === "YouTube") ||
    videos.results.find((v) => v.site === "YouTube");
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

export async function searchYouTubeTrailer(query) {
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return null;
    const html = await res.text();
    const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    let match;
    const ids = [];
    while ((match = regex.exec(html)) !== null) {
      if (!ids.includes(match[1])) {
        ids.push(match[1]);
      }
      if (ids.length >= 3) break;
    }
    return ids[0] ? `https://www.youtube.com/watch?v=${ids[0]}` : null;
  } catch (err) {
    console.error("YouTube search fallback failed:", err);
    return null;
  }
}

export function formatTmdbMovie(m) {
  if (!m) return null;
  const trailerUrl = m.videos ? getTrailerUrl(m.videos) : null;
  const director = m.credits?.crew?.find((c) => c.job === "Director")?.name || "";
  const actors = m.credits?.cast?.slice(0, 5).map((a) => a.name) || [];
  const usRelease = m.release_dates?.results?.find((r) => r.iso_3166_1 === "US");
  const ageRating =
    usRelease?.release_dates?.find((d) => d.certification)?.certification ||
    "PG-13";

  return {
    _id: String(m.id),
    movieId: m.id,
    id: m.id,
    imdbId: m.imdb_id || null,
    title: m.title || m.name || "",
    originalTitle: m.original_title || m.original_name || m.title || "",
    description: m.overview || "",
    plot: m.overview || "",
    releaseYear: m.release_date ? parseInt(m.release_date.split("-")[0], 10) : null,
    rating: m.vote_average ? Number(m.vote_average).toFixed(1) : "N/A",
    duration: m.runtime ? `${m.runtime} min` : "",
    posterImage: getPosterUrl(m.poster_path),
    bannerImage: getBackdropUrl(m.backdrop_path),
    trailerUrl: trailerUrl || "",
    genres: m.genres ? m.genres.map((g) => g.name) : [],
    ageRating,
    director: director ? [director] : [],
    actors,
  };
}

// Kata kunci judul yang vulgar / berkonotasi seksual eksplisit / dewasa / softcore
const ADULT_TITLE_REGEX =
  /\b(sex|sexy|erotic|erotica|nude|nudity|naked|porn|porno|pornography|striptease|stripper|sensual|lust|orgasm|hentai|fetish|bdsm|kamasutra|incest|escort|playboy|playgirl|prostitute|whore|slut|bokep|mesum|telanjang|lendir|jav|softcore|nymphomaniac|breast|breasts|concubine|seduction|intercourse|perverted|voyeur|special service|call girl|hostess|erotic ghost story|affair|mistress|massage)\b/i;

// Frasa sinopsis yang bertema erotisme eksplisit
const ADULT_OVERVIEW_REGEX =
  /\b(having sex|make love|sexual muse|sexual desire|sexual life|sexual affair|sexual partner|sexual relationship|sexual intercourse|sexual encounter|erotic film|erotic romance|erotic thriller|erotica|softcore|pornographic|pornography|hardcore sex|explicit sex|sensual massage|nude scenes|orgasm|hentai|fetish|bdsm|kamasutra|incest|playboy mansion|adult film|adult video|bokep|mesum|lendir|jav|nymphomaniac|extramarital|bed scene|illicit love|secret affair|taboo relationship|swapping partners|lustful)\b/i;

// Kata kunci biografi tokoh industri dewasa
const PERSON_BIO_ADULT_REGEX =
  /\b(porn|porno|pornographic|pornography|adult video|adult film|adult entertainment|av actress|av idol|jav|erotic model|softcore|erotica|playboy playmate|penthouse pet|pink film|roman porno|gravure idol)\b/i;

// Sertifikasi rating usia dewasa yang dilarang (AS, Korea Selatan, Hong Kong, Internasional)
const BANNED_CERTIFICATIONS = new Set([
  "NC-17",
  "X",
  "XXX",
  "R18+",
  "18+",
  "19",
  "19+",
  "청소년 관람불가",
  "R-18",
  "R18",
  "CAT III",
  "CATEGORY III",
  "ADULTS ONLY",
]);

// Blacklist manual TMDB Movie ID untuk pencegahan instan
const MANUAL_BANNED_IDS = new Set([
  1288059, // "I Want Your Sex"
]);

export function isSafeMovie(m) {
  if (!m) return false;

  const id = Number(m.id || m.movieId);
  if (MANUAL_BANNED_IDS.has(id)) {
    return false;
  }

  // 1. Cek flag adult / softcore dari TMDB
  if (m.adult === true || m.softcore === true) {
    return false;
  }

  // 2. Cek sertifikasi usia
  if (m.ageRating && BANNED_CERTIFICATIONS.has(String(m.ageRating).toUpperCase())) {
    return false;
  }

  // 3. Filter ketat kata kunci pada Judul & Original Title
  const title = m.title || m.name || "";
  const originalTitle = m.original_title || m.originalTitle || "";
  if (ADULT_TITLE_REGEX.test(title) || ADULT_TITLE_REGEX.test(originalTitle)) {
    return false;
  }

  // 4. Filter tema erotisme eksplisit pada Sinopsis / Ringkasan
  const overview = m.overview || m.description || "";
  if (ADULT_OVERVIEW_REGEX.test(overview)) {
    return false;
  }

  return true;
}

export function isSafePerson(p) {
  if (!p) return false;
  if (p.adult === true) return false;

  const nameCombined = `${p.name || ""} ${p.original_name || ""}`;
  if (/\b(porn|porno|jav|hentai)\b/i.test(nameCombined)) return false;

  if (p.biography && PERSON_BIO_ADULT_REGEX.test(p.biography)) return false;

  const knownFor = p.known_for || [];
  if (knownFor.length > 0) {
    let unsafeCount = 0;
    for (const k of knownFor) {
      if (k.adult === true || k.softcore === true || !isSafeMovie(k)) {
        unsafeCount++;
      }
    }
    // Jika salah satu karya eksplisit adult/softcore
    const hasExplicitAdult = knownFor.some((k) => k.adult === true || k.softcore === true);
    if (hasExplicitAdult) return false;

    // Jika mayoritas karya terindikasi erotis / tidak aman
    if (unsafeCount >= 1 && unsafeCount >= Math.ceil(knownFor.length / 2)) {
      return false;
    }
  }

  // Cek combined_credits jika ada (pada halaman detail /person/[id])
  const cast = p.combined_credits?.cast || [];
  const crew = p.combined_credits?.crew || [];
  const allCredits = [...cast, ...crew];

  if (allCredits.length > 0) {
    // 1. Jika ada karya bertanda adult: true dari TMDB
    if (allCredits.some((c) => c.adult === true)) return false;

    // 2. Jika ada 2 atau lebih karya bertanda softcore
    if (allCredits.filter((c) => c.softcore === true).length >= 2) return false;

    // 3. Jika memiliki >= 5 karya peran dan setidaknya 3 karya disaring tidak aman serta rasio unsafe >= 15%
    const unsafeCount = allCredits.filter((c) => !isSafeMovie(c)).length;
    if (allCredits.length >= 5 && unsafeCount >= 3 && unsafeCount / allCredits.length >= 0.15) {
      return false;
    }
  }

  return true;
}

export async function getNowPlayingMovies(page = 1) {
  const data = await tmdbFetch(
    `/movie/now_playing?page=${page}&include_adult=false&language=en-US`
  );
  const safeList = (data.results || []).filter(isSafeMovie);

  const detailedResults = await Promise.all(
    safeList.slice(0, 10).map(async (movie) => {
      try {
        const full = await tmdbFetch(
          `/movie/${movie.id}?append_to_response=videos,release_dates`
        );
        return formatTmdbMovie(full);
      } catch {
        return formatTmdbMovie(movie);
      }
    })
  );

  const restResults = safeList.slice(10).map(formatTmdbMovie);
  return [...detailedResults, ...restResults].filter(isSafeMovie);
}

export async function getPopularMovies(page = 1) {
  const data = await tmdbFetch(
    `/movie/popular?page=${page}&include_adult=false&language=en-US`
  );
  return (data.results || []).filter(isSafeMovie).map(formatTmdbMovie);
}

export async function getUpcomingMovies(page = 1) {
  const data = await tmdbFetch(
    `/movie/upcoming?page=${page}&include_adult=false&language=en-US`
  );
  return (data.results || []).filter(isSafeMovie).map(formatTmdbMovie);
}

export async function getTopRatedMovies(page = 1) {
  const data = await tmdbFetch(
    `/movie/top_rated?page=${page}&include_adult=false&language=en-US`
  );
  return (data.results || []).filter(isSafeMovie).map(formatTmdbMovie);
}

export async function getTrendingMovies(timeWindow = "week", page = 1) {
  const data = await tmdbFetch(
    `/trending/movie/${timeWindow}?page=${page}&include_adult=false&language=en-US`
  );
  return (data.results || []).filter(isSafeMovie).map(formatTmdbMovie);
}

export async function enrichMovieTrailer(movie) {
  if (!movie) return movie;
  if (movie.trailerUrl) return movie;
  const tmdbId = Number(movie.id || movie.movieId);
  if (!tmdbId || isNaN(tmdbId)) return movie;
  try {
    const full = await tmdbFetch(
      `/movie/${tmdbId}?append_to_response=videos,release_dates&language=en-US`
    );
    const trailerUrl = full.videos ? getTrailerUrl(full.videos) : null;
    return {
      ...movie,
      trailerUrl: trailerUrl || movie.trailerUrl || "",
      bannerImage: movie.bannerImage || getBackdropUrl(full.backdrop_path),
      posterImage: movie.posterImage || getPosterUrl(full.poster_path),
      description: movie.description || full.overview || "",
      rating: movie.rating || (full.vote_average ? Number(full.vote_average).toFixed(1) : "N/A"),
      releaseYear: movie.releaseYear || (full.release_date ? parseInt(full.release_date.split("-")[0], 10) : null),
    };
  } catch (err) {
    return movie;
  }
}

export async function getMovieDetails(id) {
  const data = await tmdbFetch(
    `/movie/${id}?append_to_response=videos,credits,release_dates,recommendations&language=en-US`
  );
  return formatTmdbMovie(data);
}

export async function searchMovies(query, year) {
  if (!query || !query.trim()) return [];
  const yearParam = year ? `&year=${year}` : "";
  const data = await tmdbFetch(
    `/search/movie?query=${encodeURIComponent(query)}&include_adult=false${yearParam}&language=en-US`
  );
  return (data.results || []).filter(isSafeMovie).map(formatTmdbMovie);
}

export function formatTmdbTv(t) {
  if (!t) return null;
  const trailerUrl = t.videos ? getTrailerUrl(t.videos) : null;
  const creators = t.created_by?.map((c) => c.name) || [];
  const actors = t.credits?.cast?.slice(0, 6).map((a) => a.name) || [];
  const usRating =
    t.content_ratings?.results?.find((r) => r.iso_3166_1 === "US")?.rating || "TV-14";
  const releaseYear = t.first_air_date ? parseInt(t.first_air_date.split("-")[0], 10) : null;
  const endYear = t.last_air_date ? parseInt(t.last_air_date.split("-")[0], 10) : null;

  return {
    _id: String(t.id),
    id: t.id,
    title: t.name || t.original_name || "",
    originalTitle: t.original_name || t.name || "",
    description: t.overview || "",
    plot: t.overview || "",
    releaseYear,
    endYear,
    status: t.status || "Released",
    numberOfSeasons: t.number_of_seasons || 1,
    numberOfEpisodes: t.number_of_episodes || 0,
    seasons: (t.seasons || []).filter((s) => s.season_number > 0), // Filter out Season 0 (specials) by default
    allSeasons: t.seasons || [],
    rating: t.vote_average ? Number(t.vote_average).toFixed(1) : "N/A",
    posterImage: getPosterUrl(t.poster_path),
    bannerImage: getBackdropUrl(t.backdrop_path),
    trailerUrl: trailerUrl || "",
    genres: t.genres ? t.genres.map((g) => g.name) : [],
    ageRating: usRating,
    creators,
    actors,
  };
}

export function formatTmdbPerson(p) {
  if (!p || !isSafePerson(p)) return null;
  const knownFor = (p.known_for || [])
    .filter(isSafeMovie)
    .map((k) => k.title || k.name || "")
    .filter(Boolean);

  return {
    id: p.id,
    name: p.name || "",
    originalName: p.original_name || p.name || "",
    department: p.known_for_department || "Acting",
    profileImage: getProfileUrl(p.profile_path),
    popularity: p.popularity ? Number(p.popularity).toFixed(1) : 0,
    knownFor,
  };
}

export async function getMoviesPaginated({ category = "popular", page = 1, genre = "", query = "" }) {
  if (query && query.trim()) {
    const data = await tmdbFetch(
      `/search/movie?query=${encodeURIComponent(query)}&page=${page}&include_adult=false&language=en-US`
    );
    const results = (data.results || []).filter(isSafeMovie).map(formatTmdbMovie);
    return {
      page: data.page || page,
      totalPages: Math.min(data.total_pages || 1, 500),
      totalResults: data.total_results || results.length,
      results,
    };
  }

  let endpoint = `/movie/${category}`;
  if (!["popular", "now_playing", "upcoming", "top_rated"].includes(category)) {
    endpoint = "/movie/popular";
  }

  let url = `${endpoint}?page=${page}&include_adult=false&language=en-US`;
  if (genre) {
    url = `/discover/movie?page=${page}&with_genres=${genre}&include_adult=false&language=en-US`;
    if (category === "top_rated") url += "&sort_by=vote_average.desc&vote_count.gte=200";
    else if (category === "upcoming") url += "&sort_by=primary_release_date.desc";
    else url += "&sort_by=popularity.desc";
  }

  const data = await tmdbFetch(url);
  const results = (data.results || []).filter(isSafeMovie).map(formatTmdbMovie);

  return {
    page: data.page || page,
    totalPages: Math.min(data.total_pages || 1, 500),
    totalResults: data.total_results || results.length,
    results,
  };
}

export async function getTvShowsPaginated({ category = "popular", page = 1, genre = "", query = "" }) {
  if (query && query.trim()) {
    const data = await tmdbFetch(
      `/search/tv?query=${encodeURIComponent(query)}&page=${page}&include_adult=false&language=en-US`
    );
    const results = (data.results || []).filter(isSafeMovie).map(formatTmdbTv);
    return {
      page: data.page || page,
      totalPages: Math.min(data.total_pages || 1, 500),
      totalResults: data.total_results || results.length,
      results,
    };
  }

  let endpoint = `/tv/${category}`;
  if (!["popular", "airing_today", "on_the_air", "top_rated"].includes(category)) {
    endpoint = "/tv/popular";
  }

  let url = `${endpoint}?page=${page}&include_adult=false&language=en-US`;
  if (genre) {
    url = `/discover/tv?page=${page}&with_genres=${genre}&include_adult=false&language=en-US`;
    if (category === "top_rated") url += "&sort_by=vote_average.desc&vote_count.gte=100";
    else url += "&sort_by=popularity.desc";
  }

  const data = await tmdbFetch(url);
  const results = (data.results || []).filter(isSafeMovie).map(formatTmdbTv);

  return {
    page: data.page || page,
    totalPages: Math.min(data.total_pages || 1, 500),
    totalResults: data.total_results || results.length,
    results,
  };
}

export async function getTvShowDetails(id) {
  const data = await tmdbFetch(
    `/tv/${id}?append_to_response=videos,credits,content_ratings,recommendations,external_ids&language=en-US`
  );
  return formatTmdbTv(data);
}

export async function getTvSeasonEpisodes(tvId, seasonNumber = 1) {
  try {
    const data = await tmdbFetch(`/tv/${tvId}/season/${seasonNumber}?language=en-US`);
    const episodes = (data.episodes || []).map((ep) => ({
      id: ep.id,
      episodeNumber: ep.episode_number,
      seasonNumber: ep.season_number,
      name: ep.name || `Episode ${ep.episode_number}`,
      overview: ep.overview || "",
      airDate: ep.air_date || null,
      runtime: ep.runtime ? `${ep.runtime} min` : null,
      rating: ep.vote_average ? Number(ep.vote_average).toFixed(1) : "N/A",
      stillImage: getStillUrl(ep.still_path),
    }));

    return {
      seasonNumber: data.season_number,
      name: data.name,
      overview: data.overview,
      posterImage: getPosterUrl(data.poster_path),
      episodes,
    };
  } catch (err) {
    console.error(`Failed to fetch season ${seasonNumber} for TV ${tvId}:`, err);
    return { seasonNumber, episodes: [] };
  }
}

export async function getTvEpisodeDetails(tvId, seasonNumber = 1, episodeNumber = 1, tvTitle = "") {
  try {
    const data = await tmdbFetch(
      `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}?append_to_response=videos&language=en-US`
    );
    let trailerUrl = data.videos ? getTrailerUrl(data.videos) : null;

    // Fallback: If TMDB does not have videos for this episode, search YouTube for the episode trailer/promo
    if (!trailerUrl) {
      const searchTitle = tvTitle || data.name || "TV Series";
      const query = `${searchTitle} Season ${seasonNumber} Episode ${episodeNumber} Trailer`;
      trailerUrl = await searchYouTubeTrailer(query);
    }

    return {
      id: data.id,
      episodeNumber: data.episode_number,
      seasonNumber: data.season_number,
      name: data.name || `Episode ${data.episode_number}`,
      overview: data.overview || "",
      airDate: data.air_date || null,
      runtime: data.runtime ? `${data.runtime} min` : null,
      rating: data.vote_average ? Number(data.vote_average).toFixed(1) : "N/A",
      stillImage: getStillUrl(data.still_path),
      trailerUrl: trailerUrl || "",
    };
  } catch (err) {
    console.error(`Failed to fetch episode S${seasonNumber}E${episodeNumber} for TV ${tvId}:`, err);
    return null;
  }
}

export async function getPeoplePaginated({ category = "popular", page = 1, query = "", department = "" }) {
  if (query && query.trim()) {
    const data = await tmdbFetch(
      `/search/person?query=${encodeURIComponent(query)}&page=${page}&include_adult=false&language=en-US`
    );
    let results = (data.results || [])
      .filter((p) => p.profile_path && isSafePerson(p))
      .map(formatTmdbPerson)
      .filter(Boolean);
    if (department) {
      results = results.filter((p) => p.department?.toLowerCase() === department.toLowerCase());
    }
    return {
      page: data.page || page,
      totalPages: Math.min(data.total_pages || 1, 500),
      totalResults: data.total_results || results.length,
      results,
    };
  }

  let url = `/person/popular?page=${page}&language=en-US`;
  if (category === "trending") {
    url = `/trending/person/week?page=${page}&language=en-US`;
  }

  const data = await tmdbFetch(url);
  let results = (data.results || [])
    .filter((p) => p.profile_path && isSafePerson(p))
    .map(formatTmdbPerson)
    .filter(Boolean);
  if (department) {
    results = results.filter((p) => p.department?.toLowerCase() === department.toLowerCase());
  }

  return {
    page: data.page || page,
    totalPages: Math.min(data.total_pages || 1, 500),
    totalResults: data.total_results || results.length,
    results,
  };
}

export async function getPersonDetails(id) {
  const data = await tmdbFetch(
    `/person/${id}?append_to_response=combined_credits,external_ids,images&language=en-US`
  );
  if (!data || !isSafePerson(data)) return null;

  const rawCast = data.combined_credits?.cast || [];
  const rawCrew = data.combined_credits?.crew || [];

  const castCredits = rawCast
    .filter(isSafeMovie)
    .map((c) => ({
      id: c.id,
      mediaType: c.media_type || (c.title ? "movie" : "tv"),
      title: c.title || c.name || "",
      character: c.character || "",
      releaseYear: c.release_date
        ? parseInt(c.release_date.split("-")[0], 10)
        : c.first_air_date
        ? parseInt(c.first_air_date.split("-")[0], 10)
        : null,
      rating: c.vote_average ? Number(c.vote_average).toFixed(1) : "N/A",
      posterImage: getPosterUrl(c.poster_path),
      voteCount: c.vote_count || 0,
    }))
    .sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));

  const crewCredits = rawCrew
    .filter(isSafeMovie)
    .map((c) => ({
      id: c.id,
      mediaType: c.media_type || (c.title ? "movie" : "tv"),
      title: c.title || c.name || "",
      department: c.department || "",
      job: c.job || "",
      releaseYear: c.release_date
        ? parseInt(c.release_date.split("-")[0], 10)
        : c.first_air_date
        ? parseInt(c.first_air_date.split("-")[0], 10)
        : null,
      rating: c.vote_average ? Number(c.vote_average).toFixed(1) : "N/A",
      posterImage: getPosterUrl(c.poster_path),
      voteCount: c.vote_count || 0,
    }))
    .sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));

  // Extra safety check: jika seorang tokoh memiliki >= 5 karya peran dan lebih dari 60% disaring sebagai film dewasa
  if (rawCast.length >= 5 && castCredits.length / rawCast.length < 0.4) {
    return null;
  }

  const topWorks = [...castCredits]
    .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
    .slice(0, 10);

  return {
    id: data.id,
    imdbId: data.imdb_id || data.external_ids?.imdb_id || null,
    name: data.name || "",
    biography: data.biography || "",
    department: data.known_for_department || "Acting",
    gender: data.gender === 1 ? "Female" : data.gender === 2 ? "Male" : "Not specified",
    birthday: data.birthday || null,
    deathday: data.deathday || null,
    placeOfBirth: data.place_of_birth || null,
    alsoKnownAs: data.also_known_as || [],
    profileImage: getProfileUrl(data.profile_path, "h632"),
    homepage: data.homepage || null,
    topWorks,
    castCredits,
    crewCredits,
  };
}

export async function getMovieGenres() {
  try {
    const data = await tmdbFetch("/genre/movie/list?language=en-US");
    return data.genres || [];
  } catch {
    return [];
  }
}

export async function getTvGenres() {
  try {
    const data = await tmdbFetch("/genre/tv/list?language=en-US");
    return data.genres || [];
  } catch {
    return [];
  }
}

