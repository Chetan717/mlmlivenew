import ProfileCard from "./components/ProfileCard";
import ApproveMembers from "./components/ApproveMembers";
import TeamReportView from "./components/TeamReportView";
import ReportGraph from "./components/ReportGraph";

export default function ManagerView({ profile }) {
  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <ReportGraph managerProfile={profile} />
      <ApproveMembers managerProfile={profile} />
      <TeamReportView managerProfile={profile} />
      <ProfileCard profile={profile} />
    </div>
  );
}
