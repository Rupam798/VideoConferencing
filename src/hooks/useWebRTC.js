import { useState, useEffect, useRef, useCallback } from "react";
import Peer from "simple-peer";
import { ensureGlobalPolyfill } from "../lib/utils";

// Enhanced in-memory signaling with reliability improvements
const SIGNALING_CHANNELS = {};
const PENDING_MESSAGES = {};

function joinSignalingChannel(roomId, callback) {
  if (!SIGNALING_CHANNELS[roomId]) {
    SIGNALING_CHANNELS[roomId] = new Set();
  }
  SIGNALING_CHANNELS[roomId].add(callback);

  // Deliver any pending messages for this peer
  if (PENDING_MESSAGES[roomId] && callback.senderId) {
    const pendingForPeer = PENDING_MESSAGES[roomId].filter(
      (msg) => msg.receiverId === callback.senderId || !msg.receiverId,
    );

    if (pendingForPeer.length > 0) {
      console.log(
        `Delivering ${pendingForPeer.length} pending messages to peer ${callback.senderId}`,
      );
      pendingForPeer.forEach((msg) => callback(msg));

      // Remove delivered messages
      PENDING_MESSAGES[roomId] = PENDING_MESSAGES[roomId].filter(
        (msg) => !(msg.receiverId === callback.senderId || !msg.receiverId),
      );
    }
  }

  return () => {
    SIGNALING_CHANNELS[roomId]?.delete(callback);
    if (SIGNALING_CHANNELS[roomId]?.size === 0) {
      delete SIGNALING_CHANNELS[roomId];
      delete PENDING_MESSAGES[roomId];
    }
  };
}

function sendSignal(roomId, message) {
  let delivered = false;

  if (SIGNALING_CHANNELS[roomId]) {
    SIGNALING_CHANNELS[roomId].forEach((callback) => {
      // Don't send the signal back to the sender
      if (message.senderId !== callback.senderId) {
        // If message has a specific recipient, only send to them
        if (!message.receiverId || message.receiverId === callback.senderId) {
          callback(message);
          delivered = true;
        }
      }
    });
  }

  // If message has a specific recipient but wasn't delivered (peer not connected yet)
  // store it for later delivery
  if (!delivered && message.receiverId) {
    if (!PENDING_MESSAGES[roomId]) {
      PENDING_MESSAGES[roomId] = [];
    }

    // Store message for later delivery (with 60 second expiration)
    const pendingMessage = {
      ...message,
      timestamp: Date.now(),
      expires: Date.now() + 60000, // 60 second TTL
    };

    PENDING_MESSAGES[roomId].push(pendingMessage);
    console.log(
      `Stored pending message for peer ${message.receiverId} in room ${roomId}`,
    );

    // Clean up expired messages
    PENDING_MESSAGES[roomId] = PENDING_MESSAGES[roomId].filter(
      (msg) => msg.expires > Date.now(),
    );
  }
}

