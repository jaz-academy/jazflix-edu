import { connectDB } from "@/lib/db";
import TvShow from "@/models/TvShow";
import { filterBlacklistedTv } from "@/lib/blacklist";

export async function GET() {
  try {
    await connectDB();
    const tvShows = await TvShow.find().sort({ _id: -1 }).lean();
    const safe = await filterBlacklistedTv(tvShows);
    return Response.json(safe);
  } catch (error) {
    console.error("GET /api/tv error:", error);
    return Response.json({ message: "Failed to fetch TV shows" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const data = await req.json();

    if (!data.tvId || !data.title) {
      return Response.json({ message: "tvId and title are required" }, { status: 400 });
    }

    // Upsert by tvId so re-adding or updating doesn't duplicate
    const tvShow = await TvShow.findOneAndUpdate(
      { tvId: Number(data.tvId) },
      { $set: data },
      { new: true, upsert: true }
    );

    return Response.json(tvShow, { status: 201 });
  } catch (error) {
    console.error("POST /api/tv error:", error);
    return Response.json({ message: "Failed to save TV show" }, { status: 500 });
  }
}
