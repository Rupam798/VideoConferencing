import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ArrowRight, Video } from "lucide-react";

interface JoinMeetingCardProps {
  onJoinMeeting?: (meetingCode: string) => void;
}

const JoinMeetingCard = ({
  onJoinMeeting = () => {},
}: JoinMeetingCardProps) => {
  const [meetingCode, setMeetingCode] = useState("");
  const [error, setError] = useState("");

  const handleJoinMeeting = () => {
    if (!meetingCode.trim()) {
      setError("Please enter a meeting code");
      return;
    }

    setError("");
    onJoinMeeting(meetingCode);
  };

  return (
    <Card className="w-full max-w-[350px] h-[250px] bg-white flex flex-col justify-between">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-blue-100">
            <Video className="h-5 w-5 text-blue-600" />
          </div>
          <CardTitle className="text-lg">Join a Meeting</CardTitle>
        </div>
        <CardDescription>
          Enter a meeting code to join an existing conference
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            placeholder="Enter meeting code"
            value={meetingCode}
            onChange={(e) => setMeetingCode(e.target.value)}
            className="w-full"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleJoinMeeting}
          className="w-full flex items-center justify-center gap-2"
        >
          Join Meeting
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default JoinMeetingCard;
