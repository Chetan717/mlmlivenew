import { useState, useEffect, useCallback, useRef } from "react";
import { Moon, Sun, ListUl, Gear, ChevronLeft, ArrowRotateLeft } from "@gravity-ui/icons";
import { useGeneralData } from "../Context/GeneralContext";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import { LayoutDashboard, PlusCircle, Eye, ChevronRight, X, ClipboardList, Users, UserCheck } from "lucide-react";

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

const REPORTING_TAB_LABELS = {
  "dashboard": "Dashboard",
  "add-work": "Add Work Reporting",
  "add-patient": "Add Patient Reporting",
  "add-team-list": "Add Team List",
  "view-work": "View Work Reporting",
  "view-patient": "View Patient Reporting",
  "view-team-list": "View Team List",
};

export default function Header({ collapsed, setCollapsed, setMobileOpen }) {
  const { theme, toggleTheme, selType } = useGeneralData();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [companyLogo, setCompanyLogo] = useState(() => getStoredHeaderData().companyLogo);
  const [userName, setUserName]       = useState(() => getStoredHeaderData().userName);
  const [refreshing, setRefreshing]   = useState(false);
  const [showReportingMenu, setShowReportingMenu] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const menuRef = useRef(null);

  const isReporting = location.pathname === "/reporting";
  const activeTab = searchParams.get("tab") || "dashboard";

  useEffect(() => {
    const { companyLogo: logo, userName: name } = getStoredHeaderData();
    setCompanyLogo(logo);
    setUserName(name);
  }, []);

  useEffect(() => {
    setShowReportingMenu(false);
    setExpandedSection(null);
  }, [location.pathname, activeTab]);

  useEffect(() => {
    if (!showReportingMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowReportingMenu(false);
        setExpandedSection(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showReportingMenu]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => { window.location.reload(); }, 250);
  }, []);

  if (location.pathname === "/profile") return null;

  const pageTitle = PAGE_TITLES[location.pathname];
  const isHome    = location.pathname === "/";
  const isEditor  = location.pathname === "/editor";
  const isSubPage = !!pageTitle;
  const isForm    = location.pathname === "/mlmform";

  const typeName = (() => {
    let t = selType?.type;
    if (!t) {
      try { t = JSON.parse(localStorage.getItem("selType") || "{}")?.type; } catch { t = ""; }
    }
    return t ? t.replaceAll("_", " ") : "";
  })();

  const handleMenuClick = () => {
    if (isReporting) {
      setShowReportingMenu((p) => !p);
      setExpandedSection(null);
    } else {
      if (window.innerWidth < 768) setMobileOpen((p) => !p);
      else setCollapsed((p) => !p);
    }
  };

  const goToTab = (tab) => {
    navigate(`/reporting?tab=${tab}`);
    setShowReportingMenu(false);
    setExpandedSection(null);
  };

  const REPORTING_MENU = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      type: "single",
      tab: "dashboard",
    },
    {
      id: "add",
      label: "Add Reporting",
      icon: PlusCircle,
      type: "group",
      children: [
        { id: "add-work",        label: "Add Work Reporting",    icon: ClipboardList, tab: "add-work" },
        { id: "add-patient",     label: "Add Patient Reporting", icon: UserCheck,     tab: "add-patient" },
        { id: "add-team-list",   label: "Add Team List",         icon: Users,         tab: "add-team-list" },
      ],
    },
    {
      id: "view",
      label: "View Reporting",
      icon: Eye,
      type: "group",
      children: [
        { id: "view-work",       label: "View Work Reporting",    icon: ClipboardList, tab: "view-work" },
        { id: "view-patient",    label: "View Patient Reporting", icon: UserCheck,     tab: "view-patient" },
        { id: "view-team-list",  label: "View Team List",         icon: Users,         tab: "view-team-list" },
      ],
    },
  ];

  const currentTabLabel = isReporting ? (REPORTING_TAB_LABELS[activeTab] || "Dashboard") : null;

  return (
    <>
      <header className="sticky top-0 z-20 h-[60px] flex items-center px-4 gap-3 bg-background/95 backdrop-blur-xl border-b border-border transition-colors duration-300">
        {isSubPage || isEditor ? (
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

        <div className="flex-1 min-w-0 flex items-center">
          {(isEditor || isForm) && typeName ? (
            <h1 className="text-[15px] font-display font-bold text-foreground truncate leading-tight capitalize">
              {typeName}
            </h1>
          ) : pageTitle ? (
            <h1 className="text-[15px] font-display font-bold text-foreground truncate leading-tight">
              {pageTitle}
            </h1>
          ) : isReporting ? (
            <div className="flex flex-col min-w-0">
              <h1 className="text-[15px] font-display font-bold text-foreground leading-tight">Reporting</h1>
              {currentTabLabel && (
                <p className="text-[10px] text-accent font-semibold leading-none truncate">{currentTabLabel}</p>
              )}
            </div>
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

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleRefresh}
            aria-label="Refresh"
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-foreground/8 active:scale-95 transition-all"
          >
            <ArrowRotateLeft
              className={`size-[17px] text-accent dark:text-white transition-transform duration-500 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>

          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-foreground/8 active:scale-95 transition-all"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="size-[18px] text-yellow-400" />
            ) : (
              <Moon className="size-[18px] text-accent" />
            )}
          </button>

          {isEditor && (
            <button
              onClick={() => navigate("/mlmprofile?mode=settings")}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-foreground/8 active:scale-95 transition-all"
              title="Banner Settings"
            >
              <Gear className="size-[18px] text-accent dark:text-white" />
            </button>
          )}
        </div>
      </header>

      {/* Reporting Dropdown Menu Overlay */}
      {isReporting && showReportingMenu && (
        <div className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm" onClick={() => { setShowReportingMenu(false); setExpandedSection(null); }}>
          <div
            ref={menuRef}
            className="absolute top-[60px] left-0 right-0 mx-3 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border"
              style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}>
              <span className="text-white font-bold text-[14px]">Reporting Menu</span>
              <button
                onClick={() => { setShowReportingMenu(false); setExpandedSection(null); }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 space-y-1">
              {REPORTING_MENU.map((item) => {
                const Icon = item.icon;
                if (item.type === "single") {
                  const isActive = activeTab === item.tab;
                  return (
                    <button
                      key={item.id}
                      onClick={() => goToTab(item.tab)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13.5px] font-semibold transition-all ${
                        isActive
                          ? "bg-accent text-white"
                          : "text-foreground hover:bg-foreground/6"
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5 shrink-0" />
                      {item.label}
                    </button>
                  );
                }

                const isExpanded = expandedSection === item.id;
                const hasActiveChild = item.children?.some((c) => c.tab === activeTab);

                return (
                  <div key={item.id}>
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13.5px] font-semibold transition-all ${
                        hasActiveChild
                          ? "bg-accent/10 text-accent"
                          : "text-foreground hover:bg-foreground/6"
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-0.5 pb-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = activeTab === child.tab;
                          return (
                            <button
                              key={child.id}
                              onClick={() => goToTab(child.tab)}
                              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                                isChildActive
                                  ? "bg-accent text-white"
                                  : "text-foreground/75 hover:bg-foreground/6 hover:text-foreground"
                              }`}
                            >
                              <ChildIcon className="w-4 h-4 shrink-0" />
                              {child.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
