"use client";
import { useState, useMemo } from "react";
import Image from "next/image";

export default function TableUsers({ users = [] }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState(null);
  const perPage = 10;

  const handleRoleChange = async (userId, newRole) => {
    if (!confirm(`Ubah role pengguna ini menjadi "${newRole}"?`)) return;
    setLoadingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Gagal mengubah role");
        return;
      }
      window.location.reload();
    } catch (e) {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm("Yakin ingin menghapus pengguna ini dari database Jazflix?"))
      return;
    setLoadingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Gagal menghapus pengguna");
        return;
      }
      window.location.reload();
    } catch (e) {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      return (
        s === "" ||
        name.includes(s) ||
        email.includes(s) ||
        username.includes(s)
      );
    });
  }, [search, users]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (Math.min(page, totalPages) - 1) * perPage;
  const paginated = filtered.slice(start, start + perPage);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Manajemen Pengguna
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Daftar seluruh akun yang terautentikasi dan terdaftar via Single
            Sign-On jazacademy.id
          </p>
        </div>

        {/* Filter Bar */}
        <input
          type="text"
          placeholder="Cari nama, email, username..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="px-3.5 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-sm w-full md:w-72 focus:outline-none focus:border-red-500 transition"
        />
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto bg-zinc-950/60 rounded-2xl border border-zinc-800 shadow-xl backdrop-blur-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-900/70 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
            <tr>
              <th className="px-5 py-3.5">Pengguna</th>
              <th className="hidden lg:table-cell px-5 py-3.5">Email</th>
              <th className="hidden lg:table-cell px-5 py-3.5">
                ID JazAcademy
              </th>
              <th className="hidden lg:table-cell px-5 py-3.5">Tipe Member</th>
              <th className="hidden md:table-cell px-5 py-3.5">Role Jazflix</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-zinc-500 text-sm"
                >
                  Tidak ada pengguna ditemukan.
                </td>
              </tr>
            ) : (
              paginated.map((u) => {
                const isSuperadmin = u.role === "superadmin";

                return (
                  <tr key={u._id} className="hover:bg-zinc-900/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <Image
                            src={u.avatar}
                            alt={u.name || "User"}
                            width={36}
                            height={36}
                            unoptimized={true}
                            className="w-9 h-9 rounded-full object-cover border border-zinc-700"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#7367F0] flex items-center justify-center text-white font-bold text-xs">
                            {(u.name || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-zinc-100">
                            {u.name || "-"}
                          </div>
                          <div className="text-xs text-zinc-400">
                            @{u.username || "anon"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-5 py-3.5 text-zinc-300 font-mono text-xs">
                      {u.email}
                    </td>
                    <td className="hidden lg:table-cell px-5 py-3.5">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                        #{u.jazacademyId || "-"}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-5 py-3.5">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/60 font-medium">
                        {u.memberType || "Member"}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-5 py-3.5">
                      {isSuperadmin ? (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-red-950 text-red-200 border border-red-800 font-bold uppercase tracking-wider">
                          superadmin
                        </span>
                      ) : (
                        <select
                          disabled={loadingId === u._id}
                          value={u.role || "member"}
                          onChange={(e) =>
                            handleRoleChange(u._id, e.target.value)
                          }
                          className="bg-zinc-900 text-xs border border-zinc-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-red-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                          <option value="superadmin">superadmin</option>
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {!isSuperadmin && (
                        <button
                          disabled={loadingId === u._id}
                          onClick={() => handleRemove(u._id)}
                          className="text-zinc-500 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-950/30 cursor-pointer disabled:opacity-50"
                          title="Hapus Pengguna"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-5 text-xs text-zinc-400">
        <div>
          {paginated.length > 0 ? start + 1 : 0} -{" "}
          {Math.min(start + perPage, total)} dari {total}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => page > 1 && setPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Prev
          </button>
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => page < totalPages && setPage(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
