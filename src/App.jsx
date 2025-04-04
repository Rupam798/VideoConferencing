import React from "react";
import { Routes, Route, useRoutes } from "react-router-dom";
import routes from "tempo-routes";
import Dashboard from "./components/Dashboard";
import MeetingLobby from "./components/meeting/MeetingLobby";
import AuthPage from "./components/auth/AuthPage";
import LandingPage from "./components/LandingPage";

function App() {
  // Ensure routes are properly loaded
  const tempoRoutes = import.meta.env.VITE_TEMPO ? useRoutes(routes) : null;

  return (
    <>
      {/* For the tempo routes */}
      {tempoRoutes}

      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/meeting/:meetingId" element={<MeetingLobby />} />
        <Route path="/" element={<LandingPage />} />

        {/* Add this before the catchall route */}
        {import.meta.env.VITE_TEMPO && <Route path="/tempobook/*" />}

        <Route path="*" element={<LandingPage />} />
      </Routes>
    </>
  );
}

export default App;
