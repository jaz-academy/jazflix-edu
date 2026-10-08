import Navbar from "@/components/Navbar";
import EditMovieForm from "@/components/EditMovieForm";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";

async function getMovies() {
  await connectDB();
  const movies = await Movie.find().lean();
  return JSON.parse(JSON.stringify(movies));
}

export default async function AdminEdit({ params }) {
  const { id } = await Promise.resolve(params);
  const movies = await getMovies();
  const genres = [...new Set(movies.flatMap((m) => m.genres))];

  return (
    <>
      <Navbar />
      <div className="my-2" />
      <EditMovieForm id={id} genres={genres} />
    </>
  );
}
