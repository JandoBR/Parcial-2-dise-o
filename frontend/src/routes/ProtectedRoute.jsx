// src/routes/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { isAuthed } from "../authStorage";

export default function ProtectedRoute({ children }) {
    const loc = useLocation();
    if (!isAuthed()) {
        return <Navigate to="/auth/login" replace state={{ from: loc }} />;
    }
    return children;
}
