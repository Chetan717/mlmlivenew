import { Navigate } from "react-router";

export default function PublicRoute({ children }) {
  const token = localStorage.getItem("usermlm");

  // If logged in, block access to login/signup → redirect home
  if (token) {
    return <Navigate to="/" replace />;
  }

  return children;
}