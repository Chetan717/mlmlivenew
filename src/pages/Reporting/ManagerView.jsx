import { useState, useEffect } from "react";
import { db } from "../../Firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import ProfileCard from "./components/ProfileCard";
import ApproveMembers from "./components/ApproveMembers";
import TeamReportView from "./components/TeamReportView";
import ReportGraph from "./components/ReportGraph";
import MemberGraph from "./components/MemberGraph";
import MemberReportView from "./components/MemberReportView";
import AddPlan from "./components/AddPlan";
import AddFollowUp from "./components/AddFollowUp";
import AddKitBook from "./components/AddKitBook";
import AddSPClosed from "./components/AddSPClosed";
import AddNAC from "./components/AddNAC";
import AddNextDayPlan from "./components/AddNextDayPlan";
import { LayoutDashboard, PlusCircle, Eye, ClipboardList, Users, UserCheck, X } from "lucide-react";

const WORK_COLLECTIONS = [
  { key: "plan",   col: "reportplan",     label: "Plan" },
  { key: "follow", col: "reportfollowup", label: "Follow Up" },
  { key: "kit",    col: "reportkitbook",  label: "Kit Book" },
  { key: "sp",     col: "reportsp",       label: "SP Closed" },
  { key: "nac",    col: "reportnac",      label: "NAC" },
];

function TodayCountBadge({ memberId, collectionName }) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!memberId) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    getDocs(
      query(
        collection(db, collectionName),
        where("memberId", "==", memberId)
      )
    ).then((snap) => {
      let cnt = 0;
      snap.docs.forEach((d) => {
        const raw = d.data().date;
        const dt = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
        if (dt && dt >= start && dt <= end) cnt++;
      });
      setCount(cnt);
    }).catch(() => setCount(0));
  }, [memberId, collectionName]);

  if (count === null) return <span className="text-[10px] text-muted-foreground">...</span>;
  return (
    <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
      {count}
    </span>
  );
}

function ComingSoon({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: "rgba(14,36,92,0.08)" }}>
        <ClipboardList className="w-7 h-7 text-accent" />
      </div>
      <p className="text-[14px] font-bold text-foreground mb-1">{label}</p>
      <p className="text-[12px] text-muted-foreground">This section is coming soon.</p>
    </div>
  );
}

export default function ManagerView({ profile, activeTab }) {
  const [viewWorkPopup, setViewWorkPopup] = useState(false);
  const [viewWorkChoice, setViewWorkChoice] = useState(null);

  const selfProfile = { ...profile, memberId: profile.managerId };

  useEffect(() => {
    if (activeTab !== "view-work") {
      setViewWorkChoice(null);
    }
  }, [activeTab]);

  if (activeTab === "dashboard") {
    return (
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        <ProfileCard profile={profile} />
        <MemberGraph memberProfile={selfProfile} />
        <ReportGraph managerProfile={profile} />
        <ApproveMembers managerProfile={profile} />
      </div>
    );
  }

  if (activeTab === "add-work") {
    return (
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}>
              <PlusCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground text-[14px] leading-tight">Add Work Reporting</p>
              <p className="text-[10px] text-muted-foreground">Add your daily work activity below</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Add Plan</p>
            <TodayCountBadge memberId={profile.managerId} collectionName="reportplan" />
          </div>
          <AddPlan memberProfile={selfProfile} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Add Follow Up</p>
            <TodayCountBadge memberId={profile.managerId} collectionName="reportfollowup" />
          </div>
          <AddFollowUp memberProfile={selfProfile} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Add Kit Book</p>
            <TodayCountBadge memberId={profile.managerId} collectionName="reportkitbook" />
          </div>
          <AddKitBook memberProfile={selfProfile} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">SP Closed</p>
            <TodayCountBadge memberId={profile.managerId} collectionName="reportsp" />
          </div>
          <AddSPClosed memberProfile={selfProfile} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">NAC</p>
            <TodayCountBadge memberId={profile.managerId} collectionName="reportnac" />
          </div>
          <AddNAC memberProfile={selfProfile} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Next Day Plan</p>
          </div>
          <AddNextDayPlan memberProfile={selfProfile} />
        </div>
      </div>
    );
  }

  if (activeTab === "view-work") {
    if (!viewWorkChoice) {
      return (
        <div className="px-4 py-5 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#0e245c,#1a3a8a,#4f6fcf)" }} />
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}>
                <Eye className="w-7 h-7 text-white" />
              </div>
              <p className="text-[16px] font-bold text-foreground mb-1">View Work Reporting</p>
              <p className="text-[12px] text-muted-foreground mb-6">Choose whose report you want to view</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setViewWorkChoice("self")}
                  className="flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent transition-all"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}>
                    <UserCheck className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-[13px] font-bold text-foreground">Self</p>
                  <p className="text-[10px] text-muted-foreground">Your own reports</p>
                </button>
                <button
                  onClick={() => setViewWorkChoice("team")}
                  className="flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent transition-all"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-[13px] font-bold text-foreground">Team</p>
                  <p className="text-[10px] text-muted-foreground">All team members</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewWorkChoice(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:bg-foreground/6 transition-colors"
          >
            ← Back
          </button>
          <div className="flex-1 px-3 py-1.5 rounded-xl border border-accent/20 bg-accent/5 text-center">
            <span className="text-[12px] font-bold text-accent capitalize">
              {viewWorkChoice === "self" ? "My Reports" : "Team Reports"}
            </span>
          </div>
        </div>
        {viewWorkChoice === "self" ? (
          <MemberReportView memberProfile={selfProfile} />
        ) : (
          <TeamReportView managerProfile={profile} />
        )}
      </div>
    );
  }

  if (activeTab === "add-patient") return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <ComingSoon label="Add Patient Reporting" />
    </div>
  );

  if (activeTab === "add-team-list") return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <ComingSoon label="Add Team List" />
    </div>
  );

  if (activeTab === "view-patient") return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <ComingSoon label="View Patient Reporting" />
    </div>
  );

  if (activeTab === "view-team-list") return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <ComingSoon label="View Team List" />
    </div>
  );

  return null;
}
