import { db } from "@firebase-config";
import { collection, query, where, getDocs } from "firebase/firestore";
export const Festival_template = async (Selected_date) => {
  const today = new Date().toISOString().split("T")[0];

  try {
    const q = query(
      collection(db, "mlmtemplate"),
      where("SelectType", "==", "Festival"),
      where("Active", "==", true),
      where("Launched", "==", true),
      where("Date", "==", Selected_date),
    );

    const snapshot = await getDocs(q);

    const templates = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        image: data.Showcase_url || "",
        company: data.Company,
        type: data.SelectType,
        ShowCaseForm: data?.ShowCaseForm,
        serial: data?.serial,
      };
    });

    return templates;
  } catch (error) {
    console.error("Today trending fetch error:", error);
    return [];
  }
};
