"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * TVNavigationProvider
 * 
 * Memberikan dukungan Spatial Navigation (D-Pad Remote) 2D yang halus & responsif
 * untuk Google TV / Android TV. Menyediakan centering auto-scroll saat bernavigasi
 * ke bawah/atas dan memancarkan efek hover pada elemen yang aktif dipilih remote.
 */
export default function TVNavigationProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const lastFocusedElRef = useRef(null);

  useEffect(() => {
    // 1. Deteksi lingkungan TV
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isTVUserAgent = /Android.*(TV|LargeScreen)|GoogleTV|SmartTV|AFT|HbbTV|CrKey|BRAVIA/i.test(ua);
    const hasTVParam = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tv") === "1";
    const isTVStored = typeof sessionStorage !== "undefined" && sessionStorage.getItem("jazflix_tv_mode") === "true";

    const isTV = isTVUserAgent || hasTVParam || isTVStored;

    if (hasTVParam && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("jazflix_tv_mode", "true");
    }

    if (isTV) {
      document.documentElement.classList.add("tv-mode");
      document.body.classList.add("tv-mode");
    }

    // 2. Mengambil elemen-elemen yang dapat difokuskan
    const getFocusableElements = () => {
      const selectors = [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        '[tabindex="0"]:not([disabled])',
        ".tv-card",
        ".tv-focusable:not([disabled])",
      ].join(", ");

      const all = Array.from(document.querySelectorAll(selectors));
      return all.filter((el) => {
        // Abaikan elemen di dalam slide Swiper yang tidak aktif
        const swiperSlide = el.closest(".swiper-slide");
        if (swiperSlide && !swiperSlide.classList.contains("swiper-slide-active")) {
          return false;
        }

        // Abaikan elemen inert atau aria-hidden
        if (el.closest("[inert]") || el.closest('[aria-hidden="true"]')) {
          return false;
        }

        if (el.getAttribute("tabindex") === "-1") {
          return false;
        }

        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          el.offsetParent !== null &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          el.getAttribute("aria-hidden") !== "true" &&
          rect.width > 0 &&
          rect.height > 0
        );
      });
    };

    // 3. Algoritma 2D Spatial Navigation dengan Overlap Projection (Smooth & Natural)
    const findNextElement = (currentEl, direction) => {
      const elements = getFocusableElements();
      if (!elements.length) return null;

      if (!currentEl || currentEl === document.body || !elements.includes(currentEl)) {
        // Cari elemen paling relevan (prioritaskan konten di viewport atas atau card pertama)
        const visibleInViewport = elements.filter((el) => {
          const r = el.getBoundingClientRect();
          return r.top >= 0 && r.top <= window.innerHeight;
        });
        return visibleInViewport[0] || elements[0];
      }

      const currentRect = currentEl.getBoundingClientRect();
      const currentCenter = {
        x: currentRect.left + currentRect.width / 2,
        y: currentRect.top + currentRect.height / 2,
      };

      let bestCandidate = null;
      let minScore = Infinity;

      elements.forEach((el) => {
        if (el === currentEl) return;

        const rect = el.getBoundingClientRect();
        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };

        const dx = center.x - currentCenter.x;
        const dy = center.y - currentCenter.y;

        let primaryDist = 0;
        let secondaryDist = 0;
        let isHeadingValid = false;
        let overlap = 0;

        switch (direction) {
          case "ArrowRight":
            if (dx > 5) {
              isHeadingValid = true;
              primaryDist = dx;
              secondaryDist = Math.abs(dy);
              overlap = Math.max(0, Math.min(rect.bottom, currentRect.bottom) - Math.max(rect.top, currentRect.top));
            }
            break;
          case "ArrowLeft":
            if (dx < -5) {
              isHeadingValid = true;
              primaryDist = Math.abs(dx);
              secondaryDist = Math.abs(dy);
              overlap = Math.max(0, Math.min(rect.bottom, currentRect.bottom) - Math.max(rect.top, currentRect.top));
            }
            break;
          case "ArrowDown":
            if (dy > 5) {
              isHeadingValid = true;
              primaryDist = dy;
              secondaryDist = Math.abs(dx);
              overlap = Math.max(0, Math.min(rect.right, currentRect.right) - Math.max(rect.left, currentRect.left));
            }
            break;
          case "ArrowUp":
            if (dy < -5) {
              isHeadingValid = true;
              primaryDist = Math.abs(dy);
              secondaryDist = Math.abs(dx);
              overlap = Math.max(0, Math.min(rect.right, currentRect.right) - Math.max(rect.left, currentRect.left));
            }
            break;
          default:
            break;
        }

        if (isHeadingValid) {
          // Jika proyeksi beririsan (sejajar di kolom/baris yang sama), kurangi bobot orthogonal
          const overlapBonus = overlap > 0 ? 0.3 : 1.8;
          // Score mengutamakan elemen yang sejajar dan dekat
          const score = primaryDist + secondaryDist * overlapBonus;

          if (score < minScore) {
            minScore = score;
            bestCandidate = el;
          }
        }
      });

      return bestCandidate;
    };

    // 4. Centering Auto-Scroll: Menjaga card yang dipilih tetap di tengah layar TV
    const smoothScrollToElement = (el) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const currentScrollY = window.scrollY || window.pageYOffset;

      // Hitung posisi Y agar card tepat berada di area tengah layar (35%-50% dari atas)
      const targetY = currentScrollY + rect.top - (viewportHeight * 0.4 - rect.height / 2);

      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: "smooth",
      });

      // Cek apakah elemen ada di dalam carousel horizontal (misal Embla atau container overflow)
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        // Jangan pernah scroll container Swiper Hero secara horizontal
        if (parent.classList.contains("swiper") || parent.classList.contains("myHero")) {
          parent.scrollLeft = 0;
          parent = parent.parentElement;
          continue;
        }

        const style = window.getComputedStyle(parent);
        const canScrollX =
          style.overflowX === "auto" ||
          style.overflowX === "scroll" ||
          parent.classList.contains("embla__viewport") ||
          parent.classList.contains("overflow-x-auto");

        if (canScrollX) {
          const parentRect = parent.getBoundingClientRect();
          const targetX =
            parent.scrollLeft + (rect.left - parentRect.left) - (parentRect.width / 2 - rect.width / 2);
          parent.scrollTo({
            left: Math.max(0, targetX),
            behavior: "smooth",
          });
          break;
        }
        parent = parent.parentElement;
      }
    };

    // 5. Memberikan kelas visual & efek hover pada elemen yang terpilih
    const setActiveElement = (el) => {
      if (lastFocusedElRef.current && lastFocusedElRef.current !== el) {
        lastFocusedElRef.current.classList.remove("tv-focused");
      }

      if (el) {
        el.classList.add("tv-focused");
        lastFocusedElRef.current = el;
        el.focus();
        smoothScrollToElement(el);
      }
    };

    // 6. Tangani KeyDown dari Remote D-Pad
    const handleKeyDown = (e) => {
      const key = e.key;
      const keyCode = e.keyCode;

      // D-Pad Directional Keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === "input" && document.activeElement?.type === "text") {
          return;
        }

        const nextEl = findNextElement(document.activeElement, key);
        if (nextEl) {
          e.preventDefault();
          setActiveElement(nextEl);
        } else if (key === "ArrowUp" && (window.scrollY || window.pageYOffset) > 15) {
          // Jika tidak ada elemen lagi di atas dan halaman belum mentok di atas,
          // gulir ke paling atas layar agar navbar muncul dan terima fokus
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          setTimeout(() => {
            const firstNavEl = document.querySelector("nav a[href], nav button");
            if (firstNavEl) setActiveElement(firstNavEl);
          }, 250);
        }
      }

      // Tombol Back di Remote Google TV
      if (key === "Escape" || key === "GoBack" || keyCode === 4 || keyCode === 27) {
        if (document.activeElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        if (window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Saat fokus berpindah secara natural (misal klik mouse atau programatik)
    const handleFocusIn = (e) => {
      if (e.target && e.target !== document.body) {
        if (lastFocusedElRef.current && lastFocusedElRef.current !== e.target) {
          lastFocusedElRef.current.classList.remove("tv-focused");
        }
        e.target.classList.add("tv-focused");
        lastFocusedElRef.current = e.target;
        smoothScrollToElement(e.target);
      }
    };

    window.addEventListener("focusin", handleFocusIn);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("focusin", handleFocusIn);
    };
  }, [router, pathname]);

  return <>{children}</>;
}
