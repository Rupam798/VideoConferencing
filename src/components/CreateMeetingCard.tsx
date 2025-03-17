import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Video, Plus } from "lucide-react";

interface CreateMeetingCardProps {
  onCreateMeeting?: () => void;
  title?: string;
  description?: string;
}

const CreateMeetingCard = ({
  onCreateMeeting = () => console.log("Create meeting clicked"),
  title = "Start a New Meeting",
  description = "Create an instant video meeting and invite others to join",
}: CreateMeetingCardProps) => {
  return (
    <Card className="w-[350px] h-[250px] bg-white shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-blue-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center pt-4">
        <div className="rounded-full bg-blue-100 p-6 mb-4">
          <Video className="h-10 w-10 text-blue-600" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button
          onClick={onCreateMeeting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Start New Meeting
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CreateMeetingCard;
