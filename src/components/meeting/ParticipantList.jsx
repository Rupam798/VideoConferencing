import React, { useState } from "react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  MicOff,
  Video,
  VideoOff,
  Mic,
  Crown,
  MoreVertical,
  Users,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const ParticipantList = ({
  participants = [],
  currentUserId,
  onMuteParticipant = () => {},
  onDisableVideo = () => {},
  onRemoveParticipant = () => {},
  onMakeHost = () => {},
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredParticipants = participants.filter((participant) =>
    participant.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
        <h2 className="text-xl font-semibold mb-2 flex items-center">
          <Users className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
          Participants ({participants.length})
        </h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search participants..."
            className="w-full p-2 pl-8 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent shadow-sm transition-colors duration-200"
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
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 mb-1 shadow-sm hover:shadow-md"
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

export default ParticipantList;
