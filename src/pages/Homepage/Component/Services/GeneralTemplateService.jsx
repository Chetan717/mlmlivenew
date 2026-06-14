import { db } from "@firebase-config";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";

const TYPE_GROUPS = [
  [
    "Motivational",
    "Rank_Promotion",
    "Bonanza",
    "Welcome_Closing",
    "Good_Morning",
    "Sport",
    "Daily_Life",
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

// Module-level memory cache — survives component unmount/remount within a session
const _cache = new Map();

// sessionStorage TTL key prefix
const SS_KEY_PREFIX = "gts_v1_";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function getTemplateCache() {
  return _cache;
}

export function clearTemplateCache() {
  _cache.clear();
  // Also clear sessionStorage entries
  try {
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith(SS_KEY_PREFIX)) sessionStorage.removeItem(k);
    });
  } catch {}
}

const normalizeDoc = (doc) => ({
  id: doc.id,
  image: doc.data().Showcase_url,
  type: doc.data().SelectType,
  Subtype: doc.data().Subtype,
  ShowCaseForm: doc.data().ShowCaseForm,
  serial: doc.data().serial,
});

function readSessionCache(key) {
  try {
    const raw = sessionStorage.getItem(SS_KEY_PREFIX + key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(SS_KEY_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeSessionCache(key, data) {
  try {
    sessionStorage.setItem(
      SS_KEY_PREFIX + key,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {}
}

// Max templates to fetch per type on the home page (keeps initial load lean)
const HOME_LIMIT = 10;

export const fetchGeneralTemplates = async (groupIndex, company) => {
  const cacheKey = `${groupIndex}__${company || ""}`;

  // 1. Memory cache (fastest — zero async)
  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey);
  }

  // 2. sessionStorage TTL cache (survives context resets, avoids re-read on re-mount)
  const ssHit = readSessionCache(cacheKey);
  if (ssHit) {
    _cache.set(cacheKey, ssHit);
    return ssHit;
  }

  // 3. Fetch from Firestore
  try {
    const selectedTypes = TYPE_GROUPS[groupIndex];
    if (!selectedTypes) return [];

    // Fetch all types in parallel
    const results = await Promise.all(
      selectedTypes.map(async (type) => {
        const generalQuery = query(
          collection(db, "mlmtemplate"),
          where("MainType", "==", "General"),
          where("SelectType", "==", type),
          where("Active", "==", true),
          where("Launched", "==", true),
          orderBy("serial"),
          limit(HOME_LIMIT),
        );

        const [generalSnapshot, mlmSnapshot] = await Promise.all([
          getDocs(generalQuery),
          company
            ? getDocs(
                query(
                  collection(db, "mlmtemplate"),
                  where("MainType", "==", "MLM"),
                  where("Company", "==", company),
                  where("SelectType", "==", type),
                  where("Active", "==", true),
                  where("Launched", "==", true),
                  orderBy("serial"),
                  limit(HOME_LIMIT),
                ),
              )
            : Promise.resolve({ docs: [] }),
        ]);

        const generalTemplates = generalSnapshot.docs.map(normalizeDoc);
        const mlmTemplates = mlmSnapshot.docs.map(normalizeDoc);

        return { type, templates: [...mlmTemplates, ...generalTemplates] };
      }),
    );

    _cache.set(cacheKey, results);
    writeSessionCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error("General fetch error:", error);
    return [];
  }
};
