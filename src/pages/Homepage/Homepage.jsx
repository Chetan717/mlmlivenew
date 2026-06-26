import Carosel from "./Component/Carosel";
import Festival from "./Component/Festival";
import ListOfGenaraltemp from "./Component/ListOfGenaraltemp";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  fetchGeneralTemplates,
  getTemplateCache,
  clearTemplateCache,
} from "./Component/Services/GeneralTemplateService";
import { useGeneralData } from "../../Context/GeneralContext";

const TOTAL_GROUPS    = 4;
const CACHE_TTL_MS    = 5 * 60 * 1000;
const PTR_THRESHOLD   = 72;
const PTR_MAX         = 100;
const SEEN_SERIAL_KEY = "mlm_seen_max_serial";

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInitialState() {
  const cache = getTemplateCache();
  if (cache.size === 0) return { templates: [], groupIndex: 0 };

  const merged = [];
  const seen   = new Set();
  let loaded   = 0;

  for (let i = 0; i < TOTAL_GROUPS; i++) {
    const key   = `${i}__`;
    const entry = cache.get(key);
    if (!entry) break;
    const data =
      typeof entry.data !== "undefined" && Date.now() - entry.ts < CACHE_TTL_MS
        ? entry.data
        : null;
    if (!data) break;
    data.forEach((g) => {
      if (!seen.has(g.type)) { seen.add(g.type); merged.push(g); }
    });
    loaded = i + 1;
  }

  return { templates: merged, groupIndex: loaded };
}

/** Highest serial across all loaded template groups */
function computeMaxSerial(groups) {
  let max = 0;
  groups.forEach((group) => {
    if (!Array.isArray(group.templates)) return;
    group.templates.forEach((t) => {
      const s = Number(t.serial) || 0;
      if (s > max) max = s;
    });
  });
  return max;
}

/** Read the serial we last marked as "seen" */
function getSeenSerial() {
  try { return Number(localStorage.getItem(SEEN_SERIAL_KEY)) || 0; }
  catch { return 0; }
}

/** Persist the current max serial as "seen" */
function markSeen(maxSerial) {
  try { localStorage.setItem(SEEN_SERIAL_KEY, String(maxSerial)); }
  catch {}
}

