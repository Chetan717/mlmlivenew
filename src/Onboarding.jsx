import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import logo from "/mlmboo2.ico";

const SLIDES = [
  {
    id: 0,
    titleHindi: "MLM LIVE में\nआपका स्वागत है!",
    titleEng: "Welcome to MLM LIVE",
    descHindi: "आपके Marketing Business का सबसे\nअच्छा Digital Partner",
    descEng: "Your Best Digital Partner\nfor Marketing Business",
    graphic: "welcome",
  },
  {
    id: 1,
    titleHindi: "खूबसूरत Designs\nबनाएं",
    titleEng: "Create Stunning Designs",
    descHindi: "सैकड़ों ready-made templates से\nपसंदीदा Design चुनें और Share करें",
    descEng: "Pick from hundreds of ready\ntemplates and grow your business",
    graphic: "design",
  },
  {
    id: 2,
    titleHindi: "आज ही शुरू करें!",
    titleEng: "Get Started Today",
    descHindi: "नया अकाउंट बनाएं या\nपहले से है तो Login करें",
    descEng: "Create an account or\nSign in to continue",
    graphic: "start",
  },
];

function WelcomeGraphic() {
  return (
    <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="140" cy="110" r="88" fill="white" fillOpacity="0.06" />
      <circle cx="140" cy="110" r="62" fill="white" fillOpacity="0.08" />
      <circle cx="140" cy="110" r="38" fill="white" fillOpacity="0.14" />
      <rect x="108" y="78" width="64" height="64" rx="20" fill="white" fillOpacity="0.18" />
      <rect x="115" y="85" width="50" height="50" rx="16" fill="white" fillOpacity="0.22" />
      <path d="M130 118 L137 125 L153 108" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="58" cy="46" r="10" fill="white" fillOpacity="0.10" />
      <circle cx="220" cy="68" r="14" fill="white" fillOpacity="0.08" />
      <circle cx="44" cy="172" r="7" fill="white" fillOpacity="0.08" />
      <circle cx="238" cy="160" r="10" fill="white" fillOpacity="0.10" />
      <rect x="30" y="96" width="18" height="18" rx="6" fill="white" fillOpacity="0.07" transform="rotate(20 30 96)" />
      <rect x="228" y="112" width="18" height="18" rx="6" fill="white" fillOpacity="0.07" transform="rotate(-15 228 112)" />
    </svg>
  );
}

