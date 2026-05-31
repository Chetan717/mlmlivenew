import Carosel from "./Component/Carosel";
import Festival from "./Component/Festival";
import ListOfGenaraltemp from "./Component/ListOfGenaraltemp";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  fetchGeneralTemplates,
  getTemplateCache,
} from "./Component/Services/GeneralTemplateService";
import { useNavigate } from "react-router";

const TOTAL_GROUPS = 4;

// Build initial state from whatever the cache already holds
function getInitialState() {
  const cache = getTemplateCache();
  if (cache.size === 0) return { templates: [], groupIndex: 0 };

  // Merge all cached groups in order
  const merged = [];
  const seen = new Set();
  for (let i = 0; i < TOTAL_GROUPS; i++) {
    const key = `${i}__`;          // company is "" on first render
    const alt = `${i}__undefined`; // guard for any old keys
    const data = cache.get(key) || cache.get(alt) || [];
    data.forEach((g) => {
      if (!seen.has(g.type)) { seen.add(g.type); merged.push(g); }
    });
  }
  // How many groups are already cached?
  let loaded = 0;
  for (let i = 0; i < TOTAL_GROUPS; i++) {
    if (cache.has(`${i}__`)) loaded = i + 1;
    else break;
  }
  return { templates: merged, groupIndex: loaded };
}

function Homepage() {
  const initial = getInitialState();
  const [templates, setTemplates] = useState(initial.templates);
  const [loading, setLoading]     = useState(false);

  const loadingRef      = useRef(false);
  const groupIndexRef   = useRef(initial.groupIndex);

  const loadTemplates = useCallback(async () => {
    if (loadingRef.current || groupIndexRef.current >= TOTAL_GROUPS) return;

    loadingRef.current = true;
    setLoading(true);

    const data = await fetchGeneralTemplates(groupIndexRef.current);

    setTemplates((prev) => {
      const existingTypes = new Set(prev.map((g) => g.type));
      return [...prev, ...data.filter((g) => !existingTypes.has(g.type))];
    });

    groupIndexRef.current += 1;
    loadingRef.current = false;
    setLoading(false);
  }, []);

  // Only fetch on mount if there's data still to load
  useEffect(() => {
    if (groupIndexRef.current < TOTAL_GROUPS) {
      loadTemplates();
    }
  }, []);

  // Infinite-scroll: load next batch when near bottom
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
      <ListOfGenaraltemp templates={templates} loading={loading} />
    </div>
  );
}

export default Homepage;
