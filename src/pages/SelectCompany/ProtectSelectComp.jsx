import { Navigate } from "react-router";

export default function ProtectSelectComp({ children }) {
  const mlmProfile = localStorage.getItem("mlmProfile");

  // Already has a profile → no reason to be on /selectcomp
  if (mlmProfile) return <Navigate to="/" replace />;

  return children;
}