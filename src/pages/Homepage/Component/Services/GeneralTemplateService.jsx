import { db } from "@firebase-config";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

const TYPE_GROUPS = [
  [
    "Motivational",
    "Rank_Promotion",
    "Bonanza",
    "Welcome_Closing",
    "Good_Morning",
    "Greeting_Wishes",
    "Health_Tips",
    "Achievements",
    "Anniversary_Birthday",
    "Devotional_Spiritual",
    "Leader_Quotes",
    "Income",
    "Meeting",
    "ThankYou_Birthday_Anniversary",
    "Capping",
  ],
];

// ── Module-level cache — survives component unmount/remount ──────────────────
// Key: groupIndex (number), Value: array of group objects
const _cache = new Map();

export function getTemplateCache() {
  return _cache;
}

export function clearTemplateCache() {
  _cache.clear();
}

const normalizeDoc = (doc) => ({
  id: doc.id,
  image: doc.data().Showcase_url,
  type: doc.data().SelectType,
  Subtype: doc.data().Subtype,
  ShowCaseForm: doc.data().ShowCaseForm,
  serial: doc.data().serial,
});

export const fetchGeneralTemplates = async (groupIndex, company) => {
  // Return from cache if already fetched
  const cacheKey = `${groupIndex}__${company || ""}`;
  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey);
  }

  try {
    const selectedTypes = TYPE_GROUPS[groupIndex];
    if (!selectedTypes) return [];

    const result = [];

    for (const type of selectedTypes) {
      const generalQuery = query(
        collection(db, "mlmtemplate"),
        where("MainType", "==", "General"),
        where("SelectType", "==", type),
        where("Active", "==", true),
        where("Launched", "==", true),
        orderBy("serial"),
      );

      const generalSnapshot = await getDocs(generalQuery);
      const generalTemplates = generalSnapshot.docs.map(normalizeDoc);

      let mlmTemplates = [];
      if (company) {
        const mlmQuery = query(
          collection(db, "mlmtemplate"),
          where("MainType", "==", "MLM"),
          where("Company", "==", company),
          where("SelectType", "==", type),
          where("Active", "==", true),
          where("Launched", "==", true),
          orderBy("serial"),
        );
        const mlmSnapshot = await getDocs(mlmQuery);
        mlmTemplates = mlmSnapshot.docs.map(normalizeDoc);
      }

      result.push({ type, templates: [...mlmTemplates, ...generalTemplates] });
    }

    _cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("General fetch error:", error);
    return [];
  }
};
