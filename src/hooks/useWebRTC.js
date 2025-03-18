import { useState, useEffect, useRef, useCallback } from "react";
import Peer from "simple-peer";

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

    // Set audio constraints with echo cancellation prioritized
    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      // Mono audio to reduce echo (stereo can cause more echo issues)
      channelCount: { ideal: 1 },
      // Standard sample rate to improve compatibility
      sampleRate: { ideal: 16000 },
    };

    // Set video constraints with higher quality levels
    const videoConstraints = {
      // Higher resolution for better quality
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 24, max: 30 },
      facingMode: "user",
    };

    try {
      let stream;

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

          // First try with very basic constraints for maximum compatibility
          try {
            console.log("Trying with basic constraints first");
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
            stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraints,
              video: videoConstraints,
            });
          }
        } catch (err) {
          console.warn("Failed with combined approach, trying audio-only", err);
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
            width: { ideal: 320, max: 640 },
            height: { ideal: 240, max: 480 },
            frameRate: { ideal: 15, max: 24 },
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
  }, []);

  // Helper function to optimize media tracks
  const optimizeMediaTracks = useCallback(async (stream) => {
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
              // Use mono audio to reduce echo
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
            // Start with better quality
            await track.applyConstraints({
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 },
              frameRate: { ideal: 24, max: 30 },
            });
            console.log(
              "Applied initial video optimizations to track:",
              track.label,
            );

            // After 5 seconds, if everything is stable, try higher quality
            setTimeout(async () => {
              if (track.readyState === "live" && track.enabled) {
                try {
                  await track.applyConstraints({
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 30 },
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
        // First try with exact video constraints for better compatibility
        let stream;
        try {
          console.log("Trying with exact video constraints first");
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
              width: { exact: 640 },
              height: { exact: 480 },
              frameRate: { ideal: 30 },
            },
          });
          console.log("Exact video constraints succeeded");
        } catch (exactErr) {
          console.warn(
            "Exact constraints failed, falling back to adaptive approach",
            exactErr,
          );
          stream = await getMediaStream({
            tryAudioOnly: streamInitAttempts.current > 1,
            tryVideoOnly: streamInitAttempts.current > 2,
            retryAttempt: streamInitAttempts.current - 1,
          });
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

        setParticipants([
          {
            id: userId,
            name: userName,
            videoEnabled: hasVideoTracks && initialVideoEnabled,
            audioEnabled: hasAudioTracks && initialAudioEnabled,
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
  }, [roomId, userId, getMediaStream]);

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
            p.isCurrentUser ? { ...p, audioEnabled: newState } : p,
          ),
        );

        // Notify peers about audio state change
        sendSignal(roomId, {
          type: "audio-state",
          senderId: userId,
          audioEnabled: newState,
        });
      } else if (!isMicOn) {
        // If trying to enable mic but no audio tracks exist, try to add audio
        console.log("No audio tracks available, attempting to add audio");
        getMediaStream({ tryAudioOnly: true })
          .then((audioStream) => {
            if (localStreamRef.current) {
              // Add the new audio track to existing stream
              const audioTrack = audioStream.getAudioTracks()[0];
              if (audioTrack) {
                try {
                  localStreamRef.current.addTrack(audioTrack);

                  // Also update the track in all peer connections
                  peerConnections.current.forEach(({ peer }) => {
                    // Find audio sender or create one
                    const audioSender = peer._senders?.find(
                      (s) => s.track?.kind === "audio",
                    );
                    if (audioSender) {
                      audioSender.replaceTrack(audioTrack);
                    } else if (peer.addTrack) {
                      peer.addTrack(audioTrack, localStreamRef.current);
                    }
                  });

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

                  // Notify peers about audio state change
                  sendSignal(roomId, {
                    type: "audio-state",
                    senderId: userId,
                    audioEnabled: true,
                  });
                } catch (err) {
                  console.error("Error adding audio track to stream:", err);
                  // If adding to existing stream fails, replace the entire stream
                  audioStream.getVideoTracks().forEach((track) => {
                    track.stop(); // Stop any video tracks in the audio-only stream
                  });

                  // Get video tracks from current stream and add to new stream
                  if (localStreamRef.current) {
                    localStreamRef.current
                      .getVideoTracks()
                      .forEach((videoTrack) => {
                        try {
                          audioStream.addTrack(videoTrack);
                        } catch (e) {
                          console.warn(
                            "Could not add video track to new stream",
                            e,
                          );
                        }
                      });
                  }

                  // Replace the entire stream
                  localStreamRef.current = audioStream;
                  setLocalStream(audioStream);
                  setIsMicOn(true);

                  // Update local participant
                  setParticipants((prev) =>
                    prev.map((p) =>
                      p.isCurrentUser
                        ? {
                            ...p,
                            audioEnabled: true,
                            stream: audioStream,
                          }
                        : p,
                    ),
                  );

                  // Notify peers about audio state change
                  sendSignal(roomId, {
                    type: "audio-state",
                    senderId: userId,
                    audioEnabled: true,
                  });
                }
              }
            }
          })
          .catch((err) => {
            console.error("Failed to add audio track:", err);
          });
      }
    }
  }, [isMicOn, getMediaStream, roomId, userId]);

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
            p.isCurrentUser ? { ...p, videoEnabled: newState } : p,
          ),
        );

        // Notify peers about video state change
        sendSignal(roomId, {
          type: "video-state",
          senderId: userId,
          videoEnabled: newState,
        });
      } else if (!isCameraOn) {
        // If trying to enable camera but no video tracks exist, try to add video
        console.log("No video tracks available, attempting to add video");
        getMediaStream({ tryVideoOnly: true })
          .then((videoStream) => {
            if (localStreamRef.current) {
              // Add the new video track to existing stream
              const videoTrack = videoStream.getVideoTracks()[0];
              if (videoTrack) {
                try {
                  localStreamRef.current.addTrack(videoTrack);

                  // Also update the track in all peer connections
                  peerConnections.current.forEach(({ peer }) => {
                    // Find video sender or create one
                    const videoSender = peer._senders?.find(
                      (s) => s.track?.kind === "video",
                    );
                    if (videoSender) {
                      videoSender.replaceTrack(videoTrack);
                    } else if (peer.addTrack) {
                      peer.addTrack(videoTrack, localStreamRef.current);
                    }
                  });

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

                  // Notify peers about video state change
                  sendSignal(roomId, {
                    type: "video-state",
                    senderId: userId,
                    videoEnabled: true,
                  });
                } catch (err) {
                  console.error("Error adding video track to stream:", err);
                  // If adding to existing stream fails, replace the entire stream
                  videoStream.getAudioTracks().forEach((track) => {
                    track.stop(); // Stop any audio tracks in the video-only stream
                  });

                  // Get audio tracks from current stream and add to new stream
                  if (localStreamRef.current) {
                    localStreamRef.current
                      .getAudioTracks()
                      .forEach((audioTrack) => {
                        try {
                          videoStream.addTrack(audioTrack);
                        } catch (e) {
                          console.warn(
                            "Could not add audio track to new stream",
                            e,
                          );
                        }
                      });
                  }

                  // Replace the entire stream
                  localStreamRef.current = videoStream;
                  setLocalStream(videoStream);
                  setIsCameraOn(true);

                  // Update local participant
                  setParticipants((prev) =>
                    prev.map((p) =>
                      p.isCurrentUser
                        ? {
                            ...p,
                            videoEnabled: true,
                            stream: videoStream,
                          }
                        : p,
                    ),
                  );

                  // Notify peers about video state change
                  sendSignal(roomId, {
                    type: "video-state",
                    senderId: userId,
                    videoEnabled: true,
                  });
                }
              }
            }
          })
          .catch((err) => {
            console.error("Failed to add video track:", err);
          });
      }
    }
  }, [isCameraOn, getMediaStream, roomId, userId]);

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

        // Apply constraints to improve stability
        const videoTrack = stream.getVideoTracks()[0];

        // Ensure audio is disabled for screen sharing to prevent echo
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
        });

        if (videoTrack && videoTrack.applyConstraints) {
          try {
            await videoTrack.applyConstraints({
              frameRate: { ideal: 24, max: 30 },
              width: { ideal: 1920, max: 2560 },
              height: { ideal: 1080, max: 1440 },
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
                width: { ideal: 640, max: 1280 },
                height: { ideal: 480, max: 720 },
                frameRate: { ideal: 24, max: 30 },
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
    console.log(
      "Setting up WebRTC peer connections, localStream exists:",
      !!localStreamRef.current,
    );
    if (!localStreamRef.current) {
      console.warn(
        "No local stream available yet, skipping peer connection setup",
      );
      return;
    }

    // Register with the signaling channel
    const signalCallback = (message) => {
      console.log("Received signal:", message);

      if (message.type === "new-peer") {
        // Someone new joined, initiate connection to them
        if (message.senderId !== userId) {
          console.log(`New peer joined: ${message.senderId}`);
          createPeer(message.senderId, true, localStreamRef.current);
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
              localStreamRef.current,
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
    function createPeer(peerId, initiator, stream, incomingSignal) {
      console.log(
        `Creating ${initiator ? "initiator" : "receiver"} peer for: ${peerId}`,
      );

      // Create the peer with improved configuration for better connectivity
      const peer = new Peer({
        initiator,
        stream,
        trickle: true,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" },
            // Add more STUN/TURN servers for better connectivity
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            // Free TURN servers (limited capacity but helpful for testing)
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
            {
              urls: "turn:openrelay.metered.ca:443",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
          ],
          iceCandidatePoolSize: 10,
        },
        debug: 3, // Enable more verbose debugging
        // Add better quality options
        sdpTransform: (sdp) => {
          // Increase bandwidth for video
          sdp = sdp.replace(/b=AS:(\d+)/g, "b=AS:2000");

          // Add audio processing hints to SDP to reduce echo
          if (!sdp.includes("a=fmtp:111 minptime=10")) {
            sdp = sdp.replace(/(m=audio .+)/g, "$1\r\na=fmtp:111 minptime=10");
          }

          // Force VP8 codec for maximum compatibility
          if (sdp.includes("m=video")) {
            // Extract the video codec line
            const videoSection = sdp.split("m=video")[1].split("m=")[0];
            if (videoSection.includes(" 96 ") && videoSection.includes("VP8")) {
              // Prioritize VP8 by moving it to the front of the payload types
              const videoLine = sdp.match(
                /m=video [0-9]+ [A-Z\/]+ [0-9 ]*/g,
              )[0];
              const payloadTypes = videoLine.split(" ").slice(3);
              const vp8Index = payloadTypes.findIndex((pt) => {
                const regex = new RegExp("a=rtpmap:" + pt + " VP8");
                return regex.test(sdp);
              });

              if (vp8Index > 0) {
                const vp8PT = payloadTypes[vp8Index];
                payloadTypes.splice(vp8Index, 1);
                payloadTypes.unshift(vp8PT);
                const newVideoLine =
                  videoLine.split(" ").slice(0, 3).join(" ") +
                  " " +
                  payloadTypes.join(" ");
                sdp = sdp.replace(videoLine, newVideoLine);
              }
            }
          }

          return sdp;
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
    (participantId) => {
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

  // Listen for participant signals (removal, state changes, etc.)
  useEffect(() => {
    const handleSignals = (message) => {
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
      } else if (message.type === "audio-state" && message.senderId) {
        // Update participant audio state
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === message.senderId
              ? { ...p, audioEnabled: message.audioEnabled }
              : p,
          ),
        );
      } else if (message.type === "video-state" && message.senderId) {
        // Update participant video state
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === message.senderId
              ? { ...p, videoEnabled: message.videoEnabled }
              : p,
          ),
        );
      } else if (message.type === "screen-share-state" && message.senderId) {
        // Update participant screen sharing state
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === message.senderId
              ? { ...p, isScreenSharing: message.isScreenSharing }
              : p,
          ),
        );
      } else if (message.type === "name-update" && message.senderId) {
        // Update participant name
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === message.senderId ? { ...p, name: message.name } : p,
          ),
        );
      } else if (message.type === "ping") {
        // Respond to ping with pong to maintain connection
        sendSignal(roomId, {
          type: "pong",
          senderId: userId,
          receiverId: message.senderId,
          timestamp: Date.now(),
        });
      }
    };

    // Add senderId to the callback for filtering
    handleSignals.senderId = userId;

    const leaveSignaling = joinSignalingChannel(roomId, handleSignals);

    // Send name update to all peers
    sendSignal(roomId, {
      type: "name-update",
      senderId: userId,
      name: userName,
    });

    // Set up periodic ping to keep connections alive
    const pingInterval = setInterval(() => {
      sendSignal(roomId, {
        type: "ping",
        senderId: userId,
        timestamp: Date.now(),
      });
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(pingInterval);
      leaveSignaling();
    };
  }, [roomId, userId, userName]);

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
