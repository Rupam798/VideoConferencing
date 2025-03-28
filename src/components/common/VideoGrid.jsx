import React, { useEffect, useRef } from "react";
import { User, MicOff, VideoOff } from "lucide-react";

const VideoGrid = ({ participants = [] }) => {
  // Determine grid layout based on number of participants
  const getGridLayout = (count) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900">
      <div
        className={`grid ${getGridLayout(participants.length)} gap-4 h-full`}
      >
        {participants.map((participant) => (
          <VideoTile key={participant.id} participant={participant} />
        ))}
      </div>
    </div>
  );
};

const VideoTile = ({ participant }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-800 shadow-lg h-full flex items-center justify-center group">
      {participant.stream && !participant.isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isCurrentUser}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
          <div className="rounded-full bg-gray-600 p-8">
            <User className="h-12 w-12 text-gray-300" />
          </div>
        </div>
      )}

      {/* Status indicators */}
      <div className="absolute top-3 right-3 flex space-x-2">
        {participant.isMuted && (
          <div className="bg-red-500 p-1.5 rounded-full">
            <MicOff className="h-3.5 w-3.5 text-white" />
          </div>
        )}
        {participant.isVideoOff && (
          <div className="bg-red-500 p-1.5 rounded-full">
            <VideoOff className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>

      {/* Participant name */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center">
          <span className="text-white font-medium text-sm">
            {participant.name}
          </span>
          {participant.isHost && (
            <span className="ml-2 bg-yellow-500 text-xs px-1.5 py-0.5 rounded-full text-black font-medium">
              Host
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGrid;
