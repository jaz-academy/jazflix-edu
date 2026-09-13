"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import InstallPWA from "./InstallPWA";

function LoginContent() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      setErrorMessage(decodeURIComponent(err));
    }
  }, [searchParams]);

  const handleSSOLogin = () => {
    setLoading(true);
    window.location.href = "/api/auth/sso";
  };

  return (
    <div className="w-full max-w-md bg-zinc-950/80 border border-zinc-800/80 p-8 rounded-2xl shadow-2xl backdrop-blur-md text-white">
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-40 h-16 mb-2">
          <Image
            src="/images/logo.png"
            alt="Jazflix Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <p className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">
          Single Sign-On Identity
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs text-center flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4 shrink-0 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm text-zinc-300 text-center leading-relaxed">
          Gunakan akun resmi{" "}
          <strong className="text-white">jazacademy.id</strong> Anda untuk masuk
          atau mendaftar secara otomatis ke Jazflix.
        </p>

        <button
          type="button"
          onClick={handleSSOLogin}
          disabled={loading}
          className="w-full relative flex items-center justify-center gap-3 bg-[#7367F0] hover:bg-[#6355EE] active:bg-[#5244dd] text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-[#7367f0]/25 hover:shadow-[#7367f0]/40 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg
              className="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
              viewBox="0 0 34 34"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="m 16.972301,-0.09806267 0.0064,10.99222467 11.838068,4.110085 c 0.06078,0.0211 0.100507,0.07867 0.100142,0.142756 l -0.0085,1.627841 c 0,0.02824 0.0229,0.05114 0.05114,0.05114 l 4.951705,-0.0043 c 0.04099,0 0.06179,-0.0208 0.06179,-0.06179 L 33.934656,4.0546354 c -0.04625,-1.922745 -1.044575,-3.60467307 -3.402699,-4.08877807 0,0 -10.365717,-0.04848 -13.559659,-0.06392 z M 20.835227,16.7301 c -0.0091,0 -0.01704,0.0058 -0.01704,0.01491 v 4.442472 c 0,0.0091 0.0079,0.01705 0.01704,0.01705 h 3.042614 c 0.0091,0 0.01704,-0.0079 0.01704,-0.01705 V 16.74501 c 0,-0.0091 -0.0079,-0.01491 -0.01704,-0.01491 z m 8.03054,5.18821 c -0.03775,-8.1e-4 -0.05582,0.01806 -0.0554,0.0554 l 0.0064,1.791903 c 4.1e-4,0.02029 -0.0086,0.03398 -0.0277,0.04048 -3.87393,1.36937 -7.74762,2.740816 -11.620739,4.112216 l -0.234375,0.03196 -0.02131,0.02131 0.02131,0.03622 0.02344,0.01279 0.01705,0.02983 -0.0085,4.964489 -0.02131,0.666903 0.0021,0.276989 12.758523,0.0277 c 3.678752,4.8e-4 4.360907,-3.036361 4.335937,-4.747159 l 0.0277,-7.178268 -0.03622,-0.03835 z"
                fill="currentColor"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M 16.972301,-0.08740967 4.2265625,0.04256233 C 1.3248445,0.07216233 0.0107163,2.0628874 0.00994314,3.9821914 L 0.00142041,29.002827 C -0.00734128,32.869936 1.4389811,34.048395 4.9509943,34.01419 L 16.96804,33.96092 16.97869,33.7095 16.96591,33.014898 c 0.03101,-1.652863 -0.0024,-3.310408 0.0085,-4.964489 -2e-5,-0.01242 -0.0062,-0.02383 -0.01705,-0.02983 l -0.02344,-0.01279 c -0.0146,-0.0077 -0.01998,-0.01958 -0.01918,-0.03622 8.1e-4,-0.01621 0.007,-0.02331 0.01918,-0.02131 L 5.2045454,23.810355 c -0.019892,-0.0073 -0.028125,-0.01978 -0.027699,-0.04048 0.012171,-0.443605 0.018366,-0.888477 0.019176,-1.331676 0.00487,-2.40553 0.00862,-4.815452 0.010653,-7.231534 0,-0.07143 0.032769,-0.118816 0.1001421,-0.142756 L 16.978693,10.894162 Z m -6.779829,16.83029367 -0.01918,0.01918 -0.0064,4.427557 3.09375,-0.01065 c 0.01006,0 0.01918,-0.007 0.01918,-0.01705 l 0.01918,-4.399858 c 0,-0.01006 -0.0091,-0.01918 -0.01918,-0.01918 z"
                fill="currentColor"
              />
            </svg>
          )}
          <span>{loading ? "Menghubungkan..." : "Login Jazacademy.id"}</span>
        </button>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-xs text-zinc-400 hover:text-white transition inline-flex items-center gap-1.5"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Kembali menonton film di Beranda</span>
        </Link>
      </div>
    </div>
  );
}

export default function LoginForm() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-black via-zinc-950 to-black">
      <InstallPWA />
      <Suspense
        fallback={
          <div className="text-white text-sm">Memuat form login...</div>
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  );
}
