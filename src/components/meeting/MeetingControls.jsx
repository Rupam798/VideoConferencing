import React, { useState } from "react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  MonitorOff,
  MessageSquare,
  Users,
  PhoneOff,
  Settings,
  Share2,
  Palette,
} from "lucide-react";
import StyleToggle from "../common/StyleToggle";

const MeetingControls = ({
  onToggleMic = () => {},
  onToggleCamera = () => {},
  onToggleScreenShare = () => {},
  onToggleChat = () => {},
  onToggleParticipants = () => {},
  onLeaveCall = () => {},
  isMicOn = true,
  isCameraOn = true,
  isScreenSharing = false,
  isChatOpen = false,
  isParticipantsOpen = false,
  meetingCode = "ABC-123-XYZ",
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border p-4 flex items-center justify-center gap-2 z-10">
      <div className="flex items-center justify-center gap-2 md:gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full shadow-md hover:shadow-lg transition-all duration-300 ${!isMicOn ? "bg-red-100 text-red-500 hover:bg-red-200 hover:text-red-600 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-800/40" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                onClick={onToggleMic}
              >
                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isMicOn ? "Mute microphone" : "Unmute microphone"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full shadow-md hover:shadow-lg transition-all duration-300 ${!isCameraOn ? "bg-red-100 text-red-500 hover:bg-red-200 hover:text-red-600 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-800/40" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                onClick={onToggleCamera}
              >
                {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isCameraOn ? "Turn off camera" : "Turn on camera"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full shadow-md hover:shadow-lg transition-all duration-300 ${isScreenSharing ? "bg-green-100 text-green-500 hover:bg-green-200 hover:text-green-600 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-800/40" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                onClick={onToggleScreenShare}
              >
                {isScreenSharing ? (
                  <MonitorOff size={20} />
                ) : (
                  <ScreenShare size={20} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isScreenSharing ? "Stop sharing screen" : "Share screen"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full shadow-md hover:shadow-lg transition-all duration-300 ${isChatOpen ? "bg-blue-100 text-blue-500 hover:bg-blue-200 hover:text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-800/40" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                onClick={onToggleChat}
              >
                <MessageSquare size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full shadow-md hover:shadow-lg transition-all duration-300 ${isParticipantsOpen ? "bg-blue-100 text-blue-500 hover:bg-blue-200 hover:text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-800/40" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                onClick={onToggleParticipants}
              >
                <Users size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Participants</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Share2 size={20} />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share meeting invitation</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <p className="mb-2">Share this meeting code with others:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={meetingCode}
                  readOnly
                  className="flex-1 p-2 border rounded-md bg-muted"
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(meetingCode);
                    // In a real app, you would show a toast notification here
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Settings size={20} />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Meeting Settings</DialogTitle>
            </DialogHeader>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Audio Settings</h3>
                <select className="w-full p-2 border rounded-md bg-background">
                  <option>Default Microphone</option>
                  <option>Headset Microphone</option>
                </select>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Video Settings</h3>
                <select className="w-full p-2 border rounded-md bg-background">
                  <option>Default Camera</option>
                  <option>External Webcam</option>
                </select>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Speaker Settings</h3>
                <select className="w-full p-2 border rounded-md bg-background">
                  <option>Default Speaker</option>
                  <option>External Speaker</option>
                </select>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <StyleToggle />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                onClick={onLeaveCall}
              >
                <PhoneOff size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Leave meeting</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default MeetingControls;
