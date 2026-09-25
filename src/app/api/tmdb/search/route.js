import { searchMovies } from "@/lib/tmdb";
import { filterBlacklistedMovies } from "@/lib/blacklist";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const year = searchParams.get("year");

    if (!query) {
      return Response.json([]);
    }

    const results = await searchMovies(query, year);
    const safeResults = await filterBlacklistedMovies(results);
    return Response.json(safeResults);
  } catch (error) {
    console.error("Error in TMDB search route:", error);
    return Response.json(
      { message: "Failed to search movies from TMDB" },
      { status: 500 }
    );
  }
}
