import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { LogIn } from "lucide-react";

const JoinMeetingCard = ({ onJoinMeeting = () => {} }) => {
  const [meetingCode, setMeetingCode] = useState("");

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    if (meetingCode.trim()) {
      onJoinMeeting(meetingCode.trim());
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-lg overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center">
          <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mr-3">
            <LogIn className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          Join a Meeting
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Enter a meeting code to join an existing meeting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleJoinMeeting} className="space-y-4">
          <Input
            type="text"
            placeholder="Enter meeting code"
            value={meetingCode}
            onChange={(e) => setMeetingCode(e.target.value)}
            className="w-full border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
          />
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
            disabled={!meetingCode.trim()}
          >
            Join Meeting
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default JoinMeetingCard;
