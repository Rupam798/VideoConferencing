import React from "react";
import Dashboard from "./Dashboard";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const handleCreateMeeting = () => {
    // Generate a random meeting ID
    const meetingId = Math.random().toString(36).substring(2, 10);
    navigate(`/meeting/${meetingId}`);
  };

  const handleJoinMeeting = (meetingCode: string) => {
    navigate(`/meeting/${meetingCode}`);
  };

  const handleJoinRecentMeeting = (meetingId: string) => {
    navigate(`/meeting/${meetingId}`);
  };

  // Sample recent meetings data
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

  return (
    <div className="bg-gray-50 min-h-screen">
      <Dashboard
        recentMeetings={recentMeetings}
        onCreateMeeting={handleCreateMeeting}
        onJoinMeeting={handleJoinMeeting}
        onJoinRecentMeeting={handleJoinRecentMeeting}
      />
    </div>
  );
};

export default Home;
