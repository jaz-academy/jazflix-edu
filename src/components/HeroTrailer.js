"use client";
import Link from "next/link";
import Image from "next/image";
import Swiper from "swiper";
import { useEffect, useRef, useState } from "react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

const getYouTubeId = (url) => {
  const regExp = /(?:v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url?.match(regExp);
  return match ? match[1] : null;
};

export default function HeroTrailer({ trending = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const swiperRef = useRef(null);

  useEffect(() => {
    setVideoReady(false);

    const timer = setTimeout(() => {
      setVideoReady(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [activeIndex]);

  useEffect(() => {
    if (swiperRef.current) return; // cegah init ulang

    swiperRef.current = new Swiper(".myHero", {
      modules: [Pagination, Autoplay],
      loop: true,
      speed: 600,
      autoplay: { delay: 30000, disableOnInteraction: false },
      pagination: { el: ".swiper-pagination", clickable: true },
      watchSlidesProgress: true,
      preventClicks: true,
      preventClicksPropagation: true,
      on: {
        slideChange(swiper) {
          setActiveIndex(swiper.realIndex);
          if (container && container.scrollLeft !== 0) {
            container.scrollLeft = 0;
          }
        },
      },
    });

    // Cegah browser / D-Pad remote melakukan native horizontal scroll pada container Swiper
    const container = document.querySelector(".myHero");
    const onScroll = () => {
      if (container && container.scrollLeft !== 0) {
        container.scrollLeft = 0;
      }
    };
    container?.addEventListener("scroll", onScroll);

    // event jump (external trigger)
    const handler = (e) => {
      if (!swiperRef.current) return;

      const { index, movieId } = e.detail || {};

      if (typeof index === "number") {
        swiperRef.current.slideToLoop(index);
        return;
      }

      if (movieId && Array.isArray(trending)) {
        const idx = trending.findIndex((m) => m._id === movieId);
        if (idx >= 0) swiperRef.current.slideToLoop(idx);
      }
    };

    // pause autoplay saat tab / TV idle
    const onVisibility = () => {
      if (document.hidden) {
        swiperRef.current?.autoplay?.stop();
      } else {
        swiperRef.current?.autoplay?.start();
      }
    };

    window.addEventListener("hero:jump", handler);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("hero:jump", handler);
      document.removeEventListener("visibilitychange", onVisibility);
      container?.removeEventListener("scroll", onScroll);
      swiperRef.current?.destroy?.();
      swiperRef.current = null;
    };
  }, []);

  return (
    <div className="swiper myHero relative w-full h-screen overflow-hidden">
      <div className="swiper-wrapper">
        {trending.map((movie, index) => {
          const id = getYouTubeId(movie.trailerUrl);
          const isActive = index === activeIndex;
          return (
            <div
              className="swiper-slide relative overflow-hidden"
              key={movie.id || movie.movieId || movie._id}
              aria-hidden={!isActive}
              inert={!isActive ? "" : undefined}
            >
              <div
                className="relative w-full h-screen overflow-hidden bg-black"
                style={{
                  aspectRatio: "16 / 9",
                  minHeight: "100vh",
                }}
              >
                {/* IMAGE selalu tampil dulu */}
                <Image
                  src={movie.bannerImage || movie.posterImage || "/images/hero-image.png"}
                  alt={movie.title || "banner"}
                  fill
                  priority={index === 0}
                  className={`object-cover transition-opacity duration-700
                      ${isActive && videoReady ? "opacity-0" : "opacity-100"}`}
                />

                {/* VIDEO muncul setelah delay */}
                {isActive && videoReady && id && (
                  <iframe
                    className="absolute top-1/2 left-1/2 w-[360%] xl:w-[140%]
                      h-[360%] xl:h-[140%] -translate-x-1/2 -translate-y-1/2"
                    src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${id}`}
                    allow="autoplay; encrypted-media"
                  />
                )}
              </div>

              <div className="absolute z-20 left-10 md:left-20 top-1/3 -translate-y-1/2 max-w-lg space-y-3 pt-23  max-md:landscape:pt-2">
                <h1 className="text-4xl font-bold leading-tight">
                  {movie.title}
                </h1>
                <h3 className="hidden lg:block text-lg md:text-xl font-bold leading-tight max-md:landscape:hidden">
                  {movie.originalTitle}
                </h3>
                <div className="flex items-center gap-3 max-md:landscape:hidden">
                  {movie.genres?.slice(0, 5).map((genre, i) => (
                    <span
                      key={i}
                      className="px-2 pb-1 text-xs rounded-md bg-gray-800"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
                <p className="text-gray-300 text-sm md:text-base max-md:landscape:hidden">
                  {movie.description?.length > 100
                    ? `${movie.description.substring(0, 100)}...`
                    : movie.description}
                </p>
                <div className="flex items-center gap-3 text-sm text-yellow-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-star text-xs" />
                    <span>{movie.rating || 5}/10</span>
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-300">{movie.releaseYear}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-300">{movie.ageRating}</span>
                </div>
                <br />
                <Link
                  href={`/movie/${movie.id || movie.movieId || movie._id}`}
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") {
                      e.preventDefault();
                      e.stopPropagation();
                      swiperRef.current?.slideNext();
                    } else if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      e.stopPropagation();
                      swiperRef.current?.slidePrev();
                    }
                  }}
                  className={`tv-focusable px-6 py-2 rounded-md font-semibold transition z-[9999] inline-flex items-center gap-2 outline-none focus:ring-4 focus:ring-red-600 focus:shadow-[0_0_25px_rgba(220,38,38,0.9)] ${
                    movie.hasVideo
                      ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/50"
                      : "border-2 border-red-600 text-red-500 hover:bg-red-600 hover:text-white bg-black/40 backdrop-blur-sm"
                  }`}
                >
                  <i className="fa-solid fa-play"></i> Play
                </Link>
              </div>

              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/10 z-10"></div>
            </div>
          );
        })}
      </div>

      <div
        className="hidden lg:block swiper-pagination absolute !bottom-36 left-0 w-full z-[9999]"
        id="popular"
      ></div>
    </div>
  );
}
