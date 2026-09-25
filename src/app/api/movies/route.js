import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { filterBlacklistedMovies } from "@/lib/blacklist";

export async function GET() {
  await connectDB();
  const movies = await Movie.find().sort({ _id: -1 }).lean();
  const safe = await filterBlacklistedMovies(movies);
  return Response.json(safe);
}

export async function POST(req) {
  await connectDB();
  const data = await req.json();
  const movie = await Movie.create(data);
  return Response.json(movie, { status: 201 });
}
