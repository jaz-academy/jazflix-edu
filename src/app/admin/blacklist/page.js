import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import Navbar from "@/components/Navbar";
import BlacklistManager from "@/components/BlacklistManager";

export const metadata = {
  title: "Manajemen Blacklist - Superadmin Jazflix",
  description: "Kelola konten terlarang / disembunyikan untuk Film, Series, dan Artis",
};

export default async function AdminBlacklistPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  let user = null;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    redirect("/login");
  }

  // Khusus role superadmin
  if (user?.role !== "superadmin") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-24 pb-16">
        <BlacklistManager currentUser={user} />
      </div>
    </div>
  );
}
