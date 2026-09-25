"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

export default function PeopleExplorer({
  initialPeople = [],
  initialCategory = "popular",
}) {
  const [people, setPeople] = useState(initialPeople);
  const [category, setCategory] = useState(initialCategory);
  const [department, setDepartment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(50);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const searchTimer = useRef(null);

  const categories = [
    { id: "popular", label: "Populer", icon: "fa-solid fa-star text-yellow-500" },
    { id: "trending", label: "Trending", icon: "fa-solid fa-fire text-red-500" },
  ];

  const departments = [
    { id: "", label: "Semua Profesi" },
    { id: "Acting", label: "Aktor / Aktris" },
    { id: "Directing", label: "Sutradara" },
    { id: "Writing", label: "Penulis" },
    { id: "Production", label: "Produser" },
  ];

  const fetchPeople = async (newCategory, newDept, query, pageNum = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        category: newCategory,
        department: newDept,
        query: query.trim(),
        page: pageNum.toString(),
      });
      const res = await fetch(`/api/tmdb/people?${params.toString()}`);
      const data = await res.json();
      const results = data.results || [];

      if (append) {
        setPeople((prev) => [...prev, ...results]);
      } else {
        setPeople(results);
      }
      setTotalPages(data.totalPages || 1);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to fetch people:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCategoryChange = (catId) => {
    setCategory(catId);
    setSearchQuery("");
    fetchPeople(catId, department, "", 1, false);
  };

  const handleDepartmentChange = (deptId) => {
    setDepartment(deptId);
    fetchPeople(category, deptId, searchQuery, 1, false);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchPeople(category, department, val, 1, false);
    }, 400);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchPeople(category, department, searchQuery, page + 1, true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-20 text-white space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3 tracking-tight">
            <span>People</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Daftar aktor, aktris, dan sineas perfilman.
          </p>
        </div>

        {/* Real-time Search Bar */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari aktor / sutradara..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
          />
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-zinc-400 text-xs" />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-3 text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Department Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                category === cat.id && !searchQuery
                  ? "bg-red-600 text-white shadow-lg shadow-red-900/30"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
              }`}
            >
              {cat.icon && <i className={cat.icon} />}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Department Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">Profesi:</span>
          <select
            value={department}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            className="px-3.5 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Search Indicator */}
      {searchQuery && (
        <div className="text-xs text-zinc-400 flex items-center gap-2">
          <span>Hasil pencarian untuk:</span>
          <strong className="text-red-400">"{searchQuery}"</strong>
          <span>({people.length} orang ditemukan)</span>
        </div>
      )}

      {/* People Grid */}
      {loading ? (
        <div className="py-32 text-center text-zinc-400 flex items-center justify-center">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-red-500" />
        </div>
      ) : people.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 bg-zinc-950/60 rounded-2xl border border-zinc-800/80">
          <i className="fa-solid fa-user-slash text-4xl mb-3 block text-zinc-600" />
          <h3 className="text-base font-bold text-white mb-1">Tidak Ada Tokoh Ditemukan</h3>
          <p className="text-xs text-zinc-400">
            Coba kata kunci pencarian lain atau pilih kategori profesi yang berbeda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {people.map((p) => (
            <Link
              key={p.id}
              href={`/people/${p.id}`}
              className="group flex flex-col justify-between rounded-2xl overflow-hidden bg-zinc-900/90 border border-zinc-800/80 hover:border-red-500/60 transition-all duration-300 hover:scale-105 shadow-xl"
            >
              {/* Profile Photo Box */}
              <div className="aspect-[3/4] relative bg-zinc-950 overflow-hidden">
                <Image
                  src={p.profileImage || "/images/no-photo.png"}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                  className="object-cover group-hover:scale-105 transition duration-300"
                />

                {/* Department Tag */}
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-zinc-300 text-[10px] font-semibold border border-zinc-700">
                  {p.department || "Acting"}
                </div>

                {/* Popularity Badge */}
                {p.popularity > 0 && (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-red-600/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                    <i className="fa-solid fa-fire text-[9px]" />
                    <span>{p.popularity}</span>
                  </div>
                )}
              </div>

              {/* Person Meta Information */}
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <div>
                  <h2 className="font-bold text-sm text-white group-hover:text-red-400 transition line-clamp-1 leading-snug">
                    {p.name}
                  </h2>
                </div>

                {/* Known For preview */}
                {p.knownFor?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                    <span className="text-[10px] text-zinc-500 block">Karya Terkenal:</span>
                    <p className="line-clamp-2 text-zinc-300 text-[11px] leading-tight mt-0.5">
                      {p.knownFor.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Incremental Load More Button */}
      {!loading && people.length > 0 && page < totalPages && (
        <div className="pt-10 flex flex-col items-center justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-8 py-3.5 rounded-xl bg-zinc-900 hover:bg-red-600 disabled:opacity-50 text-white font-bold text-sm border border-zinc-700 hover:border-red-500 shadow-xl transition-all duration-200 cursor-pointer flex items-center gap-3 group"
          >
            {loadingMore ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-red-500" />
                <span>Memuat Lebih Banyak...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-arrow-down transition-transform group-hover:translate-y-1" />
                <span>Muat Lebih Banyak Tokoh</span>
              </>
            )}
          </button>
          <p className="text-xs text-zinc-500 mt-2">
            Halaman {page} dari {totalPages}
          </p>
        </div>
      )}
    </div>
  );
}
