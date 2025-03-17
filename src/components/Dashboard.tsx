import React, { useState, useEffect } from "react";
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
import Header from "./Header";

interface MeetingHistoryItem {
  id: string;
  name: string;
  date: string;
  participants: number;
  duration: string;
}

interface User {
  name: string;
  email: string;
}

interface DashboardProps {
  recentMeetings?: MeetingHistoryItem[];
  onCreateMeeting?: () => void;
  onJoinMeeting?: (meetingCode: string) => void;
  onJoinRecentMeeting?: (meetingId: string) => void;
}

const Dashboard = ({
  recentMeetings = [
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
  ],
  onCreateMeeting = () => console.log("Create meeting clicked"),
  onJoinMeeting = (code: string) =>
    console.log(`Joining meeting with code: ${code}`),
  onJoinRecentMeeting = (id: string) =>
    console.log(`Joining recent meeting: ${id}`),
}: DashboardProps) => {
  const [activeTab, setActiveTab] = useState("meetings");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            Welcome, {user?.name || "User"}
          </h1>
          <p className="text-gray-600 text-center max-w-2xl">
            Create or join virtual meetings with multiple participants, share
            your screen, and chat in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          <CreateMeetingCard onCreateMeeting={onCreateMeeting} />
          <JoinMeetingCard onJoinMeeting={onJoinMeeting} />
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs
            defaultValue="meetings"
            className="w-full"
            onValueChange={setActiveTab}
          >
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
                      className="bg-white hover:shadow-md transition-shadow"
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
                            onClick={() => onJoinRecentMeeting(meeting.id)}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            Rejoin
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle>No Recent Meetings</CardTitle>
                    <CardDescription>
                      Your recent meetings will appear here once you create or
                      join a meeting.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>No Scheduled Meetings</CardTitle>
                  <CardDescription>
                    You don't have any upcoming scheduled meetings. Create a new
                    meeting to get started.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={onCreateMeeting}
                    className="bg-blue-600 hover:bg-blue-700"
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
