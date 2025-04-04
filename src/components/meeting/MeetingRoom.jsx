import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MeetingControls from "./MeetingControls";
import ChatPanel from "./ChatPanel";
import ParticipantList from "./ParticipantList";
import VideoGrid from "../common/VideoGrid";
import useWebRTC from "../../hooks/useWebRTC";

const MeetingRoom = ({ meetingId, onLeaveCall, initialSettings }) => {
  const navigate = useNavigate();
  const [isMicOn, setIsMicOn] = useState(initialSettings?.isMicEnabled ?? true);
  const [isCameraOn, setIsCameraOn] = useState(
    initialSettings?.isVideoEnabled ?? true,
  );
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [userName, setUserName] = useState(initialSettings?.userName || "");

  // Generate a random user ID if not provided
  const userId =
    initialSettings?.userId || Math.random().toString(36).substring(2, 9);

  // Get WebRTC hook
  const {
    localStream,
    participants,
    error: webRTCError,
    isInitializing,
    isMicOn: webRTCMicOn,
    isCameraOn: webRTCCameraOn,
    isScreenSharing: webRTCScreenSharing,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    removeParticipant,
  } = useWebRTC({
    roomId: meetingId,
    userId: userId,
    userName: userName || "You",
    initialAudioEnabled: isMicOn,
    initialVideoEnabled: isCameraOn,
  });

  // Debug logging for WebRTC state
  useEffect(() => {
    console.log("WebRTC state:", {
      localStream: !!localStream,
      participantsCount: participants.length,
      error: webRTCError,
      isInitializing,
      isMicOn: webRTCMicOn,
      isCameraOn: webRTCCameraOn,
    });

    if (webRTCError) {
      console.error("WebRTC Error:", webRTCError);
    }

    if (localStream) {
      console.log("Local stream tracks:", {
        audioTracks: localStream.getAudioTracks().length,
        videoTracks: localStream.getVideoTracks().length,
        audioEnabled: localStream
          .getAudioTracks()
          .some((track) => track.enabled),
        videoEnabled: localStream
          .getVideoTracks()
          .some((track) => track.enabled),
      });
    }
  }, [
    localStream,
    participants,
    webRTCError,
    isInitializing,
    webRTCMicOn,
    webRTCCameraOn,
  ]);

  useEffect(() => {
    // Get user from localStorage if not provided in initialSettings
    if (!userName) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserName(user.name || "");
      }
    }
  }, [userName]);

  // Convert WebRTC participants to the format expected by our components
  const formattedParticipants = participants.map((p) => {
    // Debug logging for participant streams
    if (p.isCurrentUser) {
      console.log("Current user stream details:", {
        id: p.id,
        hasStream: !!p.stream,
        videoTracks: p.stream ? p.stream.getVideoTracks().length : 0,
        audioTracks: p.stream ? p.stream.getAudioTracks().length : 0,
        videoEnabled: p.videoEnabled,
        audioEnabled: p.audioEnabled,
      });
    }

    return {
      id: p.id,
      name: p.isCurrentUser ? `${p.name || "You"} (You)` : p.name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
      isHost: p.isCurrentUser,
      isMuted: !p.audioEnabled,
      isVideoOff: !p.videoEnabled,
      streamId: p.id,
      stream: p.stream,
      isCurrentUser: p.isCurrentUser,
      videoEnabled: p.videoEnabled,
      audioEnabled: p.audioEnabled,
    };
  });

  // For demo purposes, ensure we have at least one participant
  if (formattedParticipants.length === 0) {
    formattedParticipants.push({
      id: "demo-user",
      name: "You (Demo)",
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=demo`,
      isHost: true,
      isMuted: !isMicOn,
      isVideoOff: !isCameraOn,
      streamId: "demo-user",
      stream: localStream,
      isCurrentUser: true,
    });
  }

  const handleToggleMic = () => {
    setIsMicOn(!isMicOn);
    toggleMic();
  };

  const handleToggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    toggleCamera();
  };

  const handleToggleScreenShare = async () => {
    const success = await toggleScreenShare();
    if (success) {
      setIsScreenSharing(!isScreenSharing);
    }
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) setIsParticipantsOpen(false);
  };

  const handleToggleParticipants = () => {
    setIsParticipantsOpen(!isParticipantsOpen);
    if (!isParticipantsOpen) setIsChatOpen(false);
  };

  const handleLeaveCall = () => {
    if (onLeaveCall) {
      onLeaveCall();
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-b from-gray-950 to-gray-900 dark:from-gray-900 dark:to-black overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex flex-col relative">
        {/* Video grid */}
        <div className="flex-1 overflow-hidden bg-gray-900 dark:bg-gray-800">
          {webRTCError ? (
            <div className="flex items-center justify-center h-full text-white">
              <p className="text-xl">{webRTCError}</p>
            </div>
          ) : (
            <VideoGrid participants={formattedParticipants} />
          )}
        </div>

        {/* Meeting controls */}
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
          <ParticipantList
            participants={formattedParticipants}
            currentUserId={userId}
            onMuteParticipant={(id) => console.log("Mute participant:", id)}
            onDisableVideo={(id) => console.log("Disable video:", id)}
            onRemoveParticipant={(id) => removeParticipant(id)}
            onMakeHost={(id) => console.log("Make host:", id)}
          />
        </div>
      )}
    </div>
  );
};

export default MeetingRoom;
