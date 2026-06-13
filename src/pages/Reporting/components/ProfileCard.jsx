import { User, MapPin, Phone, Hash, Copy, CheckCheck } from "lucide-react";
import { useState } from "react";

export default function ProfileCard({ profile }) {
  const [copied, setCopied] = useState(false);
  const id = profile.managerId || profile.memberId || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="h-2 w-full" style={{ background: "linear-gradient(90deg,#0e245c,#1a3a8a,#4f6fcf)" }} />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}>
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-foreground text-[15px] leading-tight">{profile.name}</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block"
              style={{
                background: profile.role === "Manager" ? "rgba(14,36,92,0.1)" : "rgba(34,139,34,0.1)",
                color: profile.role === "Manager" ? "#0e245c" : "#228b22",
              }}>
              {profile.role}
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Mobile" value={profile.mobile} />
          <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Address" value={profile.address} />
          {profile.managerId && profile.role === "Team Member" && (
            <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Manager ID" value={profile.managerId} />
          )}

          <div className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Hash className="w-3.5 h-3.5 text-accent shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground leading-none mb-0.5">
                  {profile.role === "Manager" ? "Manager ID" : "Member ID"}
                </p>
                <p className="text-[13px] font-bold text-accent font-mono truncate">{id}</p>
              </div>
            </div>
            <button onClick={handleCopy}
              className="ml-2 p-1.5 rounded-lg hover:bg-accent/10 transition-colors shrink-0">
              {copied
                ? <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                : <Copy className="w-3.5 h-3.5 text-accent" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-accent mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className="text-[13px] text-foreground font-medium truncate">{value || "—"}</p>
      </div>
    </div>
  );
}
