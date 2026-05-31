import { useState, useRef, useEffect, useCallback } from "react";
import { useGeneralData } from "../../.././Context/GeneralContext";
import "./stylec.css";
import { Alltemplateservice } from "./Services/Alltemplateservice";
import { useNavigate } from "react-router";
import { Skeleton } from "@heroui/react";
import { ArrowLeft, Check, Compass, Image as ImageIcon } from "lucide-react";

const SkeletonCard = () => (
  <div className="rounded-[24px] overflow-hidden bg-muted aspect-square w-full relative border border-border">
    <div
      className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
      style={{
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
      }}
    />
  </div>
);

const getSelType = (selType) => {
  if (selType?.type) {
    localStorage.setItem("selType", JSON.stringify(selType));
    return selType;
  }
  try {
    const stored = localStorage.getItem("selType");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export default function AllTemplates() {
  const navigate = useNavigate();
  const { selType: contextSelType, setSelType } = useGeneralData();
  const selType = getSelType(contextSelType);

  const [tempdata, setTempData] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setTempData([]);
    setLastDoc(null);
    setHasMore(true);
    setIsInitialLoading(true);
    loadTemplates(null, true);
  }, [contextSelType]);

  const loadTemplates = async (lastDocRef = null, isInitial = false) => {
    const activeType = getSelType(contextSelType);
    if (!activeType?.type) return;
    const pageSize = isInitial ? 12 : 6;
    try {
      const { templates, lastDoc: newLastDoc, hasMore: more } =
        await Alltemplateservice(activeType.type, lastDocRef, pageSize);
      setTempData((prev) => (isInitial ? templates : [...prev, ...templates]));
      setLastDoc(newLastDoc);
      setHasMore(more);
    } catch (err) {
      console.error(err);
    } finally {
      setIsInitialLoading(false);
      setIsFetchingMore(false);
    }
  };

  const handleObserver = useCallback(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isFetchingMore && !isInitialLoading) {
        setIsFetchingMore(true);
        loadTemplates(lastDoc, false);
      }
    },
    [hasMore, isFetchingMore, isInitialLoading, lastDoc],
  );

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [handleObserver]);

  const onImageSelect = (item) => {
    setSelectedId(item.id);
    const Profile = JSON.parse(localStorage.getItem("mlmProfile") || "{}");
    if (Profile?.companyId) {
      const GENERAL_SELECT_TYPES = [
        { name: "Trending", value: "Trending" },
        { name: "Festival", value: "Festival" },
        { name: "Motivational", value: "Motivational" },
        { name: "Good Morning", value: "Good_Morning" },
        { name: "Devotional / Spiritual", value: "Devotional_Spiritual" },
        { name: "Leader Quotes", value: "Leader_Quotes" },
        { name: "Health Tips", value: "Health_Tips" },
        { name: "Meeting", value: "Meeting" },
        { name: "Greeting & Wishes", value: "Greeting_Wishes" },
        { name: "Thank You (Birthday & Anniversary)", value: "ThankYou_Birthday_Anniversary" },
      ];
      const isGeneralType = GENERAL_SELECT_TYPES.some((t) => t.value === selType?.type);
      const seltype = {
        id: item.id,
        type: item.type,
        serial: item.serial,
        ShowCaseForm: item.ShowCaseForm,
        Subtype: item.Subtype,
      };
      setSelType(seltype);
      localStorage.setItem("selType", JSON.stringify(seltype));
      navigate(isGeneralType ? "/editor" : "/mlmform");
    } else {
      navigate("/mlmprofile");
    }
  };

  const displayName = selType?.type?.replaceAll("_", " ") || "Templates";

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none z-0" />

      {/* ── Header ── */}
      <div className="flex items-center gap-4 px-4 md:px-8 py-4 md:py-6 sticky top-0 bg-background/80 backdrop-blur-xl border-b border-border z-20">
        <button
          onClick={() => window.history.back()}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-black/20 border border-border hover:bg-muted transition-colors shadow-sm shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground leading-tight truncate">
            {displayName}
          </h1>
          {!isInitialLoading && tempdata.length > 0 && (
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              {tempdata.length}+ designs available
            </p>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 z-10 layout-scroll-container">
        {/* Empty state */}
        {!isInitialLoading && tempdata.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 bg-white dark:bg-black/20 rounded-full flex items-center justify-center shadow-sm border border-border mb-4">
              <Compass className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-display font-bold text-foreground mb-2">No templates found</h3>
            <p className="text-muted-foreground">Check back later for new designs in this category.</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {/* Template cards */}
          {tempdata?.map((card) => {
            const isSelected = selectedId === card.id;
            return (
              <div
                key={card.id}
                onClick={() => onImageSelect(card)}
                className={`relative rounded-[24px] overflow-hidden cursor-pointer aspect-square bg-white dark:bg-black/20
                  transition-all duration-300 active:scale-[0.98] group
                  ${isSelected
                    ? "border-accent ring-2 ring-accent ring-offset-2 dark:ring-offset-[#0b0f19] shadow-lg scale-[0.98]"
                    : "border border-border shadow-sm hover:shadow-xl hover:border-accent/50"
                  }`}
              >
                <img
                  src={card.image}
                  alt={card.Subtype || "Template design"}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Details overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                     <ImageIcon className="w-3 h-3 text-white" />
                   </div>
                   <span className="text-white text-xs font-semibold truncate drop-shadow-md">
                     {card.Subtype || "Use Template"}
                   </span>
                </div>

                {/* Selected check */}
                {isSelected && (
                  <div className="absolute inset-0 border-4 border-accent rounded-[24px] pointer-events-none" />
                )}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-8 h-8 bg-accent rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200 border-2 border-white dark:border-[#0b0f19]">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Skeleton — initial load */}
          {isInitialLoading &&
            Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={`init-skel-${i}`} />
            ))}

          {/* Skeleton — load more */}
          {isFetchingMore &&
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={`more-skel-${i}`} />
            ))}
        </div>

        {/* Sentinel */}
        <div ref={sentinelRef} className="h-10 w-full" />

        {!hasMore && !isInitialLoading && tempdata.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="bg-accent/5 dark:bg-accent/10 border border-accent/10 rounded-full px-6 py-2">
               <p className="text-xs font-semibold text-accent/80 uppercase tracking-widest">
                 End of templates
               </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
