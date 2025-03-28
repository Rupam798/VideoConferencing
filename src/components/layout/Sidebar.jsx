import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import {
  Home,
  Video,
  Calendar,
  Users,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      name: "Home",
      icon: <Home className="h-5 w-5" />,
      path: "/",
    },
    {
      name: "Meetings",
      icon: <Video className="h-5 w-5" />,
      path: "/dashboard",
    },
    {
      name: "Schedule",
      icon: <Calendar className="h-5 w-5" />,
      path: "/schedule",
    },
    {
      name: "Contacts",
      icon: <Users className="h-5 w-5" />,
      path: "/contacts",
    },
    {
      name: "Settings",
      icon: <Settings className="h-5 w-5" />,
      path: "/settings",
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/auth");
  };

  return (
    <div className="h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
      <div className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          VideoConf
        </span>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.name}
              variant={location.pathname === item.path ? "secondary" : "ghost"}
              className={`w-full justify-start ${location.pathname === item.path ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="mr-2">{item.icon}</span>
              {item.name}
            </Button>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start">
            <HelpCircle className="mr-2 h-5 w-5" />
            Help & Support
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Logout
          </Button>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>VideoConf v1.0.0</p>
          <p>© 2023 VideoConf Inc.</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
