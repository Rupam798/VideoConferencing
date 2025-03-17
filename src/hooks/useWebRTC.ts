import { useState, useEffect, useRef, useCallback } from "react";
import Peer from "simple-peer";

interface PeerConnection {
  peerId: string;
  peer: Peer.Instance;
  stream?: MediaStream;
}

interface UseWebRTCProps {
  roomId: string;
  userId: string;
}

interface Participant {
  id: string;
  name: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  isScreenSharing: boolean;
  isCurrentUser: boolean;
  stream?: MediaStream;
}

// Simple in-memory signaling for demo purposes
const SIGNALING_CHANNELS: Record<string, Set<(message: any) => void>> = {};

function joinSignalingChannel(
  roomId: string,
  callback: (message: any) => void,
) {
  if (!SIGNALING_CHANNELS[roomId]) {
    SIGNALING_CHANNELS[roomId] = new Set();
  }
  SIGNALING_CHANNELS[roomId].add(callback);
  return () => {
    SIGNALING_CHANNELS[roomId]?.delete(callback);
    if (SIGNALING_CHANNELS[roomId]?.size === 0) {
      delete SIGNALING_CHANNELS[roomId];
    }
  };
}

function sendSignal(roomId: string, message: any) {
  if (SIGNALING_CHANNELS[roomId]) {
    SIGNALING_CHANNELS[roomId].forEach((callback) => {
      // Don't send the signal back to the sender
      if (message.senderId !== callback.senderId) {
        callback(message);
      }
    });
  }
}

