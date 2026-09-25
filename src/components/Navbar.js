"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Navbar({ onSearch }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogout = () => {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/login";
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    // Fetch current user
    const checkUser = async () => {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (e) {
        // Not logged in or error
      }
    };
    checkUser();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Close mobile menu on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isUserAdmin =
    currentUser?.role === "admin" || currentUser?.role === "superadmin";

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Movies", href: "/movies" },
    { name: "TV Shows", href: "/tv" },
    { name: "Peoples", href: "/people" },
  ];

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-colors duration-300 ${
        scrolled || mobileMenuOpen
          ? "bg-black/95 shadow-2xl"
          : "bg-gradient-to-b from-black/90 via-black/40 to-transparent"
      }`}
    >
      <div className="w-full flex items-center justify-between px-4 md:px-8 py-3.5">
        {/* Logo & Main Nav */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-2xl font-black text-red-600 tracking-wider hover:opacity-90 transition flex items-center gap-1.5"
          >
            <span>JAZFLIX</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex gap-6 text-sm items-center font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors duration-200 ${
                  isActive(link.href)
                    ? "text-red-500 font-bold border-b-2 border-red-500 pb-0.5"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            ))}

            {isUserAdmin && (
              <div className="flex items-center gap-4 pl-4 border-l border-zinc-700">
                <Link
                  href="/admin"
                  className={`transition-colors duration-200 ${
                    isActive("/admin") &&
                    !pathname.startsWith("/admin/users") &&
                    !pathname.startsWith("/admin/tv")
                      ? "text-red-500 font-bold"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  Kelola Film
                </Link>
                <Link
                  href="/admin/tv"
                  className={`transition-colors duration-200 ${
                    isActive("/admin/tv")
                      ? "text-red-500 font-bold"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  Kelola Series
                </Link>
                <Link
                  href="/admin/users"
                  className={`transition-colors duration-200 ${
                    isActive("/admin/users")
                      ? "text-red-500 font-bold"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  Users
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Search, User Profile, Mobile Toggle */}
        <div className="flex items-center gap-4">
          {/* Quick Search on Home or onSearch provided */}
          {onSearch ? (
            <div className="relative flex items-center">
              {!showSearch && (
                <button
                  onClick={() => setShowSearch(true)}
                  className="text-zinc-300 hover:text-white transition p-1.5 rounded-lg hover:bg-zinc-800/60 cursor-pointer"
                  title="Cari"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                    />
                  </svg>
                </button>
              )}

              {showSearch && (
                <div className="relative flex items-center">
                  <input
                    autoFocus
                    value={keyword}
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      onSearch(e.target.value);
                    }}
                    onBlur={() => {
                      if (!keyword) setShowSearch(false);
                    }}
                    className="w-44 md:w-60 bg-black/80 text-white pl-8 pr-3 py-1.5 rounded-xl border border-zinc-600 text-xs focus:outline-none focus:border-red-500"
                    placeholder="Search movies..."
                    type="text"
                  />
                  <svg
                    className="w-4 h-4 text-zinc-400 absolute left-2.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                    />
                  </svg>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/movies"
              className="text-zinc-300 hover:text-white transition p-1.5 rounded-lg hover:bg-zinc-800/60"
              title="Eksplorasi Film"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                />
              </svg>
            </Link>
          )}

          {/* Desktop User / Auth Button */}
          <div className="hidden md:flex items-center">
            {currentUser ? (
              <div className="flex items-center gap-3 pl-2 border-l border-zinc-700">
                <div className="flex items-center gap-2">
                  {currentUser.avatar ? (
                    <Image
                      src={currentUser.avatar}
                      alt={currentUser.name || "User"}
                      width={28}
                      height={28}
                      unoptimized={true}
                      className="w-7 h-7 rounded-full object-cover border border-zinc-600"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#7367F0] flex items-center justify-center text-white text-xs font-bold">
                      {(currentUser.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-zinc-300 font-medium max-w-[120px] truncate">
                    {currentUser.name}
                  </span>
                  {currentUser.role && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        currentUser.role === "superadmin"
                          ? "bg-red-950 text-red-300 border border-red-800"
                          : currentUser.role === "admin"
                            ? "bg-purple-950 text-purple-300 border border-purple-800"
                            : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {currentUser.role}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs text-zinc-400 hover:text-red-400 cursor-pointer ml-1"
                  title="Keluar"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-red-600 hover:bg-red-700 transition text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md cursor-pointer ml-2"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-zinc-400 hover:text-white focus:outline-none"
            aria-label="Toggle Navigation"
          >
            <i
              className={`fa-solid ${mobileMenuOpen ? "fa-xmark text-xl" : "fa-bars text-xl"}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-black/95 px-6 py-5 space-y-4 shadow-2xl animate-in fade-in duration-200">
          <div className="flex flex-col space-y-3 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`py-2 px-3 rounded-lg transition ${
                  isActive(link.href)
                    ? "bg-red-600/20 text-red-500 font-bold"
                    : "text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                {link.name}
              </Link>
            ))}

            {isUserAdmin && (
              <>
                <div className="border-t border-zinc-800 pt-2 text-xs text-zinc-500 font-bold uppercase tracking-wider px-3">
                  Admin Area
                </div>
                <Link
                  href="/admin"
                  className={`py-2 px-3 rounded-lg transition ${
                    isActive("/admin") &&
                    !pathname.startsWith("/admin/users") &&
                    !pathname.startsWith("/admin/tv")
                      ? "bg-red-600/20 text-red-500 font-bold"
                      : "text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  Kelola Film
                </Link>
                <Link
                  href="/admin/tv"
                  className={`py-2 px-3 rounded-lg transition ${
                    isActive("/admin/tv")
                      ? "bg-red-600/20 text-red-500 font-bold"
                      : "text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  Kelola TV Series
                </Link>
                <Link
                  href="/admin/users"
                  className={`py-2 px-3 rounded-lg transition ${
                    isActive("/admin/users")
                      ? "bg-red-600/20 text-red-500 font-bold"
                      : "text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  Manage Users
                </Link>
              </>
            )}
          </div>

          {/* Mobile User Profile or Login */}
          <div className="border-t border-zinc-800 pt-4">
            {currentUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {currentUser.avatar ? (
                    <Image
                      src={currentUser.avatar}
                      alt={currentUser.name || "User"}
                      width={32}
                      height={32}
                      unoptimized={true}
                      className="w-8 h-8 rounded-full object-cover border border-zinc-600"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#7367F0] flex items-center justify-center text-white text-xs font-bold">
                      {(currentUser.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {currentUser.email || currentUser.role}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:text-red-400"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="w-full block text-center bg-red-600 hover:bg-red-700 transition text-white py-2.5 rounded-xl text-sm font-semibold shadow-md"
              >
                Login dengan Jaz Academy
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
