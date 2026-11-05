// src\tab\App.jsx
import { useEffect, useState } from "react";
import VehicleUploadPage from "./pages/VehicleUploadPage";
import Login from "./pages/Login";
import authService from "./services/authService";

function App() {
  const [authed, setAuthed] = useState(() => authService.isAuthenticated());

  // api.ts dispatches this when any request comes back 401 (token expired,
  // revoked, or the account was deactivated mid-shift) -- bounces back to
  // Login rather than leaving the operator stuck on a broken screen.
  useEffect(() => {
    const handleUnauthorized = () => setAuthed(false);
    window.addEventListener("extracto-tab-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("extracto-tab-unauthorized", handleUnauthorized);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setAuthed(false);
  };

  if (!authed) {
    return <Login onLoginSuccess={() => setAuthed(true)} />;
  }

  return <VehicleUploadPage onLogout={handleLogout} />;
}

export default App;
