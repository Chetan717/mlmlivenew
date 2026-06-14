import { db } from "@firebase-config";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

const SS_KEY = "trend_v1_";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const _mem = new Map();

function readCache(date) {
  if (_mem.has(date)) return _mem.get(date);
  try {
    const raw = sessionStorage.getItem(SS_KEY + date);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) { sessionStorage.removeItem(SS_KEY + date); return null; }
    _mem.set(date, data);
    return data;
  } catch { return null; }
}

function writeCache(date, data) {
  _mem.set(date, data);
  try {
    sessionStorage.setItem(SS_KEY + date, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

export const TTrend_templateService = async () => {
  const today = new Date().toISOString().split("T")[0];

  const hit = readCache(today);
  if (hit) return hit;

  try {
    const q = query(
      collection(db, "mlmtemplate"),
      where("SelectType", "==", "Trending"),
      where("Active", "==", true),
      where("Launched", "==", true),
      where("Date", "==", today),
      limit(20),
    );

    const snapshot = await getDocs(q);

    const templates = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        image: data?.Showcase_url || "",
        company: data?.Company,
        type: data?.SelectType,
        ShowCaseForm: data?.ShowCaseForm,
        serial: data?.serial,
      };
    });

    writeCache(today, templates);
    return templates;
  } catch (error) {
    console.error("Trending fetch error:", error);
    return [];
  }
};
