import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Video } from "lucide-react";

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const user = localStorage.getItem("user");
    if (user) {
      navigate("/");
    }
  }, [navigate]);

  const handleAuthSuccess = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Video className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Video Conferencing Platform
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "login" | "signup")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <div className="mt-6">
            <TabsContent value="login">
              <LoginForm
                onSuccess={handleAuthSuccess}
                onSignUpClick={() => setActiveTab("signup")}
              />
            </TabsContent>
            <TabsContent value="signup">
              <SignUpForm
                onSuccess={handleAuthSuccess}
                onLoginClick={() => setActiveTab("login")}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default AuthPage;
