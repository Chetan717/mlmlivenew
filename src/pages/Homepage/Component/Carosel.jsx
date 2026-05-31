import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import "./stylec.css";
import { Pagination, EffectFade, Autoplay } from "swiper/modules";
import { TTrend_templateService } from "./Services/TTrend_templateService";
import { useNavigate } from "react-router";
import { useGeneralData } from "../../.././Context/GeneralContext";
import { Skeleton } from "@heroui/react";

export default function Carosel() {
  const { setSelType, cachedTrending, setCachedTrending } = useGeneralData();
  const [slides, setSlides] = useState(cachedTrending || []);
  const [loading, setLoading] = useState(!cachedTrending);
  const navigate = useNavigate();

  useEffect(() => {
    if (cachedTrending) {
      setSlides(cachedTrending);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadTrending = async () => {
      try {
        setLoading(true);
        const data = await TTrend_templateService();
        if (!isMounted) return;
        setSlides(data);
        setCachedTrending(data);
      } catch (error) {
        console.error("Failed to load carousel:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTrending();
    return () => {
      isMounted = false;
    };
  }, [cachedTrending, setCachedTrending]);

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

  if (loading) {
    return (
      <div className="w-full rounded-2xl overflow-hidden aspect-[21/9] md:aspect-[3/1] bg-white dark:bg-black/20 shadow-sm border border-border">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!slides || slides.length === 0) return null;

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-md border border-border/50 group relative">
      <Swiper
        pagination={{ 
          dynamicBullets: true,
          clickable: true
        }}
        effect="fade"
        autoplay={{
          delay: 4000,
          disableOnInteraction: false,
        }}
        modules={[Pagination, EffectFade, Autoplay]}
        className="w-full aspect-[21/9] md:aspect-[3/1]"
      >
        {slides?.map((item) => (
          <SwiperSlide key={item.id} className="relative w-full h-full bg-muted cursor-pointer overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-xl opacity-50 scale-110"
              style={{ backgroundImage: `url(${item.image})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10 pointer-events-none" />
            <img
              src={item.image}
              onClick={() => handleImagePress(item)}
              alt="trending template"
              className="relative z-20 w-full h-full object-contain hover:scale-105 transition-transform duration-700 ease-out"
              
            />
            {/* Optional overlay indicator for clickability */}
            <div className="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none bg-black/10 backdrop-blur-[1px]">
               <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white font-semibold text-sm border border-white/30 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                 Tap to use
               </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Custom Swiper pagination styling overrides are injected via standard CSS classes or global styles, but we handle the container nicely here */}
    </div>
  );
}
