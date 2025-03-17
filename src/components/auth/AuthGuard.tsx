import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem("user");
    setIsAuthenticated(!!user);
  }, []);

  // Show nothing while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
};

export default AuthGuard;
