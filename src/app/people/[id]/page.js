export const revalidate = 60;
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import PersonDetail from "@/components/PersonDetail";
import { getPersonDetails } from "@/lib/tmdb";
import { isItemBlacklisted, getActiveBlacklistSets } from "@/lib/blacklist";

export default async function PersonDetailPage({ params }) {
  const { id } = await params;

  // Check if person is blacklisted
  const isBanned = await isItemBlacklisted(id, "person");
  if (isBanned) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <i className="fa-solid fa-user-shield text-5xl text-zinc-600 mb-4" />
          <h1 className="text-3xl font-bold mb-3 text-red-500">Tokoh Tidak Tersedia</h1>
          <p className="text-zinc-400 text-sm max-w-md">
            Profil tokoh perfilman ini tidak tersedia atau telah dinonaktifkan oleh administrator.
          </p>
          <Link
            href="/people"
            className="mt-6 px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition cursor-pointer"
          >
            Kembali ke Daftar Tokoh
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  let person = null;

  try {
    person = await getPersonDetails(id);
    if (person) {
      // Filter out any blacklisted movie or tv from credits
      const sets = await getActiveBlacklistSets();
      if (person.castCredits && Array.isArray(person.castCredits)) {
        person.castCredits = person.castCredits.filter((c) => {
          const numId = Number(c.id);
          if (c.mediaType === "tv") return !sets.tv.has(numId);
          return !sets.movie.has(numId);
        });
      }
      if (person.crewCredits && Array.isArray(person.crewCredits)) {
        person.crewCredits = person.crewCredits.filter((c) => {
          const numId = Number(c.id);
          if (c.mediaType === "tv") return !sets.tv.has(numId);
          return !sets.movie.has(numId);
        });
      }
    }
  } catch (err) {
    console.error(`Failed to load person ${id}:`, err);
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <i className="fa-solid fa-user-shield text-5xl text-zinc-600 mb-4" />
          <h1 className="text-3xl font-bold mb-3 text-red-500">Tokoh Tidak Tersedia</h1>
          <p className="text-zinc-400 text-sm max-w-md">
            Profil tokoh perfilman ini tidak ditemukan atau telah dibatasi karena tidak memenuhi panduan konten keluarga Jazflix.
          </p>
          <Link
            href="/people"
            className="mt-6 px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition cursor-pointer"
          >
            Kembali ke Daftar Tokoh
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <PersonDetail person={person} />
      <Footer />
    </div>
  );
}
