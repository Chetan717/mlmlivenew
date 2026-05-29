import { db } from "@firebase-config";
import { collection, query, where, getDocs, orderBy, limit, startAfter } from "firebase/firestore";

export const Alltemplateservice = async (Selected_type, lastDoc = null, pageSize = 12) => {
  try {
    let q = query(
      collection(db, "mlmtemplate"),
      where("SelectType", "==", `${Selected_type}`),
      where("Active", "==", true),
      where("Launched", "==", true),
      orderBy("serial"),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(
        collection(db, "mlmtemplate"),
        where("SelectType", "==", `${Selected_type}`),
        where("Active", "==", true),
        where("Launched", "==", true),
        orderBy("serial"),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }

    const snapshot = await getDocs(q);

    const templates = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        image: data.Showcase_url || "",
        company: data.Company,
        Subtype : data.Subtype,
        type: data.SelectType,
        ShowCaseForm: data?.ShowCaseForm,
        serial: data?.serial,
      };
    });

    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === pageSize;

    return { templates, lastDoc: newLastDoc, hasMore };
  } catch (error) {
    console.error("Template fetch error:", error);
    return { templates: [], lastDoc: null, hasMore: false };
  }
};