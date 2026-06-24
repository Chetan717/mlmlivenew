import { db } from "@firebase-config";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { COLLECTIONS } from "../../../../collections";

function mapDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    image: data?.Showcase_url || "",
    company: data?.Company || "",
    type: data?.SelectType,
    ShowCaseForm: data?.ShowCaseForm,
    serial: data?.serial,
    Subtype: data?.Subtype || "",
  };
}

export const TTrend_templateService = async (companyName) => {
  const today = new Date().toISOString().split("T")[0];

  try {
    // ── Query 1: General trending — shown to ALL users ──
    const q1 = query(
      collection(db, COLLECTIONS.MLMTEMPLATE),
      where("MainType", "==", "General"),
      where("SelectType", "==", "Trending"),
      where("Active", "==", true),
      where("Launched", "==", true),
      where("Date", "==", today),
      limit(10),
    );

    const fetchList = [getDocs(q1)];

    // ── Query 2: MLM trending — only for user's company ──
    if (companyName) {
      const q2 = query(
        collection(db, COLLECTIONS.MLMTEMPLATE),
        where("MainType", "==", "MLM"),
        where("SelectType", "==", "Today_Trending"),
        where("Active", "==", true),
        where("Launched", "==", true),
        where("Date", "==", today),
        where("Company", "==", companyName),
        limit(10),
      );
      fetchList.push(getDocs(q2));
    }

    const results = await Promise.all(fetchList);

    const seen = new Set();
    const templates = results
      .flatMap((snapshot) => snapshot.docs.map(mapDoc))
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

    // console.log(
    //   `[Carousel] Fetched ${templates.length} templates (date: ${today}, company: "${companyName}")`
    // );

    return templates;
  } catch (error) {
    console.error("Trending fetch error:", error);
    return [];
  }
};