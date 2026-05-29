import { useNavigate, useLocation } from "react-router";
import { House, Gem, Person } from "@gravity-ui/icons";

const TABS = [
  { label: "Home",         path: "/",            Icon: House  },
  { label: "Subscription", path: "/subscription", Icon: Gem    },
  { label: "Profile",      path: "/profile",      Icon: Person },
];

export default function TabBar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const hide = ["/editor", "/Editor"].includes(location.pathname);
  if (hide) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Glass backdrop */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-2xl border-t border-border/60" />

      <div className="relative flex items-stretch h-[58px] px-2">
        {TABS.map(({ label, path, Icon }) => {
          const isActive =
            location.pathname === path ||
            (path === "/" && location.pathname === "");

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="relative flex-1 flex flex-col items-center justify-center gap-[3px] group active:scale-95 transition-transform duration-150"
            >
              {/* Pill background for active */}
              {isActive && (
                <div className="absolute inset-x-3 top-2 bottom-2 rounded-2xl bg-accent/10 dark:bg-accent/15" />
              )}

              <div className="relative z-10 flex flex-col items-center gap-[3px]">
                <div
                  className={`flex items-center justify-center w-[34px] h-[24px] rounded-xl transition-colors duration-200 ${
                    isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <span
                  className={`text-[10px] font-semibold leading-none transition-colors duration-200 ${
                    isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
