import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Clock, History, Video } from "lucide-react";
import CreateMeetingCard from "./CreateMeetingCard";
import JoinMeetingCard from "./JoinMeetingCard";
import Header from "./layout/Header";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/auth");
    }
  }, [navigate]);

  const recentMeetings = [
    {
      id: "meet-123",
      name: "Weekly Team Sync",
      date: "Today, 10:00 AM",
      participants: 8,
      duration: "45 min",
    },
    {
      id: "meet-456",
      name: "Product Review",
      date: "Yesterday, 2:30 PM",
      participants: 5,
      duration: "60 min",
    },
    {
      id: "meet-789",
      name: "Client Presentation",
      date: "May 15, 9:00 AM",
      participants: 12,
      duration: "90 min",
    },
  ];

  const handleCreateMeeting = () => {
    const meetingId = Math.random().toString(36).substring(2, 10);
    navigate(`/meeting/${meetingId}`);
  };

  const handleJoinMeeting = (code) => {
    navigate(`/meeting/${code}`);
  };

  const handleJoinRecentMeeting = (id) => {
    navigate(`/meeting/${id}`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto py-12 px-4 animate-fadeIn">
        <div className="flex flex-col items-center mb-12">
          <div className="relative mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              Welcome, {user?.name || "User"}
            </h1>
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-center max-w-2xl text-lg leading-relaxed">
            Create or join virtual meetings with multiple participants, share
            your screen, and chat in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          <CreateMeetingCard onCreateMeeting={handleCreateMeeting} />
          <JoinMeetingCard onJoinMeeting={handleJoinMeeting} />
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="meetings" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="meetings" className="px-4">
                  Recent Meetings
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="px-4">
                  Scheduled Meetings
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="meetings" className="space-y-4">
              {recentMeetings.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {recentMeetings.map((meeting) => (
                    <Card
                      key={meeting.id}
                      className="bg-white dark:bg-gray-800 hover:shadow-lg transition-all duration-300 border-0 shadow-md overflow-hidden"
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg">
                              {meeting.name}
                            </h3>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <History className="h-4 w-4 mr-1" />
                              <span>{meeting.date}</span>
                              <span className="mx-2">•</span>
                              <span>{meeting.participants} participants</span>
                              <span className="mx-2">•</span>
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{meeting.duration}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleJoinRecentMeeting(meeting.id)}
                            className="text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300"
                          >
                            Rejoin
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-white dark:bg-gray-800 border-0 shadow-md overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600"></div>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 mr-3">
                        <History className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      No Recent Meetings
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      Your recent meetings will appear here once you create or
                      join a meeting.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4">
              <Card className="bg-white dark:bg-gray-800 border-0 shadow-md overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600"></div>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 mr-3">
                      <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    No Scheduled Meetings
                  </CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    You don't have any upcoming scheduled meetings. Create a new
                    meeting to get started.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleCreateMeeting}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Schedule a Meeting
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