export default function useWebRTC({
  roomId,
  userId,
  initialAudioEnabled = true,
  initialVideoEnabled = true,
  userName = "You",
}) {
  // Ensure global polyfill for SimplePeer
  ensureGlobalPolyfill();

  const [localStream, setLocalStream] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isMicOn, setIsMicOn] = useState(initialAudioEnabled);
  const [isCameraOn, setIsCameraOn] = useState(initialVideoEnabled);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const peerConnections = useRef(new Map());
  const screenStream = useRef(null);
  const streamInitAttempts = useRef(0);
  const localStreamRef = useRef(null);

  // Stable function to get media with fallbacks and retries
  const getMediaStream = useCallback(async (options = {}) => {
    const {
      tryAudioOnly = false,
      tryVideoOnly = false,
      retryAttempt = 0,
    } = options;

    console.log("getMediaStream called with options:", options);

    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Browser doesn't support getUserMedia API");
      throw new Error(
        "Your browser doesn't support video calls. Please try a different browser like Chrome or Firefox.",
      );
    }

    // Limit retry attempts
    if (retryAttempt > 3) {
      throw new Error(
        "Maximum retry attempts reached. Please check your device permissions.",
      );
    }

    try {
      let stream;

      // Try different approaches based on previous failures
      if (tryAudioOnly) {
        // Audio-only approach
        console.log("Attempting audio-only stream");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      } else if (tryVideoOnly) {
        // Video-only approach
        console.log("Attempting video-only stream");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      } else {
        // Try combined approach with lower constraints first
        try {
          console.log(
            "Attempting combined audio/video stream with basic constraints",
          );
          // First try with very basic constraints for maximum compatibility
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          console.log("Basic constraints succeeded");
        } catch (basicErr) {
          console.warn(
            "Basic constraints failed, trying with detailed constraints",
            basicErr,
          );
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: {
                width: { ideal: 640, max: 1280 },
                height: { ideal: 480, max: 720 },
                frameRate: { ideal: 24, max: 30 },
              },
            });
          } catch (detailedErr) {
            console.warn(
              "Detailed constraints failed, trying audio-only",
              detailedErr,
            );
            // Fall back to audio-only
            return getMediaStream({
              tryAudioOnly: true,
              retryAttempt: retryAttempt + 1,
            });
          }
        }
      }

      console.log("Successfully acquired media stream");
      return stream;
    } catch (err) {
      console.error(
        `Media acquisition failed (attempt ${retryAttempt + 1})`,
        err,
      );

      // Handle specific errors with appropriate fallbacks
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        throw new Error(
          "Camera or microphone access was denied. Please allow access in your browser settings.",
        );
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        throw new Error(
          "No camera or microphone found. Please connect a device and try again.",
        );
      } else if (
        err.name === "NotReadableError" ||
        err.name === "TrackStartError"
      ) {
        // Device is busy, try a different approach
        if (!tryAudioOnly && !tryVideoOnly) {
          console.log("Device busy, trying audio-only approach");
          return getMediaStream({
            tryAudioOnly: true,
            retryAttempt: retryAttempt + 1,
          });
        }
        throw new Error(
          "Your camera or microphone is already in use by another application.",
        );
      } else if (err.name === "OverconstrainedError") {
        // Try with even lower constraints
        console.log("Constraints too high, trying with lower quality");
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
              width: { ideal: 320, max: 640 },
              height: { ideal: 240, max: 480 },
              frameRate: { ideal: 15, max: 24 },
            },
          });
          console.log("Successfully acquired lower quality stream");
          return stream;
        } catch (lowQualityErr) {
          console.error("Even lower quality failed", lowQualityErr);
          // Last resort: try audio only
          return getMediaStream({
            tryAudioOnly: true,
            retryAttempt: retryAttempt + 1,
          });
        }
      }

      // For any other error, try the alternative approach
      if (!tryAudioOnly && !tryVideoOnly) {
        return getMediaStream({
          tryAudioOnly: true,
          retryAttempt: retryAttempt + 1,
        });
      } else if (tryAudioOnly) {
        return getMediaStream({
          tryVideoOnly: true,
          retryAttempt: retryAttempt + 1,
        });
      }

      // If all approaches failed, rethrow the error
      throw err;
    }
  }, []);

  // Initialize local media stream with retry mechanism
  useEffect(() => {
    let mounted = true;
    let retryTimeout = null;

    console.log(
      "useWebRTC initializing with roomId:",
      roomId,
      "userId:",
      userId,
    );

    const initLocalStream = async () => {
      try {
        setIsInitializing(true);
        streamInitAttempts.current += 1;

        console.log(
          "Initializing media stream, attempt:",
          streamInitAttempts.current,
        );

        // Get media stream with appropriate strategy based on previous attempts
        let stream;
        try {
          console.log("Trying with basic constraints first");
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          console.log("Basic constraints succeeded");
        } catch (basicErr) {
          console.warn(
            "Basic constraints failed, trying with less strict constraints",
            basicErr,
          );
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 30 },
              },
            });
            console.log("Less strict constraints succeeded");
          } catch (exactErr) {
            console.warn(
              "Less strict constraints failed, falling back to adaptive approach",
              exactErr,
            );
            stream = await getMediaStream({
              tryAudioOnly: streamInitAttempts.current > 1,
              tryVideoOnly: streamInitAttempts.current > 2,
              retryAttempt: streamInitAttempts.current - 1,
            });
          }
        }

        console.log(
          "Media stream acquired:",
          stream,
          "video tracks:",
          stream.getVideoTracks().length,
          "audio tracks:",
          stream.getAudioTracks().length,
        );

        if (!mounted) return;

        // Store stream in ref for stable access
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Reset error state on success
        setError(null);

        // Add local participant
        const hasVideoTracks = stream.getVideoTracks().length > 0;
        const hasAudioTracks = stream.getAudioTracks().length > 0;

        // Apply initial audio/video state
        stream.getAudioTracks().forEach((track) => {
          track.enabled = initialAudioEnabled;
        });
        stream.getVideoTracks().forEach((track) => {
          track.enabled = initialVideoEnabled;
        });

        setParticipants([
          {
            id: userId,
            name: userName,
            videoEnabled: hasVideoTracks && initialVideoEnabled,
            audioEnabled: hasAudioTracks && initialAudioEnabled,
            isScreenSharing: false,
            isCurrentUser: true,
            stream: stream,
            isVideoOff: !(hasVideoTracks && initialVideoEnabled),
            isMuted: !(hasAudioTracks && initialAudioEnabled),
          },
        ]);

        // Update state based on available tracks
        setIsCameraOn(hasVideoTracks && initialVideoEnabled);
        setIsMicOn(hasAudioTracks && initialAudioEnabled);
      } catch (err) {
        if (!mounted) return;

        console.error("Error initializing media stream:", err);
        let errorMessage =
          "Could not access camera or microphone. Please check permissions.";

        // Provide specific error messages
        if (err instanceof Error) {
          if (err.message) {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);

        // If we haven't tried too many times, retry with exponential backoff
        if (streamInitAttempts.current < 3) {
          const backoffTime = Math.pow(2, streamInitAttempts.current) * 1000;
          console.log(`Will retry media initialization in ${backoffTime}ms`);

          retryTimeout = window.setTimeout(() => {
            if (mounted) {
              initLocalStream();
            }
          }, backoffTime);
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    // Helper function to clean up a stream
    const cleanupStream = (stream) => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log("Stopped track:", track.kind, track.label);
        });
      }
    };

    // Start initialization
    initLocalStream();

    // Cleanup function
    return () => {
      mounted = false;

      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }

      if (localStreamRef.current) {
        cleanupStream(localStreamRef.current);
        localStreamRef.current = null;
      }

      if (screenStream.current) {
        cleanupStream(screenStream.current);
        screenStream.current = null;
      }

      // Close all peer connections
      peerConnections.current.forEach(({ peer }) => {
        peer.destroy();
      });
    };
  }, [
    roomId,
    userId,
    userName,
    initialAudioEnabled,
    initialVideoEnabled,
    getMediaStream,
  ]);

  // Toggle microphone with enhanced stability and peer connection updates
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        // Toggle all audio tracks for consistency
        const newState = !isMicOn;
        audioTracks.forEach((track) => {
          track.enabled = newState;
        });

        setIsMicOn(newState);

        // Update local participant
        setParticipants((prev) =>
          prev.map((p) =>
            p.isCurrentUser
              ? { ...p, audioEnabled: newState, isMuted: !newState }
              : p,
          ),
        );

        // Notify peers about audio state change
        sendSignal(roomId, {
          type: "audio-state",
          senderId: userId,
          audioEnabled: newState,
        });
      }
    }
  }, [isMicOn, roomId, userId]);

  // Toggle camera with enhanced stability and peer connection updates
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        // Toggle all video tracks for consistency
        const newState = !isCameraOn;
        videoTracks.forEach((track) => {
          track.enabled = newState;
        });

        setIsCameraOn(newState);

        // Update local participant
        setParticipants((prev) =>
          prev.map((p) =>
            p.isCurrentUser
              ? { ...p, videoEnabled: newState, isVideoOff: !newState }
              : p,
          ),
        );

        // Notify peers about video state change
        sendSignal(roomId, {
          type: "video-state",
          senderId: userId,
          videoEnabled: newState,
        });
      }
    }
  }, [isCameraOn, roomId, userId]);

  // Toggle screen sharing with improved stability and peer updates
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing with optimized settings
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            // Use higher settings for better quality
            frameRate: { ideal: 24, max: 30 },
            width: { ideal: 1920, max: 2560 },
            height: { ideal: 1080, max: 1440 },
            displaySurface: "window",
            cursor: "always",
          },
          audio: false, // Disable audio to prevent feedback
        });

        // Store the screen stream for later cleanup
        screenStream.current = stream;

        // Ensure audio is disabled for screen sharing to prevent echo
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
        });

        // Update local participant
        setParticipants((prev) =>
          prev.map((p) =>
            p.isCurrentUser ? { ...p, isScreenSharing: true, stream } : p,
          ),
        );

        setIsScreenSharing(true);

        // Handle when user stops screen sharing via browser UI
        stream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      } else {
        // Stop screen sharing
        if (screenStream.current) {
          screenStream.current.getTracks().forEach((track) => {
            track.stop();
            console.log("Stopped screen track:", track.kind, track.label);
          });
          screenStream.current = null;
        }

        // Update local participant
        if (localStreamRef.current) {
          setParticipants((prev) =>
            prev.map((p) =>
              p.isCurrentUser
                ? {
                    ...p,
                    isScreenSharing: false,
                    stream: localStreamRef.current,
                  }
                : p,
            ),
          );
        }

        setIsScreenSharing(false);
      }
    } catch (err) {
      console.error("Error toggling screen share:", err);
      setError("Could not start screen sharing. Please try again.");
    }
  }, [isScreenSharing]);

  // Set up WebRTC peer connections with signaling
  useEffect(() => {
    console.log(
      "Setting up WebRTC peer connections, localStream exists:",
      !!localStreamRef.current,
    );

    let retryTimeout = null;

    if (!localStreamRef.current) {
      console.warn(
        "No local stream available yet, skipping peer connection setup",
      );
      // Instead of returning, we'll set a timeout to retry after a short delay
      retryTimeout = setTimeout(() => {
        if (localStreamRef.current) {
          console.log(
            "Local stream now available, setting up peer connections",
          );
          // The effect will re-run when localStreamRef.current changes
        }
      }, 2000);
      return () => {
        if (retryTimeout) {
          clearTimeout(retryTimeout);
        }
      };
    }

    // For demo purposes, we'll simulate other participants with actual video streams
    const simulateOtherParticipants = async () => {
      try {
        // Create a fake stream for simulated participants
        const fakeStream = await navigator.mediaDevices
          .getUserMedia({
            video: true,
            audio: true,
          })
          .catch((err) => {
            console.warn(
              "Could not create fake stream for demo participants:",
              err,
            );
            return null;
          });

        // Add some fake participants for testing
        const fakeParticipants = [
          {
            id: "user1",
            name: "John Doe",
            audioEnabled: true,
            videoEnabled: true,
            isScreenSharing: false,
            isCurrentUser: false,
            isVideoOff: false,
            isMuted: false,
            stream: fakeStream,
          },
          {
            id: "user2",
            name: "Jane Smith",
            audioEnabled: false,
            videoEnabled: true,
            isScreenSharing: false,
            isCurrentUser: false,
            isVideoOff: false,
            isMuted: true,
            stream: fakeStream,
          },
        ];

        // Add fake participants to the list
        setParticipants((prev) => {
          // Keep the current user
          const currentUser = prev.find((p) => p.isCurrentUser);
          return currentUser
            ? [currentUser, ...fakeParticipants]
            : fakeParticipants;
        });
      } catch (err) {
        console.error("Error creating simulated participants:", err);
      }
    };

    // Simulate other participants joining after a delay
    const timeout = setTimeout(simulateOtherParticipants, 2000);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [!!localStreamRef.current]);

  // Function to remove a participant from the meeting
  const removeParticipant = useCallback((participantId) => {
    // Remove from our participants list
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));

    // Close and clean up the peer connection if it exists
    const peerConnection = peerConnections.current.get(participantId);
    if (peerConnection) {
      peerConnection.peer.destroy();
      peerConnections.current.delete(participantId);
      console.log(`Removed participant: ${participantId}`);
    }
  }, []);

  return {
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
  };
}
