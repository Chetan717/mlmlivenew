import Carosel from "../Pages/Homepage/Component/Carosel";
import Festival from "../Pages/Homepage/Component/Festival";
import ListOfGenaraltemp from "../Pages/Homepage/Component/ListOfGenaraltemp";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { fetchGeneralTemplates } from "../Pages/Homepage/Component/Services/GeneralTemplateService";
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function GreetingBanner() {
  const userData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("usermlm") || "{}");
    } catch { return {}; }
  }, []);

  const companyData = useMemo(() => {
    try {
      const sc = JSON.parse(localStorage.getItem("selectedCompany") || "{}");
      const mlm = JSON.parse(localStorage.getItem("mlmProfile") || "{}");
      return { name: sc?.name || mlm?.companyName || "", logo: sc?.logos?.[0]?.link || mlm?.logoURLs?.[0] || "" };
    } catch { return { name: "", logo: "" }; }
  }, []);

  const firstName = userData?.name?.split(" ")[0] || "";

  return (
    <div className="relative rounded-2xl overflow-hidden bg-accent p-5 shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none" />
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">
            {getGreeting()}
          </p>
          <h2 className="text-white font-display font-bold text-xl leading-tight truncate">
            {firstName ? `${firstName}` : "Welcome back"}
          </h2>
          <p className="text-white/60 text-xs mt-1.5 font-medium leading-relaxed">
            Create stunning marketing images for your business today
          </p>
        </div>

        {companyData.logo ? (
          <div className="w-14 h-14 rounded-2xl bg-white shadow-lg overflow-hidden shrink-0 border-2 border-white/30">
            <img src={companyData.logo} alt="Company" className="w-full h-full object-contain p-1" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm shrink-0 flex items-center justify-center border border-white/20">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
      </div>

      {companyData.name && (
        <div className="relative z-10 mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
          <p className="text-white/60 text-xs font-medium truncate">{companyData.name}</p>
        </div>
      )}
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

        {/* Greeting Banner */}
        <section className="w-full">
          <GreetingBanner />
        </section>

        {/* Carousel Section */}
        <section className="w-full">
          <Carosel />
        </section>

        {/* Festival Section */}
        <section className="w-full">
          <Festival />
        </section>

        {/* General Templates Section */}
        <section className="w-full">
          <ListOfGenaraltemp templates={cachedTemplates} loading={loading} />
        </section>

      </div>
    </div>
  );
}

export default Home;
