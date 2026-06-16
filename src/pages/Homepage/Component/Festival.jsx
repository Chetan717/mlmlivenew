import { useState, useRef, useEffect, useMemo } from "react";
import { Festival_template } from "./Services/Festival_template";
import { useGeneralData } from "../../.././Context/GeneralContext";
import { useNavigate } from "react-router";
import { Skeleton } from "@heroui/react";
import { Calendar } from "@gravity-ui/icons";

export default function Festival() {
  const sliderRef = useRef(null);
  const dateSliderRef = useRef(null);

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

    if (sliderRef.current) {
      sliderRef.current.scrollLeft = 0;
    }

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const handleDateSelect = (iso) => {
    setSelectedDate(iso);
  };

  const handleImagePress = (item) => {
    const selttype = {
      id: item.id,
      type: item.type,
      serial: item.serial,
      ShowCaseForm: item.ShowCaseForm,
      Subtype: item.Subtype || "",
    };
    setSelType(selttype);
    navigate("/editor");
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center gap-2 px-1">
        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
          <Calendar className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-display font-bold text-foreground">Festival Calendar</h3>
      </div>

      <div
        ref={dateSliderRef}
        className="flex hide-scrollbar gap-3 overflow-x-auto w-full pt-2 pb-2 px-1 snap-x"
      >
        {dates.map((d) => {
          const isSelected = selectedDate === d.iso;
          return (
            <button
              key={d.iso}
              onClick={() => handleDateSelect(d.iso)}
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

      {loading ? (
        <div className="relative w-full">
          <div className="flex gap-4 overflow-x-hidden">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="shrink-0 flex flex-col gap-1">
                <div className="w-[85px] md:w-[140px] aspect-square rounded-2xl overflow-hidden bg-white dark:bg-black/20 border border-border">
                  <Skeleton className="w-full h-full" />
                </div>
                <div className="w-[85px] md:w-[140px] h-3 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : festivaltempdata?.length > 0 ? (
        <div className="relative w-full">
          <div
            ref={sliderRef}
            className="flex gap-4 overflow-x-auto hide-scrollbar snap-x scroll-gpu"
          >
            {festivaltempdata?.map((card) => (
              <div
                key={card.id}
                onClick={() => handleImagePress(card)}
                className="shrink-0 flex flex-col gap-1.5 cursor-pointer snap-start"
              >
                <div className="w-[85px] md:w-[140px] aspect-square rounded-2xl overflow-hidden relative border border-border shadow-sm bg-white dark:bg-black/20 card-press">
                  <img
                    src={card.image}
                    alt={card.Subtype || "festival template"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  <div className="absolute bottom-1.5 right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-lg bg-accent/90 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold leading-none">
                      {new Date(selectedDate + "T00:00:00").getDate()}
                    </span>
                  </div>
                </div>
                {card.Subtype ? (
                  <p className="w-[85px] md:w-[140px] text-[10px] font-semibold text-center text-foreground/70 leading-tight line-clamp-1">
                    {card.Subtype}
                  </p>
                ) : null}
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