function DesignGraphic() {
  return (
    <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="60" y="50" width="80" height="100" rx="14" fill="white" fillOpacity="0.12" />
      <rect x="66" y="56" width="68" height="52" rx="10" fill="white" fillOpacity="0.14" />
      <rect x="70" y="118" width="28" height="5" rx="2.5" fill="white" fillOpacity="0.5" />
      <rect x="70" y="128" width="18" height="3.5" rx="1.75" fill="white" fillOpacity="0.3" />
      <rect x="140" y="68" width="80" height="100" rx="14" fill="white" fillOpacity="0.09" />
      <rect x="146" y="74" width="68" height="52" rx="10" fill="white" fillOpacity="0.12" />
      <rect x="150" y="136" width="28" height="5" rx="2.5" fill="white" fillOpacity="0.4" />
      <rect x="150" y="146" width="18" height="3.5" rx="1.75" fill="white" fillOpacity="0.25" />
      <path d="M80 80 Q100 62 120 80" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
      <circle cx="72" cy="192" r="8" fill="white" fillOpacity="0.1" />
      <circle cx="212" cy="44" r="12" fill="white" fillOpacity="0.08" />
      <path d="M50 140 L58 148 L74 132" stroke="white" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StartGraphic() {
  return (
    <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="140" cy="110" r="72" fill="white" fillOpacity="0.07" />
      <circle cx="140" cy="110" r="50" fill="white" fillOpacity="0.10" />
      <path d="M114 108 L126 102 L126 120 L138 114 L138 126 L152 120 L152 102 L164 108" stroke="white" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M120 130 Q140 140 160 130" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="60" r="8" fill="white" fillOpacity="0.1" />
      <circle cx="220" cy="56" r="11" fill="white" fillOpacity="0.08" />
      <circle cx="50" cy="164" r="6" fill="white" fillOpacity="0.08" />
      <circle cx="232" cy="158" r="9" fill="white" fillOpacity="0.09" />
      <path d="M200 100 L208 92 M208 92 L208 100 M208 92 L200 92" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M76 90 L84 82 M84 82 L84 90 M84 82 L76 82" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const GRAPHICS = [WelcomeGraphic, DesignGraphic, StartGraphic];

export default function Onboarding() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const markDone = (path) => {
    localStorage.setItem("onboardingDone", "1");
    navigate(path, { replace: true });
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 44 && dy < 60) {
      if (dx < 0 && current < SLIDES.length - 1) setCurrent((c) => c + 1);
      if (dx > 0 && current > 0) setCurrent((c) => c - 1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];
  const Graphic = GRAPHICS[current];

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden select-none"
      style={{
        background:
          "linear-gradient(160deg, #040c22 0%, #0e245c 45%, #1a3a8f 100%)",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip */}
      {/* {!isLast && (
        <button
          onClick={() => markDone("/login")}
          onTap={() => markDone("/login")}
          className="absolute top-12 right-6 z-20 text-white/50 text-sm font-semibold tracking-wide py-1.5 px-3 rounded-full border border-white/10"
          style={{ touchAction: "manipulation" }}
        >
          Skip
        </button>
      )} */}

      {/* Decorative background blobs */}
      <div
        className="absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #4f6cc4, transparent)" }}
      />
      <div
        className="absolute -bottom-32 -right-20 w-72 h-72 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #4f6cc4, transparent)" }}
      />

      {/* Top section — logo + graphic */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8 gap-2 overflow-hidden">
        {/* Logo */}
        {/* <div className="mb-2 w-16 h-16 bg-white rounded-2xl shadow-2xl flex items-center justify-center border border-white/20 p-2"
          style={{ boxShadow: "0 8px 32px rgba(14,36,92,0.5), 0 2px 8px rgba(0,0,0,0.2)" }}>
          <img src={logo} alt="MLM LIVE" className="w-full h-full object-contain" />
        </div> */}

        {/* Slide graphic */}
        <div
          className="w-64 h-48 mx-auto"
          style={{ filter: "drop-shadow(0 8px 24px rgba(79,108,196,0.3))" }}
        >
         <Graphic />
        </div>

        {/* Text content */}
        <div className="text-center mt-2 px-2">
          <h1
            className="text-white font-display font-bold text-2xl leading-tight mb-2 whitespace-pre-line"
            style={{
              fontFamily: "'Syne', sans-serif !important",
              textShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}
          >
            {slide.titleHindi}
          </h1>
          <p className="text-white/50 text-[13px] font-semibold tracking-wide uppercase mb-3">
            {slide.titleEng}
          </p>
          <p className="text-white/75 text-[15px] leading-relaxed whitespace-pre-line font-medium">
            {slide.descHindi}
          </p>
          <p className="text-white/40 text-[12px] leading-relaxed whitespace-pre-line mt-1.5">
            {slide.descEng}
          </p>
        </div>
      </div>

      {/* Bottom section — dots + CTA */}
      <div className="px-6 pb-12 flex flex-col items-center gap-6">
        {/* Slide indicators */}
        <div className="flex items-center gap-2.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              onTap={() => setCurrent(i)}
              style={{ touchAction: "manipulation" }}
              className={`rounded-full transition-all duration-300 ${
                i === current ? "w-7 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/25"
              }`}
            />
          ))}
        </div>

        {/* Action buttons */}
        {isLast ? (
          <div className="w-full max-w-sm flex flex-col gap-3">
            <button
              onClick={() => markDone("/signup")}
              onTap={() => markDone("/signup")}
              className="w-full h-14 rounded-2xl text-white font-bold text-base shadow-xl"
              style={{
                background: "linear-gradient(135deg, #1a3a8f 0%, #4f6cc4 100%)",
                boxShadow:
                  "0 8px 24px rgba(79,108,196,0.4), 0 2px 6px rgba(0,0,0,0.2)",
                touchAction: "manipulation",
              }}
            >
              नया अकाउंट बनाएं — Signup
            </button>
            <button
              onClick={() => markDone("/login")}
              onTap={() => markDone("/login")}
              className="w-full h-14 rounded-2xl font-bold text-base border border-white/20"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.9)",
                touchAction: "manipulation",
              }}
            >
              Login करें — Sign In
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            onTap={() => setCurrent((c) => c + 1)}
            className="w-full max-w-sm h-14 rounded-2xl text-white font-bold text-base"
            style={{
              background: "linear-gradient(135deg, #1a3a8f 0%, #4f6cc4 100%)",
              boxShadow:
                "0 8px 24px rgba(79,108,196,0.4), 0 2px 6px rgba(0,0,0,0.2)",
              touchAction: "manipulation",
            }}
          >
            आगे बढ़ें → Next
          </button>
        )}
      </div>
    </div>
  );
}
