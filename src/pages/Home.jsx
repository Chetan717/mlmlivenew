import Carosel from "./Homepage/Component/Carosel";
import Festival from "./Homepage/Component/Festival";
import ListOfGenaraltemp from "./Homepage/Component/ListOfGenaraltemp";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { fetchGeneralTemplates } from "./Homepage/Component/Services/GeneralTemplateService";
import { useGeneralData } from "../Context/GeneralContext";
import { db } from "@firebase-config";
import { doc, getDoc } from "firebase/firestore";

const TOTAL_GROUPS = 4;

const getCompanyNameFromStorage = () => {
  try {
    const selectedCompany = JSON.parse(localStorage.getItem("selectedCompany"));
    const selectedProfile = JSON.parse(localStorage.getItem("mlmProfile"));
    return selectedCompany?.id || selectedProfile?.companyId;
  } catch {
    return "";
  }
};

const ensureCompanyInStorage = async () => {
  try {
    if (localStorage.getItem("selectedCompany")) return;
    const datamlm = JSON.parse(localStorage.getItem("mlmProfile") || "{}");
    if (!datamlm.companyId) return;
    const companyRef = doc(db, "mlmcomp", datamlm.companyId);
    const companySnap = await getDoc(companyRef);
    if (companySnap.exists()) {
      localStorage.setItem(
        "selectedCompany",
        JSON.stringify({ id: companySnap.id, ...companySnap.data() }),
      );
    }
  } catch (error) {
    console.error("Failed to fetch company:", error);
  }
};

function WhatsAppBadge() {
  const [visible, setVisible] = useState(true);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
  
    const t = setTimeout(() => setEntered(true), 600);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = (e) => {
    e.stopPropagation();
    setEntered(false);
    setTimeout(() => {
      setVisible(false);
      // sessionStorage.setItem("wa_badge_dismissed", "1");
    }, 350);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed right-4 z-[100] flex flex-col items-end gap-1"
      style={{ bottom: "88px" }}
    >
      <button
        onClick={handleDismiss}
        className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white shadow-md"
        style={{ touchAction: "manipulation", fontSize: 12, lineHeight: 1 }}
        aria-label="Close"
      >
        ✕
      </button>

      <a
        href="https://wa.me/919229885383"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "#25D366",
          padding: "10px 14px",
          touchAction: "manipulation",
          transform: entered ? "translateX(0) scale(1)" : "translateX(100px) scale(0.8)",
          opacity: entered ? 1 : 0,
          transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
          willChange: "transform, opacity",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="26"
          height="26"
          fill="white"
          style={{
            animation: entered ? "waPulse 1.8s ease-in-out infinite" : "none",
          }}
        >
          <path d="M16 0C7.163 0 0 7.163 0 16c0 2.82.733 5.47 2.015 7.775L0 32l8.485-2.222A15.93 15.93 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.26 13.26 0 01-6.736-1.827l-.483-.286-4.996 1.31 1.338-4.87-.314-.498A13.26 13.26 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.273-9.903c-.398-.199-2.357-1.163-2.72-1.295-.365-.133-.63-.199-.895.199-.265.398-1.028 1.295-1.26 1.56-.232.265-.464.299-.862.1-.398-.199-1.68-.619-3.2-1.974-1.183-1.054-1.98-2.355-2.214-2.753-.232-.398-.025-.613.175-.811.18-.178.398-.464.597-.696.199-.232.265-.398.398-.663.133-.265.066-.497-.033-.696-.1-.199-.895-2.158-1.228-2.954-.323-.775-.65-.67-.895-.682l-.763-.013c-.265 0-.696.1-1.061.497-.365.398-1.393 1.362-1.393 3.32 0 1.958 1.426 3.85 1.625 4.115.199.265 2.81 4.29 6.81 6.016.953.41 1.696.656 2.275.84.955.303 1.824.26 2.511.157.766-.114 2.357-.963 2.688-1.893.332-.93.332-1.727.232-1.893-.099-.166-.365-.265-.763-.464z"/>
        </svg>
        <div className="flex flex-col">
          <span className="text-white font-bold text-[11px] leading-tight">WhatsApp</span>
          <span className="text-white/80 text-[9px] leading-tight">Contact Us</span>
        </div>
      </a>

      <style>{`
        @keyframes waPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
      `}</style>
    </div>
  );
}

function Home() {
  const {
    cachedTemplates,
    setCachedTemplates,
    cachedGroupIndex,
    setCachedGroupIndex,
  } = useGeneralData();

  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const groupIndexRef = useRef(cachedGroupIndex);
  const loadTemplatesRef = useRef(null);

  const loadTemplates = useCallback(async () => {
    if (loadingRef.current || groupIndexRef.current >= TOTAL_GROUPS) return;

    loadingRef.current = true;
    setLoading(true);

    const companyName = getCompanyNameFromStorage();
    const data = await fetchGeneralTemplates(
      groupIndexRef.current,
      companyName,
    );

    setCachedTemplates((prev) => {
      const existingTypes = new Set(prev.map((g) => g.type));
      return [...prev, ...data.filter((g) => !existingTypes.has(g.type))];
    });

    groupIndexRef.current += 1;
    setCachedGroupIndex(groupIndexRef.current);

    loadingRef.current = false;
    setLoading(false);
  }, [setCachedTemplates, setCachedGroupIndex]);

  useEffect(() => {
    loadTemplatesRef.current = loadTemplates;
  }, [loadTemplates]);

  useEffect(() => {
    groupIndexRef.current = cachedGroupIndex;

    const init = async () => {
      await ensureCompanyInStorage();
      if (cachedTemplates.length === 0) {
        loadTemplates();
      }
    };

    init();
  }, []);

  useEffect(() => {
    const scrollEl = document.querySelector(".layout-scroll-container");
    if (!scrollEl) return;

    const handleScroll = () => {
      if (groupIndexRef.current >= TOTAL_GROUPS || loadingRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop <= clientHeight + 200) {
        loadTemplatesRef.current();
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-background pt-4 md:pt-6">
      <div className="px-4 md:px-6 w-full max-w-7xl mx-auto space-y-6 md:space-y-8">

        <section className="w-full">
          <Carosel />
        </section>

        <section className="w-full">
          <Festival />
        </section>

        <section className="w-full">
          <ListOfGenaraltemp templates={cachedTemplates} loading={loading} />
        </section>

      </div>

      <WhatsAppBadge />
    </div>
  );
}

export default Home;
