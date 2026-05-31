import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGeneralData } from "../../../Context/GeneralContext";
import { useNavigate } from "react-router";
import { ArrowUpRight, Sparkles } from "@gravity-ui/icons";
import { clearTemplateCache, preloadImage } from "./templateCacheUtils";

// ── Module-level set: tracks images loaded at least once this session ────────
// Survives component unmount/remount so returning to home never re-shows skeleton
const _seenImages = new Set();

// ── Image with skeleton placeholder ──────────────────────────────────────────
const ImageWithSkeleton = React.memo(({ src, alt, className, style }) => {
  const [loaded, setLoaded] = useState(() => _seenImages.has(src));
  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 bg-muted/50 animate-pulse rounded-xl overflow-hidden">
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)" }}
          />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={style}
        onLoad={() => { _seenImages.add(src); setLoaded(true); }}
        
      />
    </div>
  );
});

// ── Professional "Create Profile" modal ──────────────────────────────────────
function CreateProfileModal({ onConfirm, onDismiss }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="bg-background w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl p-6 pb-10 sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <circle cx="12" cy="8" r="4"/>
              <path d="M6 20v-2a6 6 0 0112 0v2"/>
            </svg>
          </div>
        </div>
        <h2 className="text-[17px] font-bold text-foreground text-center mb-2">
          Create Your Profile First
        </h2>
        <p className="text-[13px] text-muted-foreground text-center mb-6 leading-relaxed">
          To personalise your designs with your name, photo and details, please set up your MLM profile.
        </p>
        <button
          onClick={onConfirm}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-[14px] transition-all active:scale-[0.98] shadow-lg shadow-accent/20 mb-2"
          style={{ background: "linear-gradient(135deg, #0e245c 0%, #1a3a8a 100%)" }}
        >
          Create Profile →
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

const GENERAL_SELECT_TYPES = new Set([
  "Trending",
  "Festival",
  "Motivational",
  "Good_Morning",
  "Devotional_Spiritual",
  "Leader_Quotes",
  "Health_Tips",
  "Greeting_Wishes",
  "ThankYou_Birthday_Anniversary",
]);

const GRID_TYPES = new Set([
  "Welcome_Closing",
  "Anniversary_Birthday",
  "ThankYou_Birthday_Anniversary",
]);
const FULL_TYPES = new Set(["Capping"]);

const SkeletonCard = React.memo(() => (
  <div className="rounded-2xl overflow-hidden animate-pulse bg-muted aspect-square w-full relative border border-border">
    <div
      className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
      style={{
        background:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
      }}
    />
  </div>
));

const TemplateCard = React.memo(({ card, isSelected, onSelect }) => (
  <div
    onClick={() => onSelect(card)}
    className={`relative rounded-2xl overflow-hidden cursor-pointer aspect-square
      transition-all duration-300 active:scale-95 group border bg-white dark:bg-black/20
      ${
        isSelected
          ? "border-accent ring-2 ring-accent ring-offset-1 dark:ring-offset-[#0b0f19] shadow-md scale-95"
          : "border-border shadow-sm hover:shadow-md hover:border-accent/50"
      }`}
  >
    <img
      src={card.image}
      alt="template"
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      
    />
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />
    {isSelected && (
      <div className="absolute inset-0 border-4 border-accent rounded-2xl pointer-events-none" />
    )}
    {isSelected && (
      <div className="absolute top-2 right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-200">
        <svg
          className="w-3.5 h-3.5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    )}
  </div>
));

const CheckIcon = ({ size = "sm" }) => {
  const dim = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const icon = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <div
      className={`absolute top-2 right-2 ${dim} bg-accent rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-200`}
    >
      <svg
        className={`${icon} text-white`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
};

function ListOfGenaraltemp({ templates, loading }) {
  const [selectedTemp, setSelectedTemp] = useState(null);
  const [profileModalPending, setProfileModalPending] = useState(null);
  const navigate = useNavigate();
  const { selType: contextSelType, setSelType } = useGeneralData();

  const selType = useMemo(() => {
    if (contextSelType?.type) {
      localStorage.setItem("selType", JSON.stringify(contextSelType));
      return contextSelType;
    }
    try {
      const stored = localStorage.getItem("selType");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [contextSelType]);

  useEffect(() => {
    if (!templates) return;
    templates.forEach((group) => {
      group.templates?.forEach((item) => preloadImage(item.image));
    });
  }, [templates]);

  useEffect(() => {
    return () => {
      clearTemplateCache();
    };
  }, []);

  const handleViewAll = useCallback(
    (group) => {
      const selttype = {
        type: group.type,
        id: group.templates?.[0]?.id,
        serial: group.templates?.[0]?.serial,
        ShowCaseForm: group.templates?.[0]?.ShowCaseForm,
        Subtype: group.templates?.[0]?.Subtype,
      };
      setSelType(selttype);
      navigate("/alltemp");
    },
    [navigate, setSelType],
  );
  const handleReset = () => {
    localStorage.removeItem("mlmform");
    const mlmProfile = JSON.parse(localStorage.getItem("mlmProfile"));
    const formDAta = {
      tab: "team",
      achiever: {
        title: ".",
        name: "",
        achieverName: "",
        city: "",
        amount: "",
        image: "",
      },
      promoter: null,
      selectedLinks: mlmProfile?.topuplineURLs || [],
    };
    localStorage.setItem("mlmform", JSON.stringify(formDAta));
  };

  const handleImagePress = useCallback(
    (item) => {
      setSelectedTemp(item);
      handleReset();
      const selttype = {
        id: item.id,
        type: item.type,
        serial: item.serial,
        ShowCaseForm: item.ShowCaseForm,
        Subtype: item.Subtype,
      };

      setSelType(selttype);
      localStorage.setItem("selType", JSON.stringify(selttype));

      const Profile = JSON.parse(localStorage.getItem("mlmProfile") || "{}");
      if (Profile?.companyId) {
        navigate(
          GENERAL_SELECT_TYPES.has(selttype.type) ? "/editor" : "/mlmform",
        );
      } else {
        setProfileModalPending(selttype);
      }
    },
    [navigate, setSelType],
  );

  if (loading && (!templates || templates.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-muted border-t-accent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium tracking-wide animate-pulse">
          Loading beautiful templates...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-8">
      {templates?.map((group) => {
        const isGrid = GRID_TYPES.has(group.type);
        const isFull = FULL_TYPES.has(group.type);

        if (!group?.templates || group.templates.length === 0) return null;

        const displayName = group.type.replaceAll("_", " ");

        return (
          <div key={group.type} className="w-full mb-5">
            {!isGrid && (
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full bg-accent" />
                  <h2 className="text-lg font-display font-bold text-foreground">
                    {displayName}
                  </h2>
                </div>
                <button
                  onClick={() => handleViewAll(group)}
                  className="flex items-center gap-1 text-xs font-bold text-accent dark:text-white bg-accent/10 dark:bg-white/10 px-3 py-1.5 rounded-full hover:bg-accent/20 dark:hover:bg-white/20 transition-colors"
                >
                  View All
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {isFull ? (
              <div className="grid grid-cols-1 gap-4">
                {group?.templates?.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleImagePress(item)}
                    className={`relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 active:scale-[0.98] border bg-white dark:bg-black/20 ${
                      selectedTemp?.id === item?.id
                        ? "border-accent ring-2 ring-accent ring-offset-1 dark:ring-offset-[#0b0f19] shadow-md"
                        : "border-border shadow-sm hover:shadow-md hover:border-accent/50"
                    }`}
                  >
                    <div className="w-full aspect-[2/1] overflow-hidden">
                      <ImageWithSkeleton
                        src={item.image}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        alt={item.Subtype || displayName}
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />
                    {selectedTemp?.id === item?.id && <CheckIcon />}
                  </div>
                ))}
              </div>
            ) : null}

            {isGrid ? (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4 px-1">
                  <div className="w-1.5 h-6 rounded-full bg-accent" />
                  <h2 className="text-lg font-display font-bold text-foreground">
                    {displayName}
                  </h2>
                </div>
                {/* These groups carry only 2 templates — show them as 2 wide
                    rectangle cards side-by-side (2 columns), not stacked. */}
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {group?.templates?.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleImagePress(item)}
                      className={`relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 active:scale-[0.98] border bg-white dark:bg-black/20 ${
                        selectedTemp?.id === item?.id
                          ? "border-accent ring-2 ring-accent ring-offset-1 dark:ring-offset-[#0b0f19] shadow-md"
                          : "border-border shadow-sm hover:shadow-md hover:border-accent/50"
                      }`}
                    >
                      <div className="w-full aspect-[3/2] overflow-hidden">
                        <ImageWithSkeleton
                          src={item.image}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          alt={item.Subtype || displayName}
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />
                      {selectedTemp?.id === item?.id && <CheckIcon />}
                    </div>
                  ))}
                </div>
              </div>
            ) : !isFull ? (
              <div className="flex gap-4 overflow-x-auto pb-1 pt-1 px-1 hide-scrollbar snap-x">
                {group?.templates?.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleImagePress(item)}
                    className="flex-col items-center gap-2 cursor-pointer group transition-all duration-300 active:scale-95 shrink-0 snap-start w-[85px] md:w-[140px]"
                  >
                    <div
                      className={`relative rounded-2xl overflow-hidden aspect-square border transition-all duration-300 bg-white dark:bg-black/20 ${
                        selectedTemp?.id === item?.id
                          ? "border-accent ring-2 ring-accent ring-offset-1 dark:ring-offset-[#0b0f19] shadow-md scale-95"
                          : "border-border shadow-sm group-hover:shadow-md group-hover:border-accent/50"
                      }`}
                    >
                      <ImageWithSkeleton
                        src={item.image}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        alt={item.Subtype || displayName}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />
                      {selectedTemp?.id === item?.id && <CheckIcon />}
                    </div>
                    {item.Subtype && (
                      <p className="text-xs font-medium text-foreground/80 text-center truncate px-1 mt-2">
                        {item.Subtype}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      {/* ── Create Profile modal ── */}
      {profileModalPending && (
        <CreateProfileModal
          onConfirm={() => {
            setProfileModalPending(null);
            navigate("/mlmprofile");
          }}
          onDismiss={() => setProfileModalPending(null)}
        />
      )}

      <div className="mt-8 w-full bg-gradient-to-br from-accent/5 to-indigo-500/5 dark:from-accent/10 dark:to-indigo-500/10 border border-accent/10 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-accent/10">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <h3 className="font-display font-bold text-foreground mb-1">
          More templates coming soon
        </h3>
        <p className="text-sm text-muted-foreground">
          We're constantly adding new designs to help your business grow.
        </p>
      </div>

      {loading && templates?.length > 0 && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-muted border-t-accent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export default ListOfGenaraltemp;
