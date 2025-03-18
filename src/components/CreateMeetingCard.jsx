import React from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Video } from "lucide-react";

const CreateMeetingCard = ({ onCreateMeeting = () => {} }) => {
  return (
    <Card className="bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-lg overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center">
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 mr-3">
            <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          Start a Meeting
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Create a new meeting and invite others to join
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onCreateMeeting}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
        >
          New Meeting
        </Button>
      </CardContent>
    </Card>
  );
};

export default CreateMeetingCard;
