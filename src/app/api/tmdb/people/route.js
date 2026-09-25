import { NextResponse } from "next/server";
import { getPeoplePaginated } from "@/lib/tmdb";
import { filterBlacklistedPeople } from "@/lib/blacklist";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "popular";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const query = searchParams.get("query") || "";
    const department = searchParams.get("department") || "";

    const data = await getPeoplePaginated({ category, page, query, department });
    
    // Filter out active blacklisted people
    if (data.results && Array.isArray(data.results)) {
      data.results = await filterBlacklistedPeople(data.results);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Error in /api/tmdb/people:", err);
    return NextResponse.json(
      { error: "Failed to fetch people", results: [], page: 1, totalPages: 1 },
      { status: 500 }
    );
  }
}
