"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

export default function BlacklistManager({ currentUser }) {
  const [activeTab, setActiveTab] = useState("movie"); // "movie" | "tv" | "person"
  const [viewMode, setViewMode] = useState("blacklist"); // "blacklist" | "tmdb"
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingReasons, setEditingReasons] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch blacklisted items from MongoDB
  const fetchBlacklist = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        mediaType: activeTab,
        search: searchQuery,
      });
      const res = await fetch(`/api/admin/blacklist?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        // Initialize reasons
        const reasons = {};
        (data.items || []).forEach((item) => {
          const key = String(item._id || item.tmdbId);
          reasons[key] = item.reason || "";
        });
        setEditingReasons(reasons);
      } else {
        showToast("Gagal memuat daftar blacklist", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  // Fetch TMDB search items with blacklist status merged
  const fetchTmdb = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        mediaType: activeTab,
        query: searchQuery,
      });
      const res = await fetch(`/api/admin/blacklist/search-tmdb?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.results || []);
        const reasons = {};
        (data.results || []).forEach((item) => {
          const key = String(item.id || item.tmdbId);
          reasons[key] = item.reason || "";
        });
        setEditingReasons(reasons);
      } else {
        showToast("Gagal mencari data di TMDB", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    if (viewMode === "blacklist") {
      fetchBlacklist();
    } else {
      fetchTmdb();
    }
  }, [activeTab, viewMode, fetchBlacklist, fetchTmdb]);

  // Toggle switch "Jangan Tampilkan" for existing DB blacklist item
  const handleToggleActive = async (item) => {
    const idKey = String(item._id);
    setUpdatingId(idKey);
    const newStatus = !item.isActive;
    try {
      const res = await fetch(`/api/admin/blacklist/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (String(i._id) === idKey ? { ...i, isActive: newStatus } : i))
        );
        showToast(
          newStatus
            ? "Status diubah: Konten sekarang disembunyikan!"
            : "Status diubah: Konten sekarang diizinkan tampil."
        );
      } else {
        showToast("Gagal memperbarui status", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  // Save reason for existing DB item
  const handleSaveReason = async (item) => {
    const idKey = String(item._id);
    const reasonText = editingReasons[idKey] || "";
    setUpdatingId(idKey);
    try {
      const res = await fetch(`/api/admin/blacklist/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reasonText }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (String(i._id) === idKey ? { ...i, reason: reasonText } : i))
        );
        showToast("Alasan blacklist berhasil disimpan!");
      } else {
        showToast("Gagal menyimpan alasan", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete from blacklist DB
  const handleDeleteBlacklist = async (item) => {
    if (!confirm(`Hapus "${item.title}" dari database blacklist?`)) return;
    const idKey = String(item._id);
    setUpdatingId(idKey);
    try {
      const res = await fetch(`/api/admin/blacklist/${item._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => String(i._id) !== idKey));
        showToast("Konten berhasil dihapus dari daftar blacklist.");
      } else {
        showToast("Gagal menghapus data", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  // Toggle or add blacklist for TMDB item in search mode
  const handleToggleTmdbItem = async (tmdbItem) => {
    const idKey = String(tmdbItem.id);
    setUpdatingId(idKey);
    const reasonText = editingReasons[idKey] || "";
    const nextActive = !tmdbItem.isActive;

    try {
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: tmdbItem.id,
          mediaType: activeTab,
          title: tmdbItem.title,
          originalTitle: tmdbItem.originalTitle || "",
          posterPath: tmdbItem.posterImage || "",
          releaseYear: tmdbItem.releaseYear || null,
          department: tmdbItem.department || "",
          reason: reasonText,
          isActive: nextActive,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((i) =>
            String(i.id) === idKey
              ? {
                  ...i,
                  isBlacklisted: true,
                  blacklistId: data.item._id,
                  isActive: nextActive,
                  reason: reasonText,
                }
              : i
          )
        );
        showToast(
          nextActive
            ? "Konten berhasil dimasukkan ke daftar blacklist (disembunyikan)!"
            : "Status diubah: Konten diizinkan tampil."
        );
      } else {
        showToast("Gagal menyimpan ke blacklist", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  // Save reason for TMDB item in search mode
  const handleSaveTmdbReason = async (tmdbItem) => {
    const idKey = String(tmdbItem.id);
    setUpdatingId(idKey);
    const reasonText = editingReasons[idKey] || "";

    try {
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: tmdbItem.id,
          mediaType: activeTab,
          title: tmdbItem.title,
          originalTitle: tmdbItem.originalTitle || "",
          posterPath: tmdbItem.posterImage || "",
          releaseYear: tmdbItem.releaseYear || null,
          department: tmdbItem.department || "",
          reason: reasonText,
          isActive: tmdbItem.isActive ?? true,
        }),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((i) =>
            String(i.id) === idKey ? { ...i, isBlacklisted: true, reason: reasonText } : i
          )
        );
        showToast("Alasan blacklist berhasil disimpan!");
      } else {
        showToast("Gagal menyimpan alasan", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const tabs = [
    { id: "movie", label: "Film (Movies)", icon: "fa-film" },
    { id: "tv", label: "Series (TV Shows)", icon: "fa-tv" },
    { id: "person", label: "Artis / Tokoh (People)", icon: "fa-user-group" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border transition-all duration-300 animate-slide-in ${
            toast.type === "error"
              ? "bg-red-950/95 border-red-700 text-red-200"
              : "bg-emerald-950/95 border-emerald-700 text-emerald-200"
          }`}
        >
          <i
            className={`fa-solid ${
              toast.type === "error" ? "fa-circle-exclamation text-red-400" : "fa-circle-check text-emerald-400"
            }`}
          />
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <i className="fa-solid fa-ban text-red-500" />
              <span>Manajemen Filter Blacklist</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              Khusus Superadmin
            </span>
          </div>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Sembunyikan film, serial, atau artis dari seluruh halaman publik dan hasil pencarian Jazflix.
            Konten yang diblacklist tidak akan muncul di katalog, homepage, detail, maupun pemutar video.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setViewMode("blacklist")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              viewMode === "blacklist"
                ? "bg-red-600 text-white shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <i className="fa-solid fa-list-check" />
            <span>Daftar Ter-blacklist</span>
          </button>
          <button
            onClick={() => setViewMode("tmdb")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              viewMode === "tmdb"
                ? "bg-red-600 text-white shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <i className="fa-solid fa-magnifying-glass" />
            <span>Cari di TMDB</span>
          </button>
        </div>
      </div>

      {/* 3 Main Tabs */}
      <div className="flex border-b border-zinc-800 mb-6 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
              }}
              className={`pb-3.5 px-3 sm:px-4 text-sm font-bold flex items-center gap-2.5 transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? "border-red-500 text-red-500"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <i className={`fa-solid ${tab.icon}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (viewMode === "blacklist") fetchBlacklist();
                else fetchTmdb();
              }
            }}
            placeholder={
              viewMode === "blacklist"
                ? `Cari di daftar ${activeTab === "movie" ? "film" : activeTab === "tv" ? "series" : "tokoh"} yang diblacklist...`
                : `Ketik judul ${activeTab === "movie" ? "film" : activeTab === "tv" ? "series" : "nama tokoh"} untuk dicari di TMDB...`
            }
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
          />
        </div>
        <button
          onClick={() => {
            if (viewMode === "blacklist") fetchBlacklist();
            else fetchTmdb();
          }}
          className="w-full sm:w-auto px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-arrow-rotate-right" />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Data Content Table */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-red-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <i className="fa-solid fa-folder-open text-4xl text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            {viewMode === "blacklist" ? "Tidak ada konten diblacklist" : "Tidak ada hasil pencarian"}
          </h3>
          <p className="text-xs text-zinc-400 max-w-md">
            {viewMode === "blacklist"
              ? `Belum ada ${activeTab === "movie" ? "film" : activeTab === "tv" ? "series" : "artis"} yang dimasukkan ke daftar blacklist.`
              : "Coba gunakan kata kunci pencarian yang lain."}
          </p>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/90 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5 w-16">Media</th>
                  <th className="px-5 py-3.5">Judul / Nama & Info</th>
                  <th className="px-5 py-3.5 w-48 text-center">Jangan Tampilkan</th>
                  <th className="px-5 py-3.5">Alasan Blacklist</th>
                  <th className="px-5 py-3.5 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {items.map((item, idx) => {
                  const isDbMode = viewMode === "blacklist";
                  const idRaw = isDbMode ? item._id : item.id;
                  const itemId = String(idRaw || item.tmdbId || idx);
                  const rowKey = `${isDbMode ? "db" : "tmdb"}-${activeTab}-${itemId}-${idx}`;
                  const isUpdating = updatingId === itemId;
                  const isActive = isDbMode ? item.isActive : Boolean(item.isActive);
                  const reasonValue = editingReasons[itemId] ?? item.reason ?? "";

                  const posterUrl = isDbMode
                    ? item.posterPath || "/images/no-photo.png"
                    : item.posterImage || "/images/no-photo.png";

                  return (
                    <tr
                      key={rowKey}
                      className={`hover:bg-zinc-900/40 transition duration-150 ${
                        isActive ? "bg-red-950/10" : ""
                      }`}
                    >
                      {/* Thumbnail Poster */}
                      <td className="px-5 py-4 align-top">
                        <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/60 shrink-0">
                          <Image
                            src={posterUrl}
                            alt={item.title || "Poster"}
                            fill
                            className="object-cover"
                            sizes="48px"
                            unoptimized
                          />
                        </div>
                      </td>

                      {/* Title & Info */}
                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-white text-base leading-snug flex items-center gap-2">
                          <span>{item.title}</span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30">
                              Ter-blacklist
                            </span>
                          )}
                        </div>
                        {item.originalTitle && item.originalTitle !== item.title && (
                          <p className="text-xs text-zinc-500 italic mb-1">
                            {item.originalTitle}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                          {item.releaseYear && <span>Tahun: {item.releaseYear}</span>}
                          {item.department && <span>Profesi: {item.department}</span>}
                          <span className="text-zinc-500">
                            TMDB ID: #{isDbMode ? item.tmdbId : item.id}
                          </span>
                        </div>
                        {isDbMode && item.blacklistedBy?.name && (
                          <p className="text-[11px] text-zinc-500 mt-1">
                            Oleh: <strong className="text-zinc-400">{item.blacklistedBy.name}</strong>
                          </p>
                        )}
                      </td>

                      {/* Switch "Jangan Tampilkan" */}
                      <td className="px-5 py-4 align-top text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isActive}
                              disabled={isUpdating}
                              onChange={() => {
                                if (isDbMode) {
                                  handleToggleActive(item);
                                } else {
                                  handleToggleTmdbItem(item);
                                }
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                          </label>
                          <span
                            className={`text-[11px] font-bold ${
                              isActive ? "text-red-400" : "text-zinc-500"
                            }`}
                          >
                            {isActive ? "Sembunyikan" : "Tampilkan"}
                          </span>
                        </div>
                      </td>

                      {/* Reason Input */}
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-col gap-1.5 max-w-sm">
                          <textarea
                            rows={2}
                            value={reasonValue}
                            onChange={(e) =>
                              setEditingReasons((prev) => ({
                                ...prev,
                                [itemId]: e.target.value,
                              }))
                            }
                            placeholder="Tulis alasan blacklist (misal: vulgar, hak cipta, dsb)..."
                            className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition resize-none"
                          />
                          <button
                            onClick={() => {
                              if (isDbMode) {
                                handleSaveReason(item);
                              } else {
                                handleSaveTmdbReason(item);
                              }
                            }}
                            disabled={isUpdating}
                            className="self-end px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-[11px] font-semibold transition flex items-center gap-1.5"
                          >
                            <i className="fa-solid fa-floppy-disk text-[10px]" />
                            <span>Simpan Alasan</span>
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 align-top text-center">
                        {isDbMode ? (
                          <button
                            onClick={() => handleDeleteBlacklist(item)}
                            disabled={isUpdating}
                            title="Hapus dari database blacklist"
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                          >
                            <i className="fa-solid fa-trash-can text-sm" />
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            {item.isBlacklisted ? "Terdaftar" : "Baru"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
