import Navbar from "@/components/Navbar";
import TableTvShows from "@/components/TableTvShows";
import { connectDB } from "@/lib/db";
import TvShow from "@/models/TvShow";

async function getTvShows() {
  await connectDB();
  const tvShows = await TvShow.find().sort({ _id: -1 }).lean();
  return JSON.parse(JSON.stringify(tvShows));
}

export default async function AdminTvPage() {
  const tvShows = await getTvShows();
  const years = [...new Set(tvShows.map((t) => t.releaseYear).filter(Boolean))]
    .sort()
    .reverse();

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-8 pb-12">
        <TableTvShows tvShows={tvShows} years={years} />
      </div>
    </div>
  );
}