export const useWebRTC = ({ roomId, userId }: UseWebRTCProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const peerConnections = useRef<Map<string, PeerConnection>>(new Map());
  const screenStream = useRef<MediaStream | null>(null);
  const streamInitAttempts = useRef(0);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Stable function to get media with fallbacks and retries
  const getMediaStream = useCallback(
    async (
      options: {
        tryAudioOnly?: boolean;
        tryVideoOnly?: boolean;
        retryAttempt?: number;
      } = {},
    ) => {
      const {
        tryAudioOnly = false,
        tryVideoOnly = false,
        retryAttempt = 0,
      } = options;

      // Limit retry attempts
      if (retryAttempt > 3) {
        throw new Error(
          "Maximum retry attempts reached. Please check your device permissions.",
        );
      }

      // Set audio constraints with fallbacks
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Lower sample rate for stability
        sampleRate: { ideal: 22050 },
        // Mono audio for better stability
        channelCount: { ideal: 1 },
      };

      // Set video constraints with progressive quality levels
      const videoConstraints = {
        // Start with very low resolution for stability
        width: { ideal: 240, max: 480 },
        height: { ideal: 180, max: 360 },
        frameRate: { ideal: 10, max: 15 },
        facingMode: "user",
      };

      try {
        let stream: MediaStream;

        // Try different approaches based on previous failures
        if (tryAudioOnly) {
          // Audio-only approach
          console.log("Attempting audio-only stream");
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false,
          });
        } else if (tryVideoOnly) {
          // Video-only approach
          console.log("Attempting video-only stream");
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: videoConstraints,
          });
        } else {
          // Try combined approach with lower constraints first
          try {
            console.log(
              "Attempting combined audio/video stream with low quality",
            );
            stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraints,
              video: videoConstraints,
            });
          } catch (err) {
            console.warn(
              "Failed with combined approach, trying audio-only",
              err,
            );
            // Fall back to audio-only
            return getMediaStream({
              tryAudioOnly: true,
              retryAttempt: retryAttempt + 1,
            });
          }
        }

        // Successfully got a stream, now optimize it
        console.log("Successfully acquired media stream");

        // Process and optimize tracks
        await optimizeMediaTracks(stream);

        return stream;
      } catch (err) {
        console.error(
          `Media acquisition failed (attempt ${retryAttempt + 1})`,
          err,
        );

        // Handle specific errors with appropriate fallbacks
        if (err instanceof Error) {
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
            } else if (tryAudioOnly) {
              console.log("Audio busy, trying video-only approach");
              return getMediaStream({
                tryVideoOnly: true,
                retryAttempt: retryAttempt + 1,
              });
            }
            throw new Error(
              "Your camera or microphone is already in use by another application.",
            );
          } else if (err.name === "OverconstrainedError") {
            // Try with even lower constraints
            console.log("Constraints too high, trying with lower quality");
            const lowerVideoConstraints = {
              width: { ideal: 160, max: 320 },
              height: { ideal: 120, max: 240 },
              frameRate: { ideal: 8, max: 10 },
            };

            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: audioConstraints,
                video: lowerVideoConstraints,
              });
              console.log("Successfully acquired lower quality stream");
              await optimizeMediaTracks(stream);
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
    },
    [],
  );

  // Helper function to optimize media tracks
  const optimizeMediaTracks = useCallback(async (stream: MediaStream) => {
    // Process audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      for (const track of audioTracks) {
        if (track.enabled && track.applyConstraints) {
          try {
            await track.applyConstraints({
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              // Use mono audio for better stability
              channelCount: 1,
            });
            console.log("Applied audio optimizations to track:", track.label);
          } catch (e) {
            console.warn("Could not apply audio constraints", e);
          }
        }
      }
    }

    // Process video tracks with progressive enhancement
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      for (const track of videoTracks) {
        if (track.enabled && track.applyConstraints) {
          try {
            // Start with very low quality and gradually increase if stable
            await track.applyConstraints({
              width: { ideal: 240, max: 480 },
              height: { ideal: 180, max: 360 },
              frameRate: { ideal: 10, max: 15 },
            });
            console.log(
              "Applied initial video optimizations to track:",
              track.label,
            );

            // After 5 seconds, if everything is stable, try slightly higher quality
            setTimeout(async () => {
              if (track.readyState === "live" && track.enabled) {
                try {
                  await track.applyConstraints({
                    width: { ideal: 320, max: 640 },
                    height: { ideal: 240, max: 480 },
                    frameRate: { ideal: 15, max: 20 },
                  });
                  console.log("Upgraded video quality after stability check");
                } catch (e) {
                  console.warn(
                    "Could not upgrade video quality, staying at lower resolution",
                    e,
                  );
                }
              }
            }, 5000);
          } catch (e) {
            console.warn("Could not apply video constraints", e);
          }
        }
      }
    }
  }, []);

  // Initialize local media stream with retry mechanism
  useEffect(() => {
    let mounted = true;
    let retryTimeout: number | null = null;

    const initLocalStream = async () => {
      try {
        setIsInitializing(true);
        streamInitAttempts.current += 1;

        // Get media stream with appropriate strategy based on previous attempts
        const stream = await getMediaStream({
          tryAudioOnly: streamInitAttempts.current > 1,
          tryVideoOnly: streamInitAttempts.current > 2,
          retryAttempt: streamInitAttempts.current - 1,
        });

        if (!mounted) return;

        // Store stream in ref for stable access
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Reset error state on success
        setError(null);

        // Add local participant
        const hasVideoTracks = stream.getVideoTracks().length > 0;
        const hasAudioTracks = stream.getAudioTracks().length > 0;

        setParticipants([
          {
            id: userId,
            name: "You",
            videoEnabled: hasVideoTracks,
            audioEnabled: hasAudioTracks,
            isScreenSharing: false,
            isCurrentUser: true,
            stream,
          },
        ]);

        // Update state based on available tracks
        setIsCameraOn(hasVideoTracks);
        setIsMicOn(hasAudioTracks);

        // Setup periodic health check for stream
        const healthCheckInterval = setInterval(() => {
          if (localStreamRef.current) {
            const videoTracks = localStreamRef.current.getVideoTracks();
            const audioTracks = localStreamRef.current.getAudioTracks();

            // Check if any tracks have unexpectedly ended or muted
            let needsReinitialization = false;

            videoTracks.forEach((track) => {
              if (track.readyState === "ended" && isCameraOn) {
                console.warn(
                  "Video track unexpectedly ended, will reinitialize",
                );
                needsReinitialization = true;
              }
            });

            audioTracks.forEach((track) => {
              if (track.readyState === "ended" && isMicOn) {
                console.warn(
                  "Audio track unexpectedly ended, will reinitialize",
                );
                needsReinitialization = true;
              }
            });

            if (needsReinitialization) {
              // Clean up current stream
              cleanupStream(localStreamRef.current);
              localStreamRef.current = null;

              // Reinitialize after a short delay
              setTimeout(initLocalStream, 1000);
            }
          }
        }, 10000); // Check every 10 seconds

        // Clean up interval on unmount
        return () => clearInterval(healthCheckInterval);
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
    const cleanupStream = (stream: MediaStream) => {
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
  }, [roomId, userId, getMediaStream]);

  // Toggle microphone with stability improvements
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
            p.isCurrentUser ? { ...p, audioEnabled: newState } : p,
          ),
        );
      } else if (!isMicOn) {
        // If trying to enable mic but no audio tracks exist, try to add audio
        console.log("No audio tracks available, attempting to add audio");
        getMediaStream({ tryAudioOnly: true })
          .then((audioStream) => {
            if (localStreamRef.current) {
              // Add the new audio track to existing stream
              const audioTrack = audioStream.getAudioTracks()[0];
              if (audioTrack) {
                localStreamRef.current.addTrack(audioTrack);
                setIsMicOn(true);

                // Update local participant
                setParticipants((prev) =>
                  prev.map((p) =>
                    p.isCurrentUser
                      ? {
                          ...p,
                          audioEnabled: true,
                          stream: localStreamRef.current,
                        }
                      : p,
                  ),
                );
              }
            }
          })
          .catch((err) => {
            console.error("Failed to add audio track:", err);
          });
      }
    }
  }, [isMicOn, getMediaStream]);

  // Toggle camera with stability improvements
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
            p.isCurrentUser ? { ...p, videoEnabled: newState } : p,
          ),
        );
      } else if (!isCameraOn) {
        // If trying to enable camera but no video tracks exist, try to add video
        console.log("No video tracks available, attempting to add video");
        getMediaStream({ tryVideoOnly: true })
          .then((videoStream) => {
            if (localStreamRef.current) {
              // Add the new video track to existing stream
              const videoTrack = videoStream.getVideoTracks()[0];
              if (videoTrack) {
                localStreamRef.current.addTrack(videoTrack);
                setIsCameraOn(true);

                // Update local participant
                setParticipants((prev) =>
                  prev.map((p) =>
                    p.isCurrentUser
                      ? {
                          ...p,
                          videoEnabled: true,
                          stream: localStreamRef.current,
                        }
                      : p,
                  ),
                );
              }
            }
          })
          .catch((err) => {
            console.error("Failed to add video track:", err);
          });
      }
    }
  }, [isCameraOn, getMediaStream]);

  // Toggle screen sharing with improved stability and peer updates
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing with optimized settings
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            // Use lower settings for better stability
            frameRate: { ideal: 10, max: 15 },
            width: { ideal: 1024, max: 1280 },
            height: { ideal: 576, max: 720 },
            displaySurface: "window",
            cursor: "always",
          },
          audio: false, // Disable audio to prevent feedback
        });

        // Store the screen stream for later cleanup
        screenStream.current = stream;

        // Apply constraints to improve stability
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && videoTrack.applyConstraints) {
          try {
            await videoTrack.applyConstraints({
              frameRate: { ideal: 10, max: 15 },
              width: { ideal: 1024, max: 1280 },
              height: { ideal: 576, max: 720 },
            });
          } catch (e) {
            console.warn("Could not apply screen sharing constraints", e);
          }
        }

        // Replace video track in all peer connections
        peerConnections.current.forEach(({ peer }) => {
          const videoTrack = stream.getVideoTracks()[0];
          const sender = peer._senders?.find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Notify peers about screen sharing state
        sendSignal(roomId, {
          type: "screen-share-state",
          senderId: userId,
          isScreenSharing: true,
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

        // Replace with camera track in all peer connections
        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];

          // Apply constraints to camera track for stability after switching back
          if (videoTrack && videoTrack.applyConstraints) {
            try {
              await videoTrack.applyConstraints({
                width: { ideal: 240, max: 480 },
                height: { ideal: 180, max: 360 },
                frameRate: { ideal: 10, max: 15 },
              });
            } catch (e) {
              console.warn("Could not apply camera constraints", e);
            }
          }

          peerConnections.current.forEach(({ peer }) => {
            const sender = peer._senders?.find(
              (s) => s.track?.kind === "video",
            );
            if (sender && videoTrack) {
              sender.replaceTrack(videoTrack);
            }
          });

          // Update local participant
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

        // Notify peers about screen sharing state
        sendSignal(roomId, {
          type: "screen-share-state",
          senderId: userId,
          isScreenSharing: false,
        });
      }
    } catch (err) {
      console.error("Error toggling screen share:", err);
      setError("Could not start screen sharing. Please try again.");
    }
  }, [isScreenSharing, roomId, userId]);

  // Set up WebRTC peer connections with signaling
  useEffect(() => {
    if (!localStreamRef.current) return;

    // Register with the signaling channel
    const signalCallback = (message: any) => {
      console.log("Received signal:", message);

      if (message.type === "new-peer") {
        // Someone new joined, initiate connection to them
        if (message.senderId !== userId) {
          console.log(`New peer joined: ${message.senderId}`);
          createPeer(message.senderId, true, localStreamRef.current!);
        }
      } else if (message.type === "signal") {
        // Handle WebRTC signaling (offer, answer, ice candidates)
        if (message.receiverId === userId) {
          const peerConnection = peerConnections.current.get(message.senderId);

          if (peerConnection) {
            // Existing connection, pass the signal
            peerConnection.peer.signal(message.signal);
          } else if (message.signal.type === "offer") {
            // New connection from an offer
            console.log(`Received offer from: ${message.senderId}`);
            createPeer(
              message.senderId,
              false,
              localStreamRef.current!,
              message.signal,
            );
          }
        }
      }
    };

    // Assign a senderId to the callback for filtering
    signalCallback.senderId = userId;

    // Join the signaling channel
    const leaveSignaling = joinSignalingChannel(roomId, signalCallback);

    // Announce yourself to the room
    console.log(`Announcing presence in room: ${roomId}`);
    sendSignal(roomId, {
      type: "new-peer",
      senderId: userId,
      roomId: roomId,
    });

    // Function to create a peer connection
    function createPeer(
      peerId: string,
      initiator: boolean,
      stream: MediaStream,
      incomingSignal?: any,
    ) {
      console.log(
        `Creating ${initiator ? "initiator" : "receiver"} peer for: ${peerId}`,
      );

      // Create the peer with appropriate configuration
      const peer = new Peer({
        initiator,
        stream,
        trickle: true,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" },
          ],
        },
      });

      // Handle signals from this peer to send to the other peer
      peer.on("signal", (signal) => {
        console.log(`Sending signal to: ${peerId}`);
        sendSignal(roomId, {
          type: "signal",
          signal,
          senderId: userId,
          receiverId: peerId,
        });
      });

      // Handle receiving the remote stream
      peer.on("stream", (remoteStream) => {
        console.log(`Received stream from: ${peerId}`);

        // Add the new participant with their stream
        setParticipants((prev) => {
          // Check if this participant already exists
          const exists = prev.some((p) => p.id === peerId);

          if (exists) {
            // Update existing participant with stream
            return prev.map((p) =>
              p.id === peerId
                ? {
                    ...p,
                    stream: remoteStream,
                    videoEnabled: true,
                    audioEnabled: true,
                  }
                : p,
            );
          } else {
            // Add new participant
            return [
              ...prev,
              {
                id: peerId,
                name: `Peer ${peerId.substring(0, 5)}`,
                videoEnabled: true,
                audioEnabled: true,
                isScreenSharing: false,
                isCurrentUser: false,
                stream: remoteStream,
              },
            ];
          }
        });
      });

      // Handle peer connection closing
      peer.on("close", () => {
        console.log(`Connection closed with: ${peerId}`);
        peerConnections.current.delete(peerId);
        setParticipants((prev) => prev.filter((p) => p.id !== peerId));
      });

      // Handle errors
      peer.on("error", (err) => {
        console.error(`Peer connection error with ${peerId}:`, err);
        // Try to recover or clean up
        peerConnections.current.delete(peerId);
        setParticipants((prev) => prev.filter((p) => p.id !== peerId));
      });

      // If we're receiving a connection, process the incoming signal
      if (!initiator && incomingSignal) {
        peer.signal(incomingSignal);
      }

      // Store the peer connection
      peerConnections.current.set(peerId, { peerId, peer });

      return peer;
    }

    // Cleanup function
    return () => {
      leaveSignaling();

      // Close all peer connections
      peerConnections.current.forEach(({ peer, peerId }) => {
        console.log(`Closing connection with: ${peerId}`);
        peer.destroy();
      });
      peerConnections.current.clear();
    };
  }, [roomId, userId, localStreamRef.current]);

  // Function to remove a participant from the meeting
  const removeParticipant = useCallback(
    (participantId: string) => {
      // Notify the participant they're being removed
      sendSignal(roomId, {
        type: "remove-participant",
        senderId: userId,
        removedId: participantId,
      });

      // Remove from our participants list
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));

      // Close and clean up the peer connection if it exists
      const peerConnection = peerConnections.current.get(participantId);
      if (peerConnection) {
        peerConnection.peer.destroy();
        peerConnections.current.delete(participantId);
        console.log(`Removed participant: ${participantId}`);
      }
    },
    [roomId, userId],
  );

  // Listen for participant removal signals
  useEffect(() => {
    const handleRemoval = (message: any) => {
      if (
        message.type === "remove-participant" &&
        message.removedId === userId
      ) {
        // We've been removed from the meeting
        console.log("You have been removed from the meeting");
        // Clean up connections and redirect if needed
        peerConnections.current.forEach(({ peer }) => {
          peer.destroy();
        });
        peerConnections.current.clear();
      }
    };

    // Add senderId to the callback for filtering
    handleRemoval.senderId = userId;

    const leaveSignaling = joinSignalingChannel(roomId, handleRemoval);
    return leaveSignaling;
  }, [roomId, userId]);

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
};
