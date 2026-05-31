import Carosel from "./Component/Carosel";
import Festival from "./Component/Festival";
import ListOfGenaraltemp from "./Component/ListOfGenaraltemp";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { fetchGeneralTemplates } from "./Component/Services/GeneralTemplateService";
import { useNavigate } from "react-router";

const TOTAL_GROUPS = 4;



function Homepage() {
  const [templates, setTemplates] = useState([]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // ✅ Read directly from localStorage on first render — no child dependency
 

  const loadingRef = useRef(false);
  const groupIndexRef = useRef(0);
  const navigate = useNavigate();

  // ✅ Keep ref in sync so scroll handler / callbacks always see latest value
 

  const loadTemplates = useCallback(async () => {
    if (loadingRef.current || groupIndexRef.current >= TOTAL_GROUPS) return;

    loadingRef.current = true;
    setLoading(true);

    // ✅ Always uses latest companyName via ref — safe inside stale closures
    const data = await fetchGeneralTemplates(
      groupIndexRef.current,
     
    );

    setTemplates((prev) => {
      const existingTypes = new Set(prev.map((g) => g.type));
      return [...prev, ...data.filter((g) => !existingTypes.has(g.type))];
    });

    groupIndexRef.current += 1;
    setGroupIndex(groupIndexRef.current);

    loadingRef.current = false;
    setLoading(false);
  }, []); // no deps needed — uses refs internally

  useEffect(() => {
    loadTemplates();
  }, []);

  // ✅ Attach scroll listener to the Layout's scroll container
  useEffect(() => {
    const scrollEl = document.querySelector(".layout-scroll-container");
    if (!scrollEl) return;

    const handleScroll = () => {
      if (groupIndexRef.current >= TOTAL_GROUPS || loadingRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop <= clientHeight + 200) {
        loadTemplates();
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [loadTemplates]);

  return (
    <div className="flex flex-col w-full gap-3">
      <Carosel />
      <Festival />
      <ListOfGenaraltemp
        templates={templates}
        loading={loading}
      />
    </div>
  );
}

export default Homepage;