import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Video, LogIn } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const CreateMeeting = ({
  onCreateMeeting = () => {},
  onJoinMeeting = () => {},
}) => {
  const [meetingCode, setMeetingCode] = useState("");

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    if (meetingCode.trim()) {
      onJoinMeeting(meetingCode.trim());
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden w-full">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="create" className="text-center py-3">
            Create Meeting
          </TabsTrigger>
          <TabsTrigger value="join" className="text-center py-3">
            Join Meeting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 mr-3">
              <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-medium">Start a Meeting</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create a new meeting and invite others to join
              </p>
            </div>
          </div>

          <Button
            onClick={onCreateMeeting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-300 py-6 text-lg"
          >
            New Meeting
          </Button>
        </TabsContent>

        <TabsContent value="join" className="p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mr-3">
              <LogIn className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-medium">Join a Meeting</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter a meeting code to join an existing meeting
              </p>
            </div>
          </div>

          <form onSubmit={handleJoinMeeting} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter meeting code"
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
              className="w-full border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent py-6 text-lg"
            />
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-300 py-6 text-lg"
              disabled={!meetingCode.trim()}
            >
              Join Meeting
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default CreateMeeting;