// ── Pull indicator ────────────────────────────────────────────────────────────
function PullIndicator({ pullY, refreshing }) {
  const progress   = Math.min(pullY / PTR_THRESHOLD, 1);
  const show       = pullY > 0 || refreshing;
  const translateY = refreshing
    ? 56
    : Math.min(pullY * 0.6, PTR_MAX * 0.6);

  return (
    <div
      className="absolute left-0 right-0 flex justify-center pointer-events-none z-50"
      style={{
        top: 0,
        transform: `translateY(${translateY - 48}px)`,
        transition: refreshing ? "transform 0.2s ease" : "none",
        opacity: show ? 1 : 0,
      }}
    >
      <div
        className="w-10 h-10 rounded-full bg-background shadow-lg border border-border flex items-center justify-center"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}
      >
        {refreshing ? (
          <svg className="w-5 h-5 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-accent"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: `rotate(${progress * 180}deg)`,
              transition: "transform 0.1s",
              color: progress >= 1 ? "var(--color-accent)" : "var(--color-foreground)",
              opacity: 0.5 + progress * 0.5,
            }}
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ── New-templates banner ──────────────────────────────────────────────────────
function NewTemplatesBanner({ onDismiss }) {
  const [visible, setVisible] = useState(false);

  // Animate in after mount
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(id);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className="mx-3 mb-1"
      style={{
        transform: visible ? "translateY(0)" : "translateY(-12px)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
      }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-accent/25"
        style={{
          background: "linear-gradient(135deg, rgba(0,136,218,0.10) 0%, rgba(26,58,143,0.08) 100%)",
          boxShadow: "0 2px 12px rgba(0,136,218,0.12)",
        }}
      >
        {/* Pulsing dot */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
        </span>

        <p className="flex-1 text-[13px] font-semibold text-accent leading-tight">
          New templates added!{" "}
          <span className="font-medium text-foreground/70">Pull down to refresh.</span>
        </p>

        {/* Dismiss × */}
        <button
          onClick={handleDismiss}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function Homepage() {
  const { setHasNewTemplates } = useGeneralData();

  const initial                        = getInitialState();
  const [templates, setTemplates]      = useState(initial.templates);
  const [loading, setLoading]          = useState(false);
  const [refreshing, setRefreshing]    = useState(false);
  const [pullY, setPullY]              = useState(0);
  const [showBanner, setShowBanner]    = useState(false);

  const loadingRef    = useRef(false);
  const refreshingRef = useRef(false);
  const groupIndexRef = useRef(initial.groupIndex);
  const maxSerialRef  = useRef(0);

  // Touch tracking
  const touchStartY      = useRef(0);
  const touchStartScroll = useRef(0);
  const isPulling        = useRef(false);

  // ── Check for new templates after load ─────────────────────────────────────
  const checkForNew = useCallback((groups) => {
    const currentMax = computeMaxSerial(groups);
    maxSerialRef.current = Math.max(maxSerialRef.current, currentMax);
    const seen = getSeenSerial();

    if (maxSerialRef.current > seen && seen > 0) {
      setShowBanner(true);
      setHasNewTemplates(true);
    } else if (seen === 0) {
      // First-ever visit — silently mark as seen
      markSeen(maxSerialRef.current);
    }
  }, [setHasNewTemplates]);

  // ── Mark seen (dismiss banner + clear tab badge) ───────────────────────────
  const handleDismissBanner = useCallback(() => {
    setShowBanner(false);
    setHasNewTemplates(false);
    markSeen(maxSerialRef.current);
  }, [setHasNewTemplates]);

  // ── Load templates (paginated) ─────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    if (loadingRef.current || groupIndexRef.current >= TOTAL_GROUPS) return;

    loadingRef.current = true;
    setLoading(true);

    const data = await fetchGeneralTemplates(groupIndexRef.current);

    setTemplates((prev) => {
      const existingTypes = new Set(prev.map((g) => g.type));
      const merged = [...prev, ...data.filter((g) => !existingTypes.has(g.type))];
      // Check after first group loads (groupIndex 0→1 transition)
      if (groupIndexRef.current === 0) checkForNew(merged);
      return merged;
    });

    groupIndexRef.current += 1;
    loadingRef.current    = false;
    setLoading(false);
  }, [checkForNew]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const doRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setShowBanner(false);
    setHasNewTemplates(false);
    setPullY(0);

    clearTemplateCache();
    setTemplates([]);
    groupIndexRef.current = 0;
    loadingRef.current    = false;
    maxSerialRef.current  = 0;

    const data = await fetchGeneralTemplates(0);
    setTemplates(data);
    groupIndexRef.current = 1;

    // Mark current max as seen after a manual refresh
    const newMax = computeMaxSerial(data);
    maxSerialRef.current = newMax;
    markSeen(newMax);

    setRefreshing(false);
    refreshingRef.current = false;
    setLoading(false);
  }, [setHasNewTemplates]);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (groupIndexRef.current < TOTAL_GROUPS) {
      loadTemplates();
    }
  }, []);

  // ── Infinite-scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    const scrollEl = document.querySelector(".layout-scroll-container");
    if (!scrollEl) return;

    const handleScroll = () => {
      if (groupIndexRef.current >= TOTAL_GROUPS || loadingRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop <= clientHeight + 200) loadTemplates();
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [loadTemplates]);

  // ── Touch pull-to-refresh ──────────────────────────────────────────────────
  useEffect(() => {
    const scrollEl = document.querySelector(".layout-scroll-container");
    if (!scrollEl) return;

    const onTouchStart = (e) => {
      if (refreshingRef.current) return;
      touchStartY.current      = e.touches[0].clientY;
      touchStartScroll.current = scrollEl.scrollTop;
      isPulling.current        = false;
    };

    const onTouchMove = (e) => {
      if (refreshingRef.current) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (touchStartScroll.current <= 0 && dy > 0) {
        isPulling.current = true;
        const pulled = Math.min(dy * 0.5, PTR_MAX);
        setPullY(pulled);
        if (dy > 8) e.preventDefault();
      } else {
        if (isPulling.current) { isPulling.current = false; setPullY(0); }
      }
    };

    const onTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (pullY >= PTR_THRESHOLD * 0.5) {
        doRefresh();
      } else {
        setPullY(0);
      }
    };

    scrollEl.addEventListener("touchstart", onTouchStart, { passive: true });
    scrollEl.addEventListener("touchmove",  onTouchMove,  { passive: false });
    scrollEl.addEventListener("touchend",   onTouchEnd,   { passive: true });

    return () => {
      scrollEl.removeEventListener("touchstart", onTouchStart);
      scrollEl.removeEventListener("touchmove",  onTouchMove);
      scrollEl.removeEventListener("touchend",   onTouchEnd);
    };
  }, [doRefresh, pullY]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full gap-3 relative">
      <PullIndicator pullY={pullY} refreshing={refreshing} />

      {showBanner && (
        <NewTemplatesBanner onDismiss={handleDismissBanner} />
      )}

      <Carosel />
      <Festival />
      <ListOfGenaraltemp templates={templates} loading={loading || refreshing} />
    </div>
  );
}

export default Homepage;
