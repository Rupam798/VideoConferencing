import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import VideoGrid from "./VideoGrid";
import MeetingControls from "./MeetingControls";
import ChatPanel from "./ChatPanel";
import ParticipantsList from "./ParticipantsList";
import { useWebRTC } from "../hooks/useWebRTC";

interface MeetingRoomProps {
  meetingId?: string;
  onLeaveCall?: () => void;
}

const MeetingRoom: React.FC<MeetingRoomProps> = ({
  meetingId: propMeetingId,
  onLeaveCall,
}) => {
  const { meetingId: routeMeetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();

  // Use the meetingId from props if provided, otherwise use from route params
  const meetingId = propMeetingId || routeMeetingId || "ABC-123-XYZ";

  // Generate a stable user ID based on meeting ID to prevent fluctuations
  const userId = useMemo(() => {
    const randomId = Math.floor(Math.random() * 10000);
    return `user-${randomId}-${meetingId.substring(0, 5)}`;
  }, [meetingId]);

  // Default onLeaveCall handler that navigates back to home
  const handleLeaveCall = useCallback(() => {
    if (onLeaveCall) {
      onLeaveCall();
    } else {
      console.log("Leaving call...");
      navigate("/");
    }
  }, [onLeaveCall, navigate]);

  // Use WebRTC hook to manage video/audio streams and participants
  const {
    participants,
    localStream,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    isInitializing,
    error,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    removeParticipant,
  } = useWebRTC({
    roomId: meetingId,
    userId,
  });

  // Optimize audio output settings
  useEffect(() => {
    if (localStream) {
      // Use a more efficient selector for audio elements
      const audioElements = document.querySelectorAll(
        "audio, video",
      ) as NodeListOf<HTMLMediaElement>;

      // Batch DOM operations for better performance
      if (audioElements.length > 0) {
        // Use requestAnimationFrame for smoother UI updates
        requestAnimationFrame(() => {
          audioElements.forEach((el) => {
            // Set volume to moderate level to prevent feedback
            el.volume = 0.7;

            // Ensure playback is smooth
            if (el.tagName === "VIDEO") {
              el.playbackRate = 1.0;
            }

            // Set output device if supported
            if ("setSinkId" in el && typeof el.setSinkId === "function") {
              el.setSinkId("default").catch((err) =>
                console.warn("Cannot set audio output device", err),
              );
            }
          });
        });
      }
    }
  }, [localStream]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [layout, setLayout] = useState<"grid" | "spotlight">("grid");

  // Memoized toggle handlers to prevent unnecessary re-renders
  const handleToggleMic = useCallback(() => toggleMic(), [toggleMic]);
  const handleToggleCamera = useCallback(() => toggleCamera(), [toggleCamera]);

  const handleToggleScreenShare = useCallback(() => {
    toggleScreenShare();
    // When screen sharing is enabled, switch to spotlight view
    setLayout((prev) => (isScreenSharing ? "grid" : "spotlight"));
  }, [toggleScreenShare, isScreenSharing]);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
    // Close participants panel if opening chat
    setIsParticipantsOpen((prev) => (prev && !isChatOpen ? false : prev));
  }, [isChatOpen]);

  const handleToggleParticipants = useCallback(() => {
    setIsParticipantsOpen((prev) => !prev);
    // Close chat panel if opening participants
    setIsChatOpen((prev) => (prev && !isParticipantsOpen ? false : prev));
  }, [isParticipantsOpen]);

  // Memoize participant list for ParticipantsList component
  const participantsList = useMemo(
    () => [
      {
        id: "1",
        name: "You (Host)",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=you",
        isHost: true,
        isMuted: !isMicOn,
        isVideoOff: !isCameraOn,
      },
      ...participants
        .filter((p) => !p.isCurrentUser)
        .map((p) => ({
          id: p.id,
          name: p.name,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
          isMuted: !p.audioEnabled,
          isVideoOff: !p.videoEnabled,
        })),
    ],
    [participants, isMicOn, isCameraOn],
  );

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="flex h-screen w-full bg-gray-950 items-center justify-center text-white">
        <div className="bg-gray-800 p-8 rounded-lg max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold mb-2">Initializing Media</h2>
          <p className="text-gray-300">
            Setting up your camera and microphone...
          </p>
        </div>
      </div>
    );
  }

  // Show error message if camera/mic access failed
  if (error) {
    return (
      <div className="flex h-screen w-full bg-gray-950 items-center justify-center text-white">
        <div className="bg-gray-800 p-8 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-4">Camera/Microphone Error</h2>
          <p className="mb-6">{error}</p>
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => navigate("/")}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md"
            >
              Return to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md"
            >
              Retry Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-950 overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex flex-col relative">
        {/* Video grid takes most of the space */}
        <div className="flex-1 overflow-hidden">
          <VideoGrid
            participants={participants}
            layout={layout}
            className="pb-20" // Add padding at bottom for controls
          />
        </div>

        {/* Meeting controls fixed at bottom */}
        <MeetingControls
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          isScreenSharing={isScreenSharing}
          isChatOpen={isChatOpen}
          isParticipantsOpen={isParticipantsOpen}
          meetingCode={meetingId}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleChat={handleToggleChat}
          onToggleParticipants={handleToggleParticipants}
          onLeaveCall={handleLeaveCall}
        />
      </div>

      {/* Side panels */}
      {isChatOpen && (
        <div className="h-full">
          <ChatPanel
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            onSendMessage={(message) =>
              console.log("Sending message:", message)
            }
          />
        </div>
      )}

      {isParticipantsOpen && (
        <div className="h-full w-80">
          <ParticipantsList
            participants={participantsList}
            currentUserId="1"
            onMuteParticipant={(id) => console.log("Mute participant:", id)}
            onDisableVideo={(id) => console.log("Disable video:", id)}
            onRemoveParticipant={(id) => {
              // Map from the UI participant ID to the actual WebRTC participant ID
              // First try to find the participant by exact ID match
              let participantToRemove = participants.find(
                (p) => !p.isCurrentUser && p.id === id,
              );

              // If not found, try to match by the ID in the UI participant list
              if (!participantToRemove) {
                // Map from UI participant ID to actual WebRTC participant
                const participantIndex = participantsList.findIndex(
                  (p) => p.id === id,
                );
                if (
                  participantIndex >= 0 &&
                  participantIndex < participants.length
                ) {
                  participantToRemove = participants.find(
                    (p) => !p.isCurrentUser,
                  );
                }
              }

              if (participantToRemove) {
                removeParticipant(participantToRemove.id);
                console.log("Removed participant:", participantToRemove.id);
              } else {
                console.log("Participant not found:", id);
              }
            }}
            onMakeHost={(id) => console.log("Make host:", id)}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(MeetingRoom);
