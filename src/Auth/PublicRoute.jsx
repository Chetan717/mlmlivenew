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

export default function PublicRoute({ children }) {
  const raw = localStorage.getItem("usermlm");
  const valid = isValidUserSession(raw);

  if (valid) {
    return <Navigate to="/" replace />;
  }

  return children;
}
