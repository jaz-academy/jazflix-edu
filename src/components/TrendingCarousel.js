"use client";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";

import Image from "next/image";

export default function TrendingCarousel({ trending = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
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

  const handleClick = (index, movieId) => {
    // scroll embla to clicked card (optional)
    emblaApi?.scrollTo(index);
    // dispatch event for HeroTrailer
    window.dispatchEvent(
      new CustomEvent("hero:jump", { detail: { index, movieId } }),
    );
  };

  return (
    <section
      className="mt-10 absolute left-0 right-0 mx-auto w-full px-0 cursor-pointer"
      style={{ bottom: 0, zIndex: 30 }}
    >
      <div className="embla">
        <div
          className="embla__viewport overflow-hidden"
          style={{ width: "100%" }}
          ref={emblaRef}
        >
          <div className="embla__container flex">
            {trending.map((movie, i) => {
              const mId = movie.id || movie.movieId || movie._id;
              const imgUrl =
                movie.bannerImage ||
                movie.posterImage ||
                "/images/no-photo.png";
              return (
                <div
                  className="relative embla__slide flex-shrink-0 ml-4 py-2"
                  style={{ width: 180 }}
                  key={mId || i}
                >
                  <div
                    tabIndex={0}
                    role="button"
                    onClick={() => handleClick(i, mId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleClick(i, mId);
                      }
                    }}
                    className="tv-card group rounded-xl overflow-hidden relative w-[180px] h-28 bg-zinc-900 cursor-pointer outline-none transition-all duration-200 hover:scale-[1.03] focus:scale-[1.03] focus:ring-2 focus:ring-red-600 focus:shadow-[0_0_20px_rgba(220,38,38,0.8)] z-0 hover:z-20 focus:z-30 block"
                  >
                    <Image
                      className="w-full h-28 object-cover group-hover:scale-[1.03] group-focus:scale-[1.03] transition duration-300"
                      src={imgUrl}
                      alt={movie.title || "Movie banner"}
                      width={180}
                      height={112}
                    />
                  </div>
                  <div className="meta-strip rounded-b-xl text-bold text-xs">
                    <span className="text-bold text-gray-300 truncate block">
                      {movie.title}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-yellow-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <i className="fa-solid fa-star text-[10px]" />
                        <span>{movie.rating || 5}/10</span>
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-300">
                        {movie.ageRating || "PG"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
