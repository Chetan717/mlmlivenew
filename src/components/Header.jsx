import { useState, useEffect, useCallback } from "react";
import { Moon, Sun, ListUl, Gear, ChevronLeft, ArrowRotateLeft } from "@gravity-ui/icons";
import { useGeneralData } from "../Context/GeneralContext";
import { useNavigate, useLocation } from "react-router";

function getStoredHeaderData() {
  const mlmProfile = JSON.parse(localStorage.getItem("mlmProfile") || "{}");
  const userMlm = JSON.parse(localStorage.getItem("usermlm") || "{}");
  const lgurl = mlmProfile.logoURLs || [];
  return {
    companyLogo: lgurl[0] || "",
    userName: mlmProfile?.name || userMlm?.name || "",
  };
}

const PAGE_TITLES = {
  "/subscription": "My Subscription",
  "/mlmprofile": "Company Profile",
  "/alltemp": "Templates",
  "/mlmform": "Create Design",
  "/selectcomp": "Select Company",
};

export default function Header({ collapsed, setCollapsed, setMobileOpen }) {
  const { theme, toggleTheme } = useGeneralData();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const location = useLocation();

  const [companyLogo, setCompanyLogo] = useState(() => getStoredHeaderData().companyLogo);
  const [userName, setUserName]       = useState(() => getStoredHeaderData().userName);
  const [refreshing, setRefreshing]   = useState(false);

  useEffect(() => {
    const { companyLogo: logo, userName: name } = getStoredHeaderData();
    setCompanyLogo(logo);
    setUserName(name);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 250);
  }, []);

  if (location.pathname === "/profile") return null;

  const pageTitle = PAGE_TITLES[location.pathname];
  const isHome    = location.pathname === "/";
  const isEditor  = location.pathname === "/editor";
  const isSubPage = !!pageTitle;

  const handleMenuClick = () => {
    if (window.innerWidth < 768) setMobileOpen((p) => !p);
    else setCollapsed((p) => !p);
  };

  return (
    <header className="sticky top-0 z-20 h-[60px] flex items-center px-4 gap-3 bg-background/95 backdrop-blur-xl border-b border-border transition-colors duration-300">
      {/* Left: back button for sub-pages, hamburger for main pages */}
      {isSubPage ? (
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-foreground hover:bg-foreground/8 active:scale-95 transition-all flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={handleMenuClick}
          aria-label="Menu"
          className="w-9 h-9 flex items-center justify-center rounded-full text-foreground hover:bg-foreground/8 active:scale-95 transition-all flex-shrink-0"
        >
          <ListUl className="w-5 h-5" />
        </button>
      )}

      {/* Center: page title or home brand */}
      <div className="flex-1 min-w-0 flex items-center">
        {pageTitle ? (
          <h1 className="text-[15px] font-display font-bold text-foreground truncate leading-tight">
            {pageTitle}
          </h1>
        ) : isHome && (companyLogo || userName) ? (
          <div className="flex items-center gap-2">
            {companyLogo && (
              <img
                src={companyLogo}
                alt="Company Logo"
                className="w-7 h-7 rounded-full border border-border object-cover bg-background shadow-sm flex-shrink-0"
              />
            )}
            {userName && (
              <span className="text-[14px] font-bold text-foreground capitalize truncate font-display">
                {userName}
              </span>
            )}
          </div>
        ) : isEditor ? (
          <h1 className="text-[15px] font-display font-bold text-foreground">Editor</h1>
        ) : null}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Refresh */}
        <button
          onClick={handleRefresh}
          aria-label="Refresh"
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-foreground/8 active:scale-95 transition-all"
        >
          <ArrowRotateLeft
            className={`size-[17px] text-muted-foreground transition-transform duration-500 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-foreground/8 active:scale-95 transition-all"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="size-[18px] text-yellow-400" />
          ) : (
            <Moon className="size-[18px] text-muted-foreground" />
          )}
        </button>

        {/* Editor: banner settings */}
        {isEditor && (
          <button
            onClick={() => navigate("/mlmprofile")}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-foreground/8 active:scale-95 transition-all"
            title="Banner Settings"
          >
            <Gear className="size-[18px] text-accent" />
          </button>
        )}
      </div>
    </header>
  );
}
