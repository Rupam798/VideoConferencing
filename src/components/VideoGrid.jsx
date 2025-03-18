import React, { useState, useEffect, useMemo, useCallback } from "react";
import VideoStream from "./VideoStream";

const VideoGrid = ({
  participants = [
    {
      id: "1",
      name: "You",
      videoEnabled: true,
      audioEnabled: true,
      isScreenSharing: false,
      isCurrentUser: true,
    },
    {
      id: "2",
      name: "John Doe",
      videoEnabled: true,
      audioEnabled: false,
      isScreenSharing: false,
      isCurrentUser: false,
    },
    {
      id: "3",
      name: "Jane Smith",
      videoEnabled: true,
      audioEnabled: true,
      isScreenSharing: false,
      isCurrentUser: false,
    },
    {
      id: "4",
      name: "Alex Johnson",
      videoEnabled: false,
      audioEnabled: true,
      isScreenSharing: false,
      isCurrentUser: false,
    },
  ],
  layout = "grid",
  className = "",
}) => {
  const [gridLayout, setGridLayout] = useState("");
  const [renderKey, setRenderKey] = useState(0);

  // Create a stable key for each participant to prevent unnecessary re-renders
  const getStableKey = useCallback((participant) => {
    return `${participant.id}-${participant.videoEnabled ? 1 : 0}-${participant.audioEnabled ? 1 : 0}-${participant.isScreenSharing ? 1 : 0}`;
  }, []);

  // Stabilize participants array with deep comparison of relevant properties
  const stableParticipants = useMemo(() => {
    // Create a stable reference that only changes when relevant properties change
    return participants.map((p) => ({
      ...p,
      // Ensure stream reference is stable unless tracks change
      stream: p.stream,
      // Create a stable key for each participant
      stableKey: getStableKey(p),
    }));
  }, [
    // Only depend on the serialized relevant properties
    participants.map(getStableKey).join(","),
    getStableKey,
  ]);

  // Force re-render every 30 seconds to recover from any stuck videos
  useEffect(() => {
    const interval = setInterval(() => {
      setRenderKey((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Determine grid layout based on number of participants
  useEffect(() => {
    const count = stableParticipants.length;
    if (count <= 1) {
      setGridLayout("grid-cols-1");
    } else if (count === 2) {
      setGridLayout("grid-cols-2");
    } else if (count <= 4) {
      setGridLayout("grid-cols-2");
    } else if (count <= 9) {
      setGridLayout("grid-cols-3");
    } else {
      setGridLayout("grid-cols-4");
    }
  }, [stableParticipants.length]);

  // Find the participant who is screen sharing (if any)
  const screenSharingParticipant = useMemo(() => {
    console.log(
      "VideoGrid participants:",
      stableParticipants.map((p) => ({
        id: p.id,
        name: p.name,
        hasStream: !!p.stream,
        videoEnabled: p.videoEnabled,
        audioEnabled: p.audioEnabled,
        isScreenSharing: p.isScreenSharing,
      })),
    );
    return stableParticipants.find((p) => p.isScreenSharing);
  }, [stableParticipants]);

  // Render spotlight layout (one main video, others smaller)
  if (layout === "spotlight" && stableParticipants.length > 1) {
    // Find the active speaker or screen sharing participant, default to first
    const spotlightParticipant =
      screenSharingParticipant || stableParticipants[0];
    const otherParticipants = stableParticipants.filter(
      (p) => p.id !== spotlightParticipant.id,
    );

    return (
      <div
        className={`w-full h-full bg-gray-950 p-4 ${className}`}
        key={`spotlight-container-${renderKey}`}
      >
        <div className="h-3/4 mb-2 rounded-lg overflow-hidden">
          <VideoStream
            key={`spotlight-${spotlightParticipant.id}-${spotlightParticipant.stableKey}`}
            stream={spotlightParticipant.stream}
            isMuted={!spotlightParticipant.audioEnabled}
            isVideoOff={!spotlightParticipant.videoEnabled}
            isScreenSharing={spotlightParticipant.isScreenSharing}
            name={`${spotlightParticipant.name}${spotlightParticipant.isCurrentUser ? " (You)" : ""}`}
            className="w-full h-full"
          />
        </div>
        <div className="h-1/4 grid grid-flow-col auto-cols-fr gap-2 overflow-x-auto">
          {otherParticipants.map((participant) => (
            <div
              key={`thumbnail-container-${participant.id}`}
              className="rounded-lg overflow-hidden"
            >
              <VideoStream
                key={`thumbnail-${participant.id}-${participant.stableKey}`}
                stream={participant.stream}
                isMuted={!participant.audioEnabled}
                isVideoOff={!participant.videoEnabled}
                isScreenSharing={participant.isScreenSharing}
                name={`${participant.name}${participant.isCurrentUser ? " (You)" : ""}`}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render standard grid layout with optimized rendering
  return (
    <div
      className={`w-full h-full bg-gradient-to-b from-gray-950 to-gray-900 dark:from-gray-900 dark:to-black p-4 ${className}`}
      key={`grid-container-${renderKey}`}
    >
      {stableParticipants.length === 0 ? (
        <div className="flex items-center justify-center h-full text-white">
          <div className="text-center">
            <p className="text-xl mb-2">Waiting for participants to join...</p>
            <p className="text-sm text-gray-400">
              Share your meeting code to invite others
            </p>
          </div>
        </div>
      ) : (
        <div className={`grid ${gridLayout} gap-4 h-full`}>
          {stableParticipants.map((participant) => (
            <div
              key={`grid-container-${participant.id}`}
              className="rounded-lg overflow-hidden"
            >
              <VideoStream
                key={`grid-${participant.id}-${participant.stableKey}`}
                stream={participant.stream}
                isMuted={!participant.audioEnabled}
                isVideoOff={!participant.videoEnabled}
                isScreenSharing={participant.isScreenSharing}
                name={`${participant.name}${participant.isCurrentUser ? " (You)" : ""}`}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(VideoGrid);
