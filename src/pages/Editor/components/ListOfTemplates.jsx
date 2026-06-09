import { useState, useEffect, useRef, useCallback } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@firebase-config";

const BATCH_SIZE = 20;

const PRESET_VIDEO_ITEMS = [];

// Module-level cache — survives editor unmount/remount within the session
// Key: `${filterType}__${filterSubType}`, Value: filtered items array
const _editorTemplateCache = new Map();

function getSelType() {
  try { return JSON.parse(localStorage.getItem("selType")) || {}; }
  catch { return {}; }
}

function cleanItem(item) {
  if (!item) return null;
  const { _template, ...clean } = item;
  return clean;
}

/* ── LazyImage — IntersectionObserver + CSS shimmer skeleton ────────────── */
function LazyImage({ src, alt }) {
  const wrapperRef = useRef(null);
  const [realSrc, setRealSrc] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRealSrc(src);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div ref={wrapperRef} className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Shimmer skeleton shown until the real image loads */}
      {!loaded && (
        <div
          className="absolute inset-0 bg-muted/40"
          style={{
            background: "linear-gradient(90deg,#e8e8e8 25%,#f5f5f5 37%,#e8e8e8 63%)",
            backgroundSize: "400% 100%",
            animation: "shimmerSlide 1.2s ease infinite",
          }}
        />
      )}
      {realSrc && (
        <img
          src={realSrc}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      <style>{`
        @keyframes shimmerSlide {
          0%   { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}

function LazyVideo({ src }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !src) return;
    ref.current.src = src;
  }, [src]);
  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="3" y="3" width="30" height="30" rx="7" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 3"/>
        <path d="M12 18h12M18 12v12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-xl overflow-hidden"
          style={{
            background: "linear-gradient(90deg,#e8e8e8 25%,#f5f5f5 37%,#e8e8e8 63%)",
            backgroundSize: "400% 100%",
            animation: `shimmerSlide 1.2s ease infinite`,
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes shimmerSlide {
          0%   { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}

function Tile({ item, isSelected, onSelect, isVideo }) {
  return (
    <button
      onClick={() => onSelect(item)}
      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-150 focus:outline-none ${
        isSelected
          ? "border-accent scale-95 shadow-md shadow-accent/20"
          : "border-border hover:border-accent/50 hover:scale-95"
      }`}
    >
      {isVideo && (item.videoUrl || item.VideoUrl) ? (
        <LazyVideo src={item.videoUrl || item.VideoUrl} />
      ) : item.suggestionImage ? (
        <LazyImage src={item.suggestionImage} alt="template" />
      ) : (
        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-muted-foreground">
            <rect x="2" y="2" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M2 13l4-4 3 3 3-4 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Video badge */}
      {isVideo && (
        <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm rounded px-1 py-0.5">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M5 3l14 9-14 9V3z"/></svg>
        </div>
      )}

      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      {item.pass && item.pass !== "" && (
        <div className="absolute top-1.5 left-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1.5" y="5" width="9" height="6.5" rx="1.5" fill="white" fillOpacity="0.85"/>
            <path d="M3.5 5V3.5a2.5 2.5 0 015 0V5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </button>
  );
}

/* ── Tab button ─────────────────────────────────────────────────────────── */
function TabBtn({ active, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[12px] font-bold transition-all duration-200 ${
        active
          ? "bg-accent text-white shadow-md shadow-accent/25"
          : "text-muted-foreground hover:text-foreground hover:bg-foreground/6"
      }`}
    >
      {icon}
      {label}
      {count != null && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-white/25 text-white" : "bg-muted/40 text-muted-foreground"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function ListOfTemplates({ selected, setSelected }) {
  const selType       = getSelType();
  const filterType    = selType?.type || "";
  const filterSubType = selType?.Subtype || "";

  const [allItems, setAllItems]         = useState([]);
  const [visibleItems, setVisibleItems] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [error, setError]               = useState(null);
  const [activeTab, setActiveTab]       = useState("image");

  const sentinelRef   = useRef(null);
  const renderedCount = useRef(0);

  /* ── Fetch ── */
  useEffect(() => {
    if (!filterType) { setLoading(false); return; }

    async function fetchTemplates() {
      const cacheKey = `${filterType}__${filterSubType}`;

      // Return immediately from cache — no spinner, no network round-trip
      if (_editorTemplateCache.has(cacheKey)) {
        const filteredItems = _editorTemplateCache.get(cacheKey);
        setAllItems(filteredItems);
        renderedCount.current = 0;
        setSelected((prev) => {
          if (prev) return prev;
          const imgs = filteredItems.filter((i) => !i.videoUrl && !i.VideoUrl);
          const vids = filteredItems.filter((i) => !!(i.videoUrl || i.VideoUrl));
          const pool = activeTab === "video" ? (vids.length > 0 ? vids : PRESET_VIDEO_ITEMS) : imgs;
          return pool.length > 0 ? cleanItem(pool[0]) : null;
        });
        const firstBatch = filteredItems.slice(0, BATCH_SIZE);
        setVisibleItems(firstBatch);
        renderedCount.current = firstBatch.length;
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, "mlmtemplate"),
          where("SelectType", "==", filterType),
          where("Subtype", "==", filterSubType),
          where("Active", "==", true),
          orderBy("serial"),
        );
        const snap = await getDocs(q);

        const items = [];
        snap.forEach((docSnap) => {
          const t = { id: docSnap.id, ...docSnap.data() };
          (t.GraphicsLink || []).forEach((g) => {
            items.push({ ...g, _template: t });
          });
        });

        let filteredItems = items;
        try {
          if (filterSubType === "CLOSING") {
            const cf = localStorage.getItem("close_filter") || "SP";
            filteredItems = items.filter((g) => String(g.Filter) === String(cf));
          }
          if (filterType === "Meeting") {
            const savedMeeting = localStorage.getItem("Meeting");
            const meetingData  = savedMeeting ? JSON.parse(savedMeeting) : null;
            if (meetingData?.hostMode === "add") {
              filteredItems = items.filter((g) => String(g.Filter) === "true");
            } else if (meetingData?.hostMode === "none") {
              filteredItems = items.filter((g) => String(g.Filter) === "false");
            } else {
              filteredItems = items;
            }
          }
        } catch { filteredItems = items; }

        // Store in module-level cache for instant reuse
        _editorTemplateCache.set(cacheKey, filteredItems);

        setAllItems(filteredItems);
        renderedCount.current = 0;

        setSelected((prev) => {
          if (prev) return prev;
          const imgs = filteredItems.filter((i) => !i.videoUrl && !i.VideoUrl);
          const vids = filteredItems.filter((i) => !!(i.videoUrl || i.VideoUrl));
          const pool =
            activeTab === "video"
              ? (vids.length > 0 ? vids : PRESET_VIDEO_ITEMS)
              : imgs;
          return pool.length > 0 ? cleanItem(pool[0]) : null;
        });

        const firstBatch = filteredItems.slice(0, BATCH_SIZE);
        setVisibleItems(firstBatch);
        renderedCount.current = firstBatch.length;
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to load templates");
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, [filterType, filterSubType]);

  /* ── Tab-filtered items ── */
  const imageItems   = allItems.filter((item) => !item.videoUrl && !item.VideoUrl);
  const fbVideoItems = allItems.filter((item) => !!(item.videoUrl || item.VideoUrl));
  const videoItems   = fbVideoItems.length > 0 ? fbVideoItems : PRESET_VIDEO_ITEMS;
  const tabItems     = activeTab === "video" ? videoItems : imageItems;

  /* ── Visible items derived from tabItems ── */
  const [visibleTabItems, setVisibleTabItems] = useState([]);
  const tabRenderedCount = useRef(0);

  useEffect(() => {
    tabRenderedCount.current = 0;
    const firstBatch = tabItems.slice(0, BATCH_SIZE);
    setVisibleTabItems(firstBatch);
    tabRenderedCount.current = firstBatch.length;
  }, [activeTab, allItems]);

  /* ── Infinite scroll ── */
  const loadMore = useCallback(() => {
    if (tabRenderedCount.current >= tabItems.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      const next = tabItems.slice(tabRenderedCount.current, tabRenderedCount.current + BATCH_SIZE);
      setVisibleTabItems((prev) => [...prev, ...next]);
      tabRenderedCount.current += next.length;
      setLoadingMore(false);
    }, 150);
  }, [tabItems]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !loadingMore) loadMore(); },
      { rootMargin: "120px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, loadingMore]);

  const handleTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    const items = tab === "video" ? videoItems : imageItems;
    setSelected(items.length > 0 ? cleanItem(items[0]) : null);
  };

  const handleSelect = (item) => {
    const already = selected?.id === item.id;
    // setSelected(already ? (tabItems.length > 0 ? cleanItem(tabItems[0]) : null) : cleanItem(item));
    setSelected(cleanItem(item));
  };

  const isItemSelected = (item) => selected?.id === item.id;

  return (
    <div className="w-full h-full min-h-0 flex flex-col">
      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1.5 p-2 bg-muted/20 border-t border-border flex-shrink-0">
        <TabBtn
          active={activeTab === "image"}
          onClick={() => handleTab("image")}
          label="Image"
          count={imageItems.length || null}
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
            </svg>
          }
        />
        <TabBtn
          active={activeTab === "video"}
          onClick={() => handleTab("video")}
          label="Video"
          count={videoItems.length || null}
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          }
        />
      </div>

      {/* ── Grid ── */}
      <div className="w-full flex-1 min-h-0 overflow-y-auto p-2 pb-6">
        {error && (
          <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-xs text-danger mb-2">{error}</div>
        )}
        {!filterType && !loading && (
          <div className="rounded-xl bg-warning/10 p-3 text-xs text-warning-foreground">No template type found.</div>
        )}

        {loading && <LoadingGrid />}

        {!loading && !error && filterType && tabItems.length === 0 && (
          <EmptyState label={activeTab === "video" ? "No video templates available" : "No image templates found"} />
        )}

        {!loading && visibleTabItems.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {visibleTabItems.map((item, idx) => (
              <Tile
                key={`${item._template?.serial}-${item.id}-${idx}`}
                item={item}
                isSelected={isItemSelected(item)}
                onSelect={handleSelect}
                isVideo={activeTab === "video"}
              />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-1" />

        {loadingMore && (
          <div className="flex justify-center py-3">
            <div className="flex gap-1">
              {[0,1,2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce" style={{ animationDelay: `${i*100}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
