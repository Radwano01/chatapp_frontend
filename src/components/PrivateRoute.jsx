import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
  return currentUser ? children : <Navigate to="/login" />;
}