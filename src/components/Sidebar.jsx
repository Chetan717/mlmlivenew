import {
  Person,
  Gem,
  Timestamps,
  Comments,
  ScalesBalanced,
  Video,
  ArrowUpFromSquare,
  Xmark,
} from "@gravity-ui/icons";
import { useNavigate, useLocation } from "react-router";
import { useGeneralData } from "../Context/GeneralContext";

const NAV_ITEMS = [
  { icon: Person,         label: "My Profile",          id: "Profile",       link: "/profile"      },
  { icon: Gem,            label: "My Subscriptions",    id: "Subscriptions", link: "/subscription" },
  { icon: Timestamps,     label: "My Company Profile",  id: "MyMLMProfile",  link: "/mlmprofile"   },
  { icon: Comments,       label: "Customer Support",    id: "customerSupport", link: "https://wa.me/919229885383" },
  { icon: ScalesBalanced, label: "Privacy Policy",      id: "privacyPolicy", link: "https://mlmlive.in/Privacy.html" },
  { icon: Video,          label: "Learn How to Use",    id: "howtoUse",      link: "https://youtube.com/@mlmboosterapp?si=4AQiHvcR8x6CmOHX" },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { theme } = useGeneralData();

  let selectedCompany  = null;
  let selectedProfile  = null;
  try { selectedCompany = JSON.parse(localStorage.getItem("selectedCompany") || "null"); } catch {}
  try { selectedProfile = JSON.parse(localStorage.getItem("mlmProfile")      || "null"); } catch {}

  const companyName = selectedCompany?.name || selectedProfile?.companyName || "MLM LIVE";
  const companyLogo = selectedCompany?.logos?.[0]?.link || selectedProfile?.logoURLs?.[0] || "";
  const fullName    = selectedProfile?.fullName || "";
  const mobile      = selectedProfile?.mobile   || "";

  const close = () => setMobileOpen(false);

  const handleNav = (link) => {
    if (!link) return;
    close();
    if (link.startsWith("http")) window.open(link, "_blank");
    else navigate(link);
  };

  const isActive = (link) => location.pathname === link;

  return (
    <>
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      <aside
        className={[
          "fixed md:relative top-0 left-0 z-[60] md:z-auto",
          "h-full flex flex-col",
          "bg-accent dark:bg-[#080b14]",
          "transition-all duration-300 ease-in-out",
          "shadow-2xl md:shadow-none overflow-hidden",
          collapsed ? "md:w-[72px]" : "md:w-[268px]",
          mobileOpen ? "w-[268px] translate-x-0" : "w-[268px] -translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex flex-col px-5 pt-10 pb-6 shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/12 to-transparent pointer-events-none" />

          {/* Mobile close */}
          <button
            onClick={close}
            className="absolute top-4 right-4 md:hidden w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
          >
            <Xmark className="w-4 h-4" />
          </button>

          <div className={`flex items-center gap-3.5 relative z-10 ${collapsed ? "md:flex-col md:gap-2" : ""}`}>
            <div className="w-11 h-11 rounded-xl bg-background shadow-md flex items-center justify-center shrink-0 overflow-hidden border border-border">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-accent font-bold text-xl">M</span>
              )}
            </div>

            <div className={`flex flex-col min-w-0 transition-all duration-300 ${collapsed ? "md:opacity-0 md:w-0 md:overflow-hidden" : "opacity-100"}`}>
              <h2 className="text-white font-display font-bold text-[15px] leading-tight truncate w-36">
                {companyName}
              </h2>
              {fullName && (
                <p className="text-white/75 text-[12px] font-medium mt-0.5 truncate w-36">{fullName}</p>
              )}
              {mobile && (
                <p className="text-white/55 text-[11px] mt-0.5 font-mono">+91 {mobile}</p>
              )}
            </div>
          </div>
        </div>

        {/* Nav area - slides up over accent */}
        <div className="flex-1 flex flex-col bg-background dark:bg-[#0d1120] rounded-t-[28px] overflow-hidden -mt-3 relative z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3.5 mb-1 opacity-40 md:hidden" />

          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 layout-scroll-container">
            {NAV_ITEMS.map(({ icon: Icon, label, id, link }) => {
              const active = isActive(link);
              return (
                <button
                  key={id}
                  onClick={() => handleNav(link)}
                  className={[
                    "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 group",
                    active
                      ? "bg-accent text-white shadow-sm"
                      : "text-foreground/70 hover:bg-foreground/6 hover:text-foreground",
                  ].join(" ")}
                  title={collapsed ? label : undefined}
                >
                  <span className={`shrink-0 transition-transform duration-150 ${active ? "" : "group-hover:scale-110"}`}>
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className={`flex-1 text-left whitespace-nowrap transition-all duration-300 ${collapsed ? "md:opacity-0 md:w-0 overflow-hidden" : ""}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-border">
            <button
              onClick={() => { close(); navigate("/logout"); }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium text-danger hover:bg-danger/8 transition-all duration-150 group"
            >
              <span className="shrink-0 group-hover:scale-110 transition-transform duration-150">
                <ArrowUpFromSquare className="w-[18px] h-[18px]" />
              </span>
              <span className={`flex-1 text-left whitespace-nowrap ${collapsed ? "md:opacity-0 md:w-0 overflow-hidden" : ""}`}>
                Logout
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
