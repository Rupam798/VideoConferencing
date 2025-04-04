import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Video, ArrowRight } from "lucide-react";
import PreMeetingSettings from "./PreMeetingSettings";
import MeetingRoom from "./MeetingRoom";

const MeetingLobby = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [isJoined, setIsJoined] = useState(false);
  const [meetingSettings, setMeetingSettings] = useState(null);

  const handleJoinMeeting = (settings) => {
    setMeetingSettings(settings);
    setIsJoined(true);
  };

  const handleLeaveMeeting = () => {
    setIsJoined(false);
    navigate("/");
  };

  if (isJoined) {
    return (
      <MeetingRoom
        meetingId={meetingId}
        onLeaveCall={handleLeaveMeeting}
        initialSettings={meetingSettings}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <Video className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            Join Meeting
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Meeting ID: {meetingId}
          </p>
        </div>

        <PreMeetingSettings onJoinMeeting={handleJoinMeeting} />
      </div>
    </div>
  );
};

export default MeetingLobby;
