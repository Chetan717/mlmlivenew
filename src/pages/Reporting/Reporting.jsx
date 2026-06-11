import { BarChart3 } from "lucide-react";

export default function Reporting() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div className="w-20 h-20 rounded-[28px] flex items-center justify-center mb-6 shadow-lg"
        style={{ background: "linear-gradient(135deg, #0e245c 0%, #1a3a8a 100%)" }}>
        <BarChart3 className="w-9 h-9 text-white" />
      </div>
      <h1 className="text-[26px] font-display font-bold text-foreground mb-2">Reporting</h1>
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
        style={{ background: "rgba(14,36,92,0.08)", border: "1px solid rgba(14,36,92,0.15)" }}>
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-[12px] font-bold text-accent uppercase tracking-widest">Coming Soon</span>
      </div>
      <p className="text-[14px] text-muted-foreground max-w-xs leading-relaxed">
        Detailed analytics, download stats, team performance reports and more — launching very soon!
      </p>
    </div>
  );
}
