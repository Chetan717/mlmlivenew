import { useState } from "react";
import { db } from "../../Firebase";
import { doc, updateDoc } from "firebase/firestore";
import ProfileCard from "./components/ProfileCard";
import AddPlan from "./components/AddPlan";
import AddFollowUp from "./components/AddFollowUp";
import AddKitBook from "./components/AddKitBook";
import AddSPClosed from "./components/AddSPClosed";
import AddNAC from "./components/AddNAC";
import AddNextDayPlan from "./components/AddNextDayPlan";
import MemberGraph from "./components/MemberGraph";
import MemberReportView from "./components/MemberReportView";
import { CheckCircle, Clock, Trash2, Link, AlertTriangle, X } from "lucide-react";
import { toast } from "@heroui/react";

export default function MemberView({ profile }) {
  const [localProfile, setLocalProfile] = useState(profile);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newManagerId, setNewManagerId] = useState("");
  const [connecting, setConnecting] = useState(false);

  const isApproved = localProfile.approvedByManager;
  const hasSendDeleteApproval = localProfile.sendDeleteApproval;
  const hasManagerId = !!localProfile.managerId;

  const handleDeleteAssociation = async () => {
    setDeleting(true);
    try {
      await updateDoc(doc(db, "reportingUser", localProfile.id), {
        sendDeleteApproval: true,
        approvedByManager: false,
      });
      setLocalProfile((p) => ({ ...p, sendDeleteApproval: true, approvedByManager: false }));
      toast.success("Delete request sent to your manager");
      setShowDeleteConfirm(false);
    } catch {
      toast.danger("Failed to send delete request");
    } finally {
      setDeleting(false);
    }
  };

  const handleConnectNewManager = async () => {
    if (!newManagerId.trim()) {
      toast.danger("Enter a Manager ID");
      return;
    }
    setConnecting(true);
    try {
      const newId = newManagerId.trim().toUpperCase();
      await updateDoc(doc(db, "reportingUser", localProfile.id), {
        managerId: newId,
        approvedByManager: false,
        sendDeleteApproval: false,
      });
      setLocalProfile((p) => ({
        ...p,
        managerId: newId,
        approvedByManager: false,
        sendDeleteApproval: false,
      }));
      setNewManagerId("");
      toast.success("Connected to new manager! Waiting for approval.");
    } catch {
      toast.danger("Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">

      {/* Status Banner */}
      <div
        className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border ${
          hasSendDeleteApproval
            ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
            : isApproved
            ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800"
            : "border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800"
        }`}
      >
        {hasSendDeleteApproval ? (
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
        ) : isApproved ? (
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
        ) : (
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-[12px] font-bold ${
              hasSendDeleteApproval
                ? "text-red-700 dark:text-red-400"
                : isApproved
                ? "text-green-700 dark:text-green-400"
                : "text-amber-700 dark:text-amber-400"
            }`}
          >
            {hasSendDeleteApproval
              ? "Delete Request Pending"
              : isApproved
              ? "Approved Team Member"
              : "Pending Manager Approval"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {hasSendDeleteApproval
              ? `Waiting for manager (${localProfile.managerId}) to confirm removal.`
              : isApproved
              ? "You are an approved member. Start adding your daily reports below."
              : `Your manager (${localProfile.managerId}) needs to approve your account.`}
          </p>
        </div>

        {/* Delete Association Button — only show when approved and no pending delete */}
        {isApproved && !hasSendDeleteApproval && hasManagerId && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-800 dark:hover:bg-red-950/50 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white border border-border rounded-2xl shadow-xl p-5 max-w-sm w-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-foreground leading-tight">
                  Delete Association?
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  This will send a delete request to your manager (
                  <span className="font-mono font-bold text-accent">
                    {localProfile.managerId}
                  </span>
                  ). Your profile will remain intact. You can connect to a new manager after removal.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="shrink-0 p-1 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAssociation}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect to New Manager — shown when no managerId OR when delete request is pending */}
      {(!hasManagerId || hasSendDeleteApproval) && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(14,36,92,0.08)" }}
            >
              <Link className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="font-bold text-foreground text-[13px] leading-tight">
                Connect to a Manager
              </p>
              <p className="text-[10px] text-muted-foreground">
                Enter a Manager ID to link and get approved
              </p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Enter Manager ID (e.g. MNRAHUL12345)"
            value={newManagerId}
            onChange={(e) => setNewManagerId(e.target.value.toUpperCase())}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] font-mono uppercase focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <button
            onClick={handleConnectNewManager}
            disabled={connecting || !newManagerId.trim()}
            className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}
          >
            {connecting ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Link className="w-3.5 h-3.5" /> Connect
              </>
            )}
          </button>
        </div>
      )}

      {/* Main Content */}
      {isApproved && !hasSendDeleteApproval ? (
        <>
          <div className="space-y-3">
            <MemberGraph memberProfile={localProfile} />
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              Daily Activity — Add Your Reports
            </p>
            <AddPlan memberProfile={localProfile} />
            <AddFollowUp memberProfile={localProfile} />
            <AddKitBook memberProfile={localProfile} />
            <AddSPClosed memberProfile={localProfile} />
            <AddNAC memberProfile={localProfile} />
            <AddNextDayPlan memberProfile={localProfile} />
          </div>
          <div className="space-y-3">
            <MemberReportView memberProfile={localProfile} />
          </div>
        </>
      ) : (
        !hasSendDeleteApproval && !hasManagerId ? null : (
          !hasManagerId ? null : (
            hasSendDeleteApproval ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-red-100 dark:bg-red-950/30">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <p className="text-[14px] font-bold text-foreground mb-1">
                  Waiting for Manager Confirmation
                </p>
                <p className="text-[12px] text-muted-foreground max-w-xs mx-auto">
                  Your delete request has been sent to manager{" "}
                  <span className="font-mono font-bold text-accent">
                    {localProfile.managerId}
                  </span>
                  . Once confirmed, you can connect to a new manager.
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(14,36,92,0.08)" }}
                >
                  <Clock className="w-7 h-7 text-accent" />
                </div>
                <p className="text-[14px] font-bold text-foreground mb-1">
                  Waiting for Approval
                </p>
                <p className="text-[12px] text-muted-foreground max-w-xs mx-auto">
                  Ask your manager (
                  <span className="font-mono font-bold text-accent">
                    {localProfile.managerId}
                  </span>
                  ) to approve your account in their Reporting Dashboard.
                </p>
              </div>
            )
          )
        )
      )}

      <ProfileCard profile={localProfile} />
    </div>
  );
}
