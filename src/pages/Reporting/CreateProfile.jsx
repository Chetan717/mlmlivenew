import { useState } from "react";
import { db } from "../../Firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { generateManagerId, generateMemberId } from "./utils/reportIds";
import { UserPlus, Users, User, ChevronDown } from "lucide-react";
import {toast} from "@heroui/react"

export default function CreateProfile({ userMobile, userName, onProfileCreated }) {
  const [role, setRole] = useState("Manager");
  const [form, setForm] = useState({
    name: userName || "",
    mobile: userMobile || "",
    address: "",
    managerId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim() || !form.address.trim()) {
      toast.danger("All fields are required"); return;
    }
    if (role === "Team Member" && !form.managerId.trim()) {
      toast.danger("Manager ID is required for Team Members"); return;
    }

    setSubmitting(true);
    try {
      let docData;
      if (role === "Manager") {
        const managerId = generateManagerId(form.name, form.mobile);
        docData = {
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          address: form.address.trim(),
          role: "Manager",
          managerId,
          userMobile: userMobile,
          createdAt: Timestamp.now(),
        };
      } else {
        const memberId = generateMemberId(form.name, form.mobile);
        docData = {
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          address: form.address.trim(),
          role: "Team Member",
          managerId: form.managerId.trim().toUpperCase(),
          memberId,
          approvedByManager: false,
          userMobile: userMobile,
          createdAt: Timestamp.now(),
        };
      }

      const ref = await addDoc(collection(db, "reportingUser"), docData);
      toast.success("Profile created successfully!");
      onProfileCreated({ id: ref.id, ...docData });
    } catch (err) {
      console.error(err);
      toast.danger("Failed to create profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-[22px] flex items-center justify-center mx-auto mb-3 shadow-lg"
          style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}>
          <UserPlus className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-[22px] font-bold text-foreground">Create Reporting Profile</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Set up your profile to start using the reporting feature</p>
      </div>

      <div className="flex gap-2 mb-5 p-1 bg-muted/40 rounded-2xl">
        {["Manager", "Team Member"].map((r) => (
          <button key={r} onClick={() => setRole(r)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200"
            style={role === r
              ? { background: "linear-gradient(135deg,#0e245c,#1a3a8a)", color: "white" }
              : { color: "var(--muted-foreground)" }}>
            {r === "Manager" ? <User className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
            {r}
          </button>
        ))}
      </div>

      {role === "Manager" && (
        <div className="mb-4 p-3 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <p className="text-[11px] text-green-700 dark:text-green-400 font-medium">
            As a Manager, you will get a unique Manager ID that your team members will use to link their profiles to you.
          </p>
        </div>
      )}

      {role === "Team Member" && (
        <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
            As a Team Member, enter your Manager's ID to link your profile. Your manager will approve your membership.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Full Name" required>
          <input type="text" placeholder="Enter your full name" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors" />
        </Field>

        <Field label="Mobile Number" required>
          <input type="tel" placeholder="10-digit mobile number" value={form.mobile}
            onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors" />
        </Field>

        <Field label="Address" required>
          <textarea rows={2} placeholder="Your address" value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-none" />
        </Field>

        {role === "Team Member" && (
          <Field label="Manager ID" required hint="Get this ID from your manager">
            <input type="text" placeholder="e.g. MNRAHUL12345" value={form.managerId}
              onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] font-mono uppercase focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors" />
          </Field>
        )}

        {role === "Manager" && (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">Your Manager ID will be auto-generated as:</p>
            <p className="text-[14px] font-bold font-mono text-accent">
              {form.name && form.mobile
                ? generateManagerId(form.name, form.mobile)
                : "MN_____XXXXX"}
            </p>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full py-3.5 rounded-2xl text-white text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity mt-2"
          style={{ background: "linear-gradient(135deg,#0e245c,#1a3a8a)" }}>
          {submitting
            ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <><UserPlus className="w-4 h-4" /> Create Profile</>}
        </button>
      </form>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
        {hint && <span className="font-normal text-[10px] ml-1 text-accent">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}
