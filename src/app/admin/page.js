import Navbar from "@/components/Navbar";
import TableMovies from "@/components/TableMovies";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";

async function getMovies() {
  await connectDB();
  const movies = await Movie.find().sort({ _id: -1 }).lean();
  return JSON.parse(JSON.stringify(movies));
}

export default async function Admin() {
  const movies = await getMovies();
  const genres = [...new Set(movies.flatMap((m) => m.genres))];
  const years = [...new Set(movies.map((m) => m.releaseYear))].sort().reverse();

  return (
    <>
      <Navbar />
      <div className="my-8" />
      <TableMovies movies={movies} genres={genres} years={years} />
    </>
  );
}
