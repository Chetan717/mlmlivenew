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
