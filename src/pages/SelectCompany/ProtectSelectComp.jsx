import { Navigate } from "react-router";

function isValidUserSession(raw) {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return (
      parsed !== null &&
      typeof parsed === "object" &&
      typeof parsed.mobileNo === "string" &&
      /^[0-9]{10}$/.test(parsed.mobileNo)
    );
  } catch {
    return false;
  }
}

export default function ProtectSelectComp({ children }) {
  const validUser   = isValidUserSession(localStorage.getItem("usermlm"));
  const mlmProfile  = localStorage.getItem("mlmProfile");

  if (validUser && mlmProfile) return <Navigate to="/" replace />;

  return children;
}
