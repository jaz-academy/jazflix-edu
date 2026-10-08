"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";

const removeTvShow = async (id) => {
  if (!confirm("Yakin mau menghapus serial TV ini dari database?")) return;
  try {
    const res = await fetch(`/api/tv/${id}`, { method: "DELETE" });
    if (res.ok) {
      window.location.reload();
    } else {
      alert("Gagal menghapus serial TV.");
    }
  } catch (err) {
    console.error("Delete error:", err);
    alert("Terjadi kesalahan saat menghapus.");
  }
};

export default function TableTvShows({ tvShows = [], years = [] }) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");
  const [videoFilter, setVideoFilter] = useState("");

  const perPage = 10;

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    let list = tvShows.filter((t) => {
      const title = (t.title || "").toString().toLowerCase();
      const original = (t.originalTitle || "").toString().toLowerCase();
      const tvYear = t.releaseYear || "";

      const textMatch = s === "" || title.includes(s) || original.includes(s);
      const yearMatch = year === "" || !year || String(tvYear) === String(year);

      const episodes = t.episodes || [];
      const filledCount = episodes.filter(
        (e) => e.videoUrl && e.videoUrl.trim(),
      ).length;
      const totalCount = episodes.length;

      let videoMatch = true;
      if (videoFilter === "complete") {
        videoMatch = totalCount > 0 && filledCount === totalCount;
      } else if (videoFilter === "partial") {
        videoMatch = filledCount > 0 && filledCount < totalCount;
      } else if (videoFilter === "empty") {
        videoMatch = filledCount === 0;
      }

      return textMatch && yearMatch && videoMatch;
    });

    if (sortBy) {
      list = [...list].sort((a, b) => {
        const A = a[sortBy] ?? "";
        const B = b[sortBy] ?? "";
        if (A < B) return sortDir === "asc" ? -1 : 1;
        if (A > B) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [search, year, videoFilter, tvShows, sortBy, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (Math.min(page, totalPages) - 1) * perPage;
  const paginated = filtered.slice(start, start + perPage);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 text-white">
      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2.5">
            <span>Kelola Serial TV</span>
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Daftarkan serial dari TMDB dan kelola link video streaming untuk
            setiap episode per musim.
          </p>
        </div>

        <Link
          href="/admin/tv/add"
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-lg transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <i className="fa-solid fa-plus" />
          Tambah <span className="hidden lg:inline">Video per Episode</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="hidden sm:block relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Cari judul serial..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
          />
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-zinc-500 text-xs" />
        </div>

        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
        >
          <option value="">Semua Tahun</option>
          {years.map((y, i) => (
            <option key={i} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={videoFilter}
          onChange={(e) => {
            setVideoFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
        >
          <option value="">Semua Status Video</option>
          <option value="complete">Lengkap (100% Terisi)</option>
          <option value="partial">Sebagian Terisi</option>
          <option value="empty">Belum Ada Video</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-zinc-900/60 rounded-2xl border border-zinc-800 shadow-xl">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/60 text-left text-zinc-400 text-xs border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3.5 w-16">Poster</th>
              <th
                className="px-4 py-3.5 cursor-pointer hover:text-white"
                onClick={() => handleSort("title")}
              >
                Judul & TMDB ID
              </th>
              <th
                className="px-4 py-3.5 cursor-pointer hover:text-white text-center w-24"
                onClick={() => handleSort("releaseYear")}
              >
                Tahun
              </th>
              <th className="px-4 py-3.5 text-center w-36">Total Musim</th>
              <th className="px-4 py-3.5 w-44">Progres Video Episode</th>
              <th className="px-4 py-3.5 text-center w-36">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-xs">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-zinc-500">
                  <i className="fa-solid fa-tv text-3xl mb-2 block text-zinc-600" />
                  <span>Belum ada serial TV yang terdaftar di database.</span>
                </td>
              </tr>
            ) : (
              paginated.map((t) => {
                const episodes = t.episodes || [];
                const filledCount = episodes.filter(
                  (e) => e.videoUrl && e.videoUrl.trim(),
                ).length;
                const totalCount = episodes.length;
                const percentage =
                  totalCount > 0
                    ? Math.round((filledCount / totalCount) * 100)
                    : 0;

                return (
                  <tr key={t._id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="w-10 h-14 relative rounded-md overflow-hidden bg-zinc-800">
                        <Image
                          src={t.posterImage || "/images/no-photo.png"}
                          alt={t.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white text-sm hover:text-red-400 transition">
                        <Link href={`/admin/tv/${t._id}`}>{t.title}</Link>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                        <span>TMDB ID: {t.tvId}</span>
                        {t.genres?.length > 0 && (
                          <span className="text-zinc-500">
                            • {t.genres.slice(0, 2).join(", ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-300 font-mono">
                      {t.releaseYear || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-300">
                      {t.numberOfSeasons || 1} Musim
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className={`font-semibold ${
                              filledCount === totalCount && totalCount > 0
                                ? "text-emerald-400"
                                : filledCount > 0
                                  ? "text-amber-400"
                                  : "text-zinc-500"
                            }`}
                          >
                            {filledCount} / {totalCount} Episode
                          </span>
                          <span className="text-zinc-500 font-mono">
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              filledCount === totalCount && totalCount > 0
                                ? "bg-emerald-500"
                                : filledCount > 0
                                  ? "bg-amber-500"
                                  : "bg-zinc-700"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/admin/tv/${t._id}`}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1 transition"
                          title="Kelola Episode"
                        >
                          <i className="fa-solid fa-pen-to-square text-amber-400" />
                          <span>Kelola</span>
                        </Link>
                        <Link
                          href={`/tv/${t.tvId}`}
                          target="_blank"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                          title="Lihat Halaman Publik"
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                        </Link>
                        <button
                          onClick={() => removeTvShow(t._id)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-600/30 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                          title="Hapus Serial"
                        >
                          <i className="fa-solid fa-trash text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-zinc-400">
          <span>
            Menampilkan {start + 1} - {Math.min(start + perPage, total)} dari{" "}
            {total} serial
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 disabled:opacity-40 text-white cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-mono">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 disabled:opacity-40 text-white cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
