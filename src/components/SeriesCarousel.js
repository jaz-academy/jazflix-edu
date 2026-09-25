"use client";
import { useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import Link from "next/link";
import Image from "next/image";

function SeriesCarouselTrack({ series = [] }) {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, dragFree: true, skipSnaps: true },
    [
      AutoScroll({
        speed: 0.5,
        direction: "forward",
        pauseOnHover: true,
        stopOnInteraction: false,
        playOnInit: true,
      }),
    ],
  );

  return (
    <div className="embla">
      <div
        className="embla__viewport overflow-hidden"
        style={{ width: "100%" }}
        ref={emblaRef}
      >
        <div className="embla__container flex">
          {series.map((item, i) => {
            const sId = item.id || item.tvId || item._id;
            const imgUrl =
              item.bannerImage || item.posterImage || "/images/no-photo.png";
            const genreStr = Array.isArray(item.genres)
              ? item.genres.slice(0, 3).join(", ")
              : "";

            return (
              <div
                key={sId || i}
                className="embla__slide flex-shrink-0 ml-4 cursor-pointer"
                style={{ width: 360 }}
              >
                <div className="rounded-xl overflow-hidden relative w-[360px] h-60 bg-zinc-900 group">
                  <Link href={`/tv/${sId}`}>
                    <Image
                      className="w-full h-60 object-cover hover:scale-105 transition duration-300"
                      alt={item.title || "Series"}
                      src={imgUrl}
                      width={360}
                      height={240}
                    />
                  </Link>

                  {/* Top-Left: SERIES Badge */}
                  <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-zinc-300 text-[10px] font-semibold border border-zinc-700 shadow-md">
                    SERIES
                  </div>

                  {/* Top-Right: Play icon kotak merah jika tersedia di MongoDB */}
                  {item.hasVideo && (
                    <div
                      className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg bg-red-600/90 text-white flex items-center justify-center shadow-lg shadow-red-950/60 backdrop-blur-sm border border-red-400/40 pointer-events-none"
                      title="Tersedia untuk ditonton di Jazflix"
                    >
                      <i className="fa-solid fa-play text-xs" />
                    </div>
                  )}
                </div>

                <div className="rounded-b-xl text-bold text-sm mt-2">
                  <span className="text-bold text-gray-300">
                    {item.title}{" "}
                  </span>
                  {genreStr && `- ${genreStr}`}
                  <div className="flex items-center gap-3 text-sm text-yellow-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <i className="fa-solid fa-star text-xs" />
                      <span>{item.rating || 5}/10</span>
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-300">
                      {item.releaseYear || "Coming Soon"}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-300">
                      {item.ageRating || "TV-14"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SeriesCarousel({
  populars = [],
  topRated = [],
  showing = [],
}) {
  const [activeTab, setActiveTab] = useState("popular");

  const tabs = [
    { id: "popular", label: "Popular", icon: "fa-fire", data: populars },
    { id: "top_rated", label: "Top Rated", icon: "fa-star", data: topRated },
    {
      id: "showing",
      label: "Showing",
      icon: "fa-tv",
      data: showing,
    },
  ];

  const currentSeries = tabs.find((t) => t.id === activeTab)?.data || populars;

  return (
    <section className="px-6 mt-10">
      {/* Header & Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Discover Series</h2>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-wider">
            TMDB
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-red-600 text-white shadow-md shadow-red-900/40"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-xs`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Carousel based on selected tab */}
      <SeriesCarouselTrack series={currentSeries} key={activeTab} />
    </section>
  );
}
