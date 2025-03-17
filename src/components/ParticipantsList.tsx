import React, { useState } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  MicOff,
  Video,
  VideoOff,
  Mic,
  Crown,
  MoreVertical,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isHost?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

interface ParticipantsListProps {
  participants?: Participant[];
  currentUserId?: string;
  onMuteParticipant?: (id: string) => void;
  onDisableVideo?: (id: string) => void;
  onRemoveParticipant?: (id: string) => void;
  onMakeHost?: (id: string) => void;
}

const ParticipantsList = ({
  participants = [
    {
      id: "1",
      name: "John Doe",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
      isHost: true,
      isMuted: false,
      isVideoOff: false,
    },
    {
      id: "2",
      name: "Jane Smith",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
      isMuted: true,
      isVideoOff: false,
    },
    {
      id: "3",
      name: "Bob Johnson",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
      isMuted: false,
      isVideoOff: true,
    },
    {
      id: "4",
      name: "Alice Williams",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
      isMuted: true,
      isVideoOff: true,
    },
    {
      id: "5",
      name: "Charlie Brown",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie",
      isMuted: false,
      isVideoOff: false,
    },
  ],
  currentUserId = "1",
  onMuteParticipant = () => {},
  onDisableVideo = () => {},
  onRemoveParticipant = () => {},
  onMakeHost = () => {},
}: ParticipantsListProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredParticipants = participants.filter((participant) =>
    participant.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-2">
          Participants ({participants.length})
        </h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search participants..."
            className="w-full p-2 pl-8 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg
            className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {filteredParticipants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage
                    src={participant.avatar}
                    alt={participant.name}
                  />
                  <AvatarFallback>
                    {participant.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">{participant.name}</span>
                    {participant.id === currentUserId && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        You
                      </Badge>
                    )}
                    {participant.isHost && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="ml-2">
                              <Crown className="h-4 w-4 text-yellow-500" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Meeting Host</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="flex space-x-1 mt-1">
                    {participant.isMuted && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <MicOff className="h-3.5 w-3.5 text-gray-500" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Microphone Off</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {participant.isVideoOff && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <VideoOff className="h-3.5 w-3.5 text-gray-500" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Camera Off</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              </div>

              {currentUserId === participants.find((p) => p.isHost)?.id &&
                participant.id !== currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onMuteParticipant(participant.id)}
                      >
                        {participant.isMuted ? (
                          <>
                            <Mic className="mr-2 h-4 w-4" />
                            <span>Unmute</span>
                          </>
                        ) : (
                          <>
                            <MicOff className="mr-2 h-4 w-4" />
                            <span>Mute</span>
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDisableVideo(participant.id)}
                      >
                        {participant.isVideoOff ? (
                          <>
                            <Video className="mr-2 h-4 w-4" />
                            <span>Enable video</span>
                          </>
                        ) : (
                          <>
                            <VideoOff className="mr-2 h-4 w-4" />
                            <span>Disable video</span>
                          </>
                        )}
                      </DropdownMenuItem>
                      {!participant.isHost && (
                        <DropdownMenuItem
                          onClick={() => onMakeHost(participant.id)}
                        >
                          <Crown className="mr-2 h-4 w-4" />
                          <span>Make host</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => onRemoveParticipant(participant.id)}
                      >
                        <span>Remove from meeting</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ParticipantsList;
