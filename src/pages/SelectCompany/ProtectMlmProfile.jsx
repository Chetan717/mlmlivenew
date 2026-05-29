import { Navigate } from "react-router";

export default function ProtectMlmProfile({ children }) {
  const mlmProfile = localStorage.getItem("mlmProfile");
  const selectedCompany = localStorage.getItem("selectedCompany");

  // Profile already exists → no need to pick a company
  if (mlmProfile) return children;

  // No profile yet but company is selected → let them create profile
  if (selectedCompany) return children;

  // Neither → force company selection first
  return <Navigate to="/selectcomp" replace />;
}
