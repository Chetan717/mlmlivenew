import { useState, useEffect } from "react";
import { db } from "../../../Firebase";
import { collection, query, where, getDocs, writeBatch, doc, Timestamp } from "firebase/firestore";
import { GitBranch } from "lucide-react";
import { toast } from "@heroui/react";
import { SectionCard, BatchList, FormFields, ActionRow } from "./AddPlan";
import SearchablePicker from "./SearchablePicker";

export default function AddFollowUp({ memberProfile }) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [batch, setBatch] = useState([]);
  const [form, setForm] = useState({ name: "", mobile: "", address: "", followupNote: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingPlans(true);
    const fetchPlans = async () => {
      try {
        // Fetch all plans for this member
        const plansSnap = await getDocs(
          query(collection(db, "reportplan"), where("memberId", "==", memberProfile.memberId))
        );
        const allPlans = plansSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Fetch all SP Closed entries for this member to get closed plan IDs
        const spSnap = await getDocs(
          query(collection(db, "reportsp"), where("memberId", "==", memberProfile.memberId))
        );
        const closedPlanIds = new Set(spSnap.docs.map((d) => d.data().planId));

        // Exclude plans that have SP Closed
        const filtered = allPlans.filter((p) => !closedPlanIds.has(p.id));
        setPlans(filtered);
      } catch {
        toast.danger("Failed to load plans");
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, [open, memberProfile.memberId]);

  const handleSelectPlan = (planId) => {
    const p = plans.find((pl) => pl.id === planId);
    if (p) {
      setSelectedPlan(p);
      setForm((f) => ({ ...f, name: p.name, mobile: p.mobile, address: p.address }));
    } else {
      setSelectedPlan(null);
      setForm((f) => ({ ...f, name: "", mobile: "", address: "" }));
    }
  };

  const handleAdd = () => {
    if (!selectedPlan) { toast.danger("Select a plan first"); return; }
    if (!form.followupNote.trim()) { toast.danger("Followup note is required"); return; }
    setBatch((prev) => [...prev, { ...form, planId: selectedPlan.id, _id: Date.now() }]);
    setForm({ name: "", mobile: "", address: "", followupNote: "" });
    setSelectedPlan(null);
  };

  const handleSubmit = async () => {
    if (batch.length === 0) { toast.danger("Add at least one follow-up"); return; }
    setSubmitting(true);
    try {
      const wb = writeBatch(db);
      const now = Timestamp.now();
      batch.forEach((item) => {
        const ref = doc(collection(db, "reportfollowup"));
        wb.set(ref, {
          memberId: memberProfile.memberId,
          managerId: memberProfile.managerId,
          planId: item.planId,
          name: item.name,
          mobile: item.mobile,
          address: item.address,
          followupNote: item.followupNote,
          createdAt: now,
          date: now,
        });
      });
      await wb.commit();
      toast.success(`${batch.length} follow-up(s) submitted`);
      setBatch([]);
      setOpen(false);
    } catch {
      toast.danger("Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard
      icon={<GitBranch className="w-4 h-4 text-accent bg-white" />}
      title="Add Follow Up"
      subtitle="Track follow-ups on your plans"
      count={batch.length}
      open={open}
      setOpen={setOpen}
    >
      <BatchList
        items={batch}
        onRemove={(id) => setBatch((p) => p.filter((i) => i._id !== id))}
        renderLabel={(i) => `${i.name} · ${i.followupNote.slice(0, 25)}`}
      />

      <div className="bg-white">
        <label className="text-[10px]  font-semibold text-muted-foreground block mb-1">
          Select Plan
        </label>
        {loadingPlans ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background text-[12px] text-muted-foreground">
            <div className="w-3.5 h-3.5 border-2 border-border border-t-accent rounded-full animate-spin" />
            Loading plans...
          </div>
        ) : (
          <div className="bg-white">
            <SearchablePicker
              items={plans}
              value={selectedPlan?.id || ""}
              onChange={handleSelectPlan}
              placeholder="-- Select a Plan --"
              renderItem={(p) => (
                <div className="">
                  <p className="text-[12px] font-semibold text-foreground leading-tight">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.mobile}
                  </p>
                </div>
              )}
              getLabel={(p) => `${p.name} · ${p.mobile}`}
            />
          </div>
        )}
      </div>

      <FormFields
        form={form}
        setForm={setForm}
        fields={[
          { key: "name", label: "Name", readOnly: true },
          { key: "mobile", label: "Mobile", readOnly: true },
          { key: "address", label: "Address", readOnly: true },
        ]}
      />

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
          Followup Note
        </label>
        <textarea
          value={form.followupNote}
          onChange={(e) =>
            setForm((f) => ({ ...f, followupNote: e.target.value }))
          }
          rows={2}
          placeholder="Enter follow-up note..."
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
        />
      </div>

      <ActionRow
        onAdd={handleAdd}
        onSubmit={handleSubmit}
        count={batch.length}
        submitting={submitting}
        label="Follow-Ups"
      />
    </SectionCard>
  );
}
