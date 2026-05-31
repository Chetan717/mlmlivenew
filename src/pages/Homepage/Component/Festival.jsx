import { useState, useRef, useEffect, useMemo } from "react";
import { Festival_template } from "./Services/Festival_template";
import { useGeneralData } from "../../.././Context/GeneralContext";
import { useNavigate } from "react-router";
import { Skeleton } from "@heroui/react";
import { Calendar } from "@gravity-ui/icons";

export default function Festival() {
  const sliderRef = useRef(null);
  
  // Memoize dates so we don't recreate them every render
  const dates = useMemo(() => generateDates(), []);
  
  const [selectedDate, setSelectedDate] = useState(dates[0].iso);
  const [festivaltempdata, setFestivalTempData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setSelType, cachedFestivalData, setCachedFestivalData } = useGeneralData();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    
    const loadFestival = async (date) => {
      setLoading(true);
      // ✅ Return early if already cached
      if (cachedFestivalData[date]) {
        if (isMounted) {
          setFestivalTempData(cachedFestivalData[date]);
          setLoading(false);
        }
        return;
      }
      
      try {
        const data = await Festival_template(date);
        if (isMounted) {
          setCachedFestivalData((prev) => ({ ...prev, [date]: data }));
          setFestivalTempData(data);
        }
      } catch (error) {
        console.error("Failed to fetch festival templates", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFestival(selectedDate);
    
    return () => {
      isMounted = false;
    };
  }, [selectedDate, cachedFestivalData, setCachedFestivalData]);

  const handleImagePress = (item) => {
    const selttype = {
      id: item.id,
      type: item.type,
      serial: item.serial,
      ShowCaseForm: item.ShowCaseForm,
    };
    setSelType(selttype);
    navigate("/editor");
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* HEADER & DATE SELECTOR */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
          <Calendar className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-display font-bold text-foreground">Festival Calendar</h3>
      </div>
      
      {/* DATE SLIDER */}
      <div className="flex hide-scrollbar gap-3 overflow-x-auto w-full pt-2 pb-2 px-1 snap-x">
        {dates.map((d) => {
          const isSelected = selectedDate === d.iso;
          return (
            <button
              key={d.iso}
              onClick={() => setSelectedDate(d.iso)}
              className={`flex flex-col items-center justify-center min-w-[56px] h-[64px] rounded-2xl transition-all duration-300 snap-center shrink-0 border ${
                isSelected 
                  ? "bg-accent text-white shadow-md border-transparent scale-105" 
                  : "bg-white dark:bg-black/20 text-foreground border-border hover:border-accent/50 hover:bg-accent/5"
              }`}
            >
              <span className={`text-[9px] font-semibold uppercase tracking-wider mb-0.5 ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                {d.monthShort}
              </span>
              <span className={`text-xl font-display font-bold leading-none ${isSelected ? "text-white" : ""}`}>
                {d.day}
              </span>
            </button>
          );
        })}
      </div>

      {/* TEMPLATE SLIDER — only render when loading or templates exist.
          When there are no templates for the selected date, hide the box entirely. */}
      {loading ? (
        <div className="relative w-full">
          <div className="flex gap-4 overflow-x-hidden">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="shrink-0 w-[85px] md:w-[140px] aspect-square rounded-2xl overflow-hidden bg-white dark:bg-black/20 border border-border">
                 <Skeleton className="w-full h-full" />
              </div>
            ))}
          </div>
        </div>
      ) : festivaltempdata?.length > 0 ? (
        <div className="relative w-full">
          <div
            ref={sliderRef}
            className="flex gap-4 overflow-x-auto hide-scrollbar snap-x"
          >
            {festivaltempdata?.map((card) => (
              <div
                key={card.id}
                onClick={() => handleImagePress(card)}
                className="shrink-0 w-[85px] md:w-[140px] aspect-square rounded-2xl overflow-hidden cursor-pointer snap-start relative group border border-border shadow-sm bg-white dark:bg-black/20 transition-transform active:scale-95"
              >
                <img
                  src={card.image}
                  alt="festival template"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function generateDates() {
  const dates = [];

  for (let i = 0; i < 17; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);

    dates.push({
      iso: d.toISOString().split("T")[0],
      day: d.getDate(),
      month: d.toLocaleString("default", { month: "long" }),
      monthShort: d.toLocaleString("default", { month: "short" }),
    });
  }

  return dates;
}
