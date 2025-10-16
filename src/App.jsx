// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute"; // ya lo tienes
import AppHome from "./pages/AppHome.jsx";           // el que pegaste
import Invite from "./pages/Invite.jsx";             // el que pegaste
import Login from "./pages/AuthLogin.jsx";
import AuthRegister from "./pages/AuthRegister.jsx";

export default function App() {
  return (
    <Routes>
      {/* públicas */}
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/register" element={<AuthRegister />} />
      <Route path="/invite/:token" element={<Invite />} />

      {/* protegidas */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppHome />
          </ProtectedRoute>
        }
      />

      {/* alias opcional */}
      <Route path="/app" element={<Navigate to="/" replace />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
