import { useState, useEffect } from "react";
import { db } from "../../../Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { FileText, Eye, Download, Search, X } from "lucide-react";

import {toast} from "@heroui/react"
import { viewPDF, downloadPDF } from "../utils/pdfGenerator";

const DAYS = ["THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY"];
const DAY_JS = [4, 5, 6, 0, 1, 2, 3];
const COLLECTIONS = { plan: "reportplan", follow: "reportfollowup", kit: "reportkitbook", sp: "reportsp", nac: "reportnac" };

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
}
function parseDateEnd(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
}

export default function TeamReportView({ managerProfile }) {
  const [approvedMembers, setApprovedMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [pdfModal, setPdfModal] = useState(false);

  useEffect(() => {
    getDocs(query(
      collection(db, "reportingUser"),
      where("managerId", "==", managerProfile.managerId),
      where("role", "==", "Team Member"),
      where("approvedByManager", "==", true)
    )).then((snap) => {
      const members = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setApprovedMembers(members);
    }).catch(console.error);
  }, [managerProfile.managerId]);

  const handleGenerate = async () => {
    if (!selectedMemberId || !dateFrom || !dateTo) { toast.danger("Select member and date range"); return; }
    const start = parseDate(dateFrom);
    const end   = parseDateEnd(dateTo);
    if (!start || !end || start > end) { toast.danger("Invalid date range"); return; }

    const member = approvedMembers.find((m) => m.memberId === selectedMemberId);
    if (!member) return;

    setLoading(true);
    try {
      const dayData = Array(7).fill(null).map(() => ({ plan: 0, follow: 0, kit: 0, sp: 0, nac: 0, nextDays: [] }));

      await Promise.all(Object.entries(COLLECTIONS).map(async ([key, col]) => {
        // Single-field query — no composite index needed
        const snap = await getDocs(query(collection(db, col), where("memberId", "==", selectedMemberId)));
        snap.docs.forEach((d) => {
          const raw = d.data().date;
          const dt  = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
          if (!dt || dt < start || dt > end) return;
          const slotIdx = DAY_JS.indexOf(dt.getDay());
          if (slotIdx >= 0) dayData[slotIdx][key]++;
        });
      }));

      // Next day plans
      const nextSnap = await getDocs(query(collection(db, "reportnextday"), where("memberId", "==", selectedMemberId)));
      nextSnap.docs.forEach((d) => {
        const raw = d.data().date;
        const dt  = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
        if (!dt || dt < start || dt > end) return;
        const slotIdx = DAY_JS.indexOf(dt.getDay());
        if (slotIdx >= 0 && dayData[slotIdx].nextDays.length < 4) {
          dayData[slotIdx].nextDays.push({ name: d.data().name, mobile: d.data().mobile, address: d.data().address });
        }
      });

      setReportData({ member, dayData, dateFrom, dateTo });
      setShowReport(true);
    } catch (e) {
      console.error(e);
      toast.danger("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const openPdfModal = () => { if (reportData) setPdfModal(true); };

  const handleView = () => {
    viewPDF({ memberProfile: reportData.member, dateFrom: reportData.dateFrom, dateTo: reportData.dateTo, dayData: reportData.dayData });
    setPdfModal(false);
  };

  const handleDownload = () => {
    downloadPDF({ memberProfile: reportData.member, dateFrom: reportData.dateFrom, dateTo: reportData.dateTo, dayData: reportData.dayData });
    toast.success("PDF downloaded!");
    setPdfModal(false);
  };

  const totals = reportData?.dayData?.reduce(
    (acc, d) => ({ plan: acc.plan + d.plan, follow: acc.follow + d.follow, kit: acc.kit + d.kit, sp: acc.sp + d.sp, nac: acc.nac + d.nac }),
    { plan: 0, follow: 0, kit: 0, sp: 0, nac: 0 }
  );

  return (
    <>
      {/* PDF Modal */}
      {pdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setPdfModal(false)}>
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-xs p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}>
                <FileText className="w-7 h-7 text-white" />
              </div>
              <p className="font-bold text-foreground text-[16px]">Weekly Report PDF</p>
              <p className="text-[11px] text-muted-foreground mt-1">{reportData?.member?.name} · {reportData?.dateFrom} to {reportData?.dateTo}</p>
            </div>
            <div className="space-y-2">
              <button onClick={handleView}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-accent text-accent font-bold text-[14px] hover:bg-accent/5 transition-colors">
                <Eye className="w-4 h-4" /> View PDF
              </button>
              <button onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-[14px]"
                style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}>
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
            <button onClick={() => setPdfModal(false)}
              className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors py-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3.5 flex items-center gap-2.5 border-b border-border/50">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(14,36,92,0.08)" }}>
            <FileText className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="font-bold text-foreground text-[13px] leading-tight">Generate Team Report</p>
            <p className="text-[10px] text-muted-foreground">Weekly reporting sheet per approved member</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Select Approved Member</label>
            <select value={selectedMemberId} onChange={(e) => { setSelectedMemberId(e.target.value); setShowReport(false); }}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30">
              <option value="">-- Select Member --</option>
              {approvedMembers.map((m) => <option key={m.id} value={m.memberId}>{m.name} · {m.memberId}</option>)}
            </select>
            {approvedMembers.length === 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">No approved members yet.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Date From</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setShowReport(false); }}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Date To</label>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setShowReport(false); }}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          <button onClick={handleGenerate} disabled={loading}
            className="w-full py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
            style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><Search className="w-4 h-4" /> Generate Report</>}
          </button>
        </div>

        {showReport && reportData && (
          <div className="border-t border-border/50">
            {/* Summary bar */}
            <div className="px-4 py-3 bg-muted/20 border-b border-border/30 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-[13px] text-foreground truncate">{reportData.member.name}</p>
                <p className="text-[10px] text-muted-foreground">{reportData.dateFrom} → {reportData.dateTo}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={openPdfModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-bold"
                  style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}>
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={() => setShowReport(false)} className="p-1.5 rounded-xl hover:bg-muted/50 transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-5 gap-2 px-4 pt-3 pb-2">
              {[
                { label: "Plans",   value: totals?.plan   ?? 0, color: "#0e245c" },
                { label: "Follow",  value: totals?.follow ?? 0, color: "#1a6fbf" },
                { label: "Kit",     value: totals?.kit    ?? 0, color: "#2196f3" },
                { label: "SP",      value: totals?.sp     ?? 0, color: "#43a047" },
                { label: "NAC",     value: totals?.nac    ?? 0, color: "#ff7043" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border p-2 text-center">
                  <p className="text-[17px] font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Weekly table */}
            <div className="overflow-x-auto pb-4 px-2">
              <table className="w-full text-[10px] border-collapse min-w-[680px]">
                <thead>
                  <tr style={{ background: "#0e245c", color: "white" }}>
                    <th className="px-2 py-1.5 border border-blue-800 w-7" rowSpan={2}>S.NO</th>
                    <th className="px-2 py-1.5 text-left border border-blue-800 w-22" rowSpan={2}>DAYS</th>
                    <th className="px-2 py-1.5 border border-blue-800" rowSpan={2}>PLAN</th>
                    <th className="px-2 py-1.5 border border-blue-800" rowSpan={2}>FOLLOW</th>
                    <th className="px-2 py-1.5 border border-blue-800" rowSpan={2}>KIT</th>
                    <th className="px-2 py-1.5 border border-blue-800" rowSpan={2}>SP</th>
                    <th className="px-2 py-1.5 border border-blue-800" rowSpan={2}>NAC</th>
                    <th className="px-2 py-1.5 border border-blue-800 text-center" colSpan={2}>BONANZA</th>
                    <th className="px-2 py-1.5 border border-blue-800 text-center" colSpan={4}>NEXT DAY PLANNING</th>
                  </tr>
                  <tr style={{ background: "#1a3a8a", color: "white" }}>
                    <th className="px-1 py-1 border border-blue-700 text-[9px]">LEFT</th>
                    <th className="px-1 py-1 border border-blue-700 text-[9px]">RIGHT</th>
                    <th className="px-1 py-1 border border-blue-700 text-[9px]">FIRST</th>
                    <th className="px-1 py-1 border border-blue-700 text-[9px]">SECOND</th>
                    <th className="px-1 py-1 border border-blue-700 text-[9px]">THIRD</th>
                    <th className="px-1 py-1 border border-blue-700 text-[9px]">FOURTH</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.dayData.map((d, i) => {
                    const nd = d.nextDays || [];
                    const bg = i % 2 === 0 ? "" : "bg-blue-50/40 dark:bg-blue-950/10";
                    const getND = (idx, field) => nd[idx]?.[field] || "";
                    return (
                      <>
                        {/* Row 1 — TIME / mobile */}
                        <tr key={`${i}-1`} className={bg}>
                          <td className="px-2 py-1 text-center border border-border font-bold" rowSpan={3}>{i + 1}</td>
                          <td className="px-2 py-1 text-left border border-border font-semibold text-[8.5px] leading-tight" rowSpan={3}>{DAYS[i]}</td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>{d.plan || ""}</td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>{d.follow || ""}</td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>{d.kit || ""}</td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>{d.sp || ""}</td>
                          <td className="px-2 py-1 text-center border border-border" rowSpan={3}>{d.nac || ""}</td>
                          <td className="px-1 py-1 border border-border text-center" rowSpan={3} />
                          <td className="px-1 py-1 border border-border text-center" rowSpan={3} />
                          <NDCell value={getND(0, "mobile")} />
                          <NDCell value={getND(1, "mobile")} />
                          <NDCell value={getND(2, "mobile")} />
                          <NDCell value={getND(3, "mobile")} />
                        </tr>
                        {/* Row 2 — NAME */}
                        <tr key={`${i}-2`} className={bg}>
                          <NDCell value={getND(0, "name")} bold />
                          <NDCell value={getND(1, "name")} bold />
                          <NDCell value={getND(2, "name")} bold />
                          <NDCell value={getND(3, "name")} bold />
                        </tr>
                        {/* Row 3 — PLACE / address */}
                        <tr key={`${i}-3`} className={bg}>
                          <NDCell value={getND(0, "address")} muted />
                          <NDCell value={getND(1, "address")} muted />
                          <NDCell value={getND(2, "address")} muted />
                          <NDCell value={getND(3, "address")} muted />
                        </tr>
                      </>
                    );
                  })}
                  <tr style={{ background: "#e8f0fe" }}>
                    <td className="px-2 py-2 border border-border" />
                    <td className="px-2 py-2 border border-border font-bold text-[10px] text-left">TOTAL</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.plan || 0}</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.follow || 0}</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.kit || 0}</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.sp || 0}</td>
                    <td className="px-2 py-2 text-center border border-border font-bold">{totals?.nac || 0}</td>
                    <td className="border border-border" colSpan={6} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function NDCell({ value, bold, muted }) {
  return (
    <td className={`px-1.5 py-1 border border-border text-[8px] max-w-[60px] truncate ${bold ? "font-semibold text-foreground" : muted ? "text-muted-foreground" : "text-foreground/80"}`}>
      {value}
    </td>
  );
}
