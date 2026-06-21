import { useState } from "react";
import { db } from "../../Firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { generateManagerId, generateMemberId } from "./utils/reportIds";
import { UserPlus, Users, User, ChevronDown } from "lucide-react";
import { toast } from "@heroui/react";
import { COLLECTIONS } from "../../collections";

const NAME_MAX = 100;
const ADDRESS_MAX = 300;
const MANAGER_ID_MAX = 20;
const MOBILE_MAX = 10;

function sanitizeText(str) {
  return String(str || "").trim().slice(0, NAME_MAX);
}

export default function CreateProfile({ userMobile, userName, onProfileCreated }) {
  const [role, setRole] = useState("Manager");
  const [form, setForm] = useState({
    name: (userName || "").slice(0, NAME_MAX),
    mobile: (userMobile || "").slice(0, MOBILE_MAX),
    address: "",
    managerId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name    = sanitizeText(form.name);
    const address = String(form.address || "").trim().slice(0, ADDRESS_MAX);
    const mobile  = String(form.mobile || "").trim().slice(0, MOBILE_MAX);
    const managerId = String(form.managerId || "").trim().toUpperCase().slice(0, MANAGER_ID_MAX);

    if (!name || name.length < 2) {
      toast.danger("Name must be at least 2 characters");
      return;
    }
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      toast.danger("Valid 10-digit mobile number is required");
      return;
    }
    if (!address) {
      toast.danger("Address is required");
      return;
    }
    if (role === "Team Member" && !managerId) {
      toast.danger("Manager ID is required for Team Members");
      return;
    }
    if (role === "Team Member" && !/^[A-Z0-9]{5,20}$/.test(managerId)) {
      toast.danger("Manager ID must be 5–20 alphanumeric characters");
      return;
    }

    setSubmitting(true);
    try {
      let docData;
      if (role === "Manager") {
        const mgrid = generateManagerId(name, mobile);
        docData = {
          name,
          mobile,
          address,
          role: "Manager",
          managerId: mgrid,
          userMobile: userMobile,
          createdAt: Timestamp.now(),
        };
      } else {
        const memid = generateMemberId(name, mobile);
        docData = {
          name,
          mobile,
          address,
          role: "Team Member",
          managerId,
          memberId: memid,
          approvedByManager: false,
          userMobile: userMobile,
          createdAt: Timestamp.now(),
        };
      }

      const ref = await addDoc(collection(db, COLLECTIONS.REPORTINGUSER), docData);
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
          style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}>
          <UserPlus className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-[22px] font-bold text-foreground">Create Reporting Profile</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Set up your profile to start using the reporting feature</p>
      </div>

      <div className="flex gap-2 mb-5 p-1 bg-muted/40 rounded-2xl">
        {["Manager", "Team Member"].map((r) => (
          <button key={r} onClick={() => setRole(r)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all ${role === r ? "bg-white dark:bg-gray-800 shadow text-foreground" : "text-muted-foreground"}`}>
            {r === "Manager" ? <><Users className="inline w-4 h-4 mr-1.5" />Manager</> : <><User className="inline w-4 h-4 mr-1.5" />Team Member</>}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Full Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.slice(0, NAME_MAX) }))}
            placeholder="Enter your full name"
            maxLength={NAME_MAX}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-[14px] outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Mobile Number</label>
          <input
            type="tel"
            value={form.mobile}
            onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g,"").slice(0, MOBILE_MAX) }))}
            placeholder="10-digit mobile"
            maxLength={MOBILE_MAX}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-[14px] outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Address</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value.slice(0, ADDRESS_MAX) }))}
            placeholder="Enter your address"
            maxLength={ADDRESS_MAX}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-[14px] outline-none focus:ring-2 focus:ring-accent/30 resize-none"
          />
        </div>
        {role === "Team Member" && (
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Manager ID</label>
            <input
              type="text"
              value={form.managerId}
              onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value.replace(/[^a-zA-Z0-9]/g,"").toUpperCase().slice(0, MANAGER_ID_MAX) }))}
              placeholder="e.g. MNJOHND12345"
              maxLength={MANAGER_ID_MAX}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-[14px] outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl text-white text-[14px] font-bold disabled:opacity-60 mt-2"
          style={{ background: "linear-gradient(135deg,#0088DA,#0088DA)" }}>
          {submitting ? "Creating..." : "Create Profile"}
        </button>
      </form>
    </div>
  );
}
