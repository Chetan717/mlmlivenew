import { useEffect } from "react";
import { Spinner } from "@heroui/react";

export function Logout() {
  useEffect(() => {
    localStorage.removeItem("selectedCompany");
    localStorage.removeItem("mlmProfile");
    localStorage.removeItem("theme");
    localStorage.removeItem("usermlm");
    localStorage.removeItem("mlmform");
    localStorage.removeItem("selType");
    localStorage.removeItem("close_filter");
    localStorage.removeItem("achieve_form");
    localStorage.removeItem("Meeting");
    // Hard redirect — forces full re-render, clears all stale state
    window.location.replace("/login");
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="text-center flex flex-col items-center gap-6 relative z-10 bg-white/50 dark:bg-black/20 p-10 rounded-3xl backdrop-blur-xl border border-border shadow-2xl">
        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-2">
          <Spinner size="lg" color="primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Logging out...</h2>
          <p className="text-muted-foreground text-sm font-medium">Securing your account data</p>
        </div>
      </div>
    </div>
  );
}
