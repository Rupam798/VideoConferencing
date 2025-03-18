import React, { useEffect, useRef, useState, useCallback } from "react";
import { MicOff, ScreenShare } from "lucide-react";

const VideoStream = ({
  stream,
  isMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
  name,
  className = "",
}) => {
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const streamRef = useRef(null);
  const recoveryAttemptRef = useRef(0);
  const recoveryTimerRef = useRef(null);

  // Memoize stream to prevent unnecessary re-renders
  const stableStream = useRef(stream);
  if (stream !== stableStream.current) {
    stableStream.current = stream;
  }

  // Handle video errors with recovery attempts
  const handleVideoError = useCallback(() => {
    setVideoError(true);
    console.error("Video playback error occurred");
    attemptRecovery();
  }, []);

  // Recovery function with exponential backoff
  const attemptRecovery = useCallback(() => {
    if (recoveryAttemptRef.current >= 3) {
      console.error("Max recovery attempts reached, showing placeholder");
      return;
    }

    if (recoveryTimerRef.current) {
      window.clearTimeout(recoveryTimerRef.current);
    }

    const backoffTime = Math.pow(2, recoveryAttemptRef.current) * 1000;
    console.log(`Attempting stream recovery in ${backoffTime}ms`);

    recoveryTimerRef.current = window.setTimeout(() => {
      if (videoRef.current && stableStream.current) {
        console.log("Attempting stream recovery");
        try {
          // Reset video element completely
          videoRef.current.srcObject = null;
          videoRef.current.load();

          // Re-attach stream
          videoRef.current.srcObject = stableStream.current;
          videoRef.current
            .play()
            .then(() => {
              setVideoError(false);
              setIsPlaying(true);
              recoveryAttemptRef.current = 0;
              console.log("Stream recovery successful");
            })
            .catch((err) => {
              console.error("Recovery play failed:", err);
              recoveryAttemptRef.current++;
              attemptRecovery();
            });
        } catch (err) {
          console.error("Recovery attempt failed:", err);
          recoveryAttemptRef.current++;
          attemptRecovery();
        }
      }
    }, backoffTime);
  }, []);

  // Enhanced video stream setup with better browser compatibility
  useEffect(() => {
    // Reset recovery attempts when stream changes
    recoveryAttemptRef.current = 0;

    console.log(
      "VideoStream useEffect - stream:",
      stream,
      "isVideoOff:",
      isVideoOff,
    );

    if (videoRef.current && stableStream.current && !isVideoOff) {
      try {
        // Check if stream has video tracks before assigning
        const hasVideoTracks = stableStream.current.getVideoTracks
          ? stableStream.current.getVideoTracks().length > 0
          : false;
        const hasAudioTracks = stableStream.current.getAudioTracks
          ? stableStream.current.getAudioTracks().length > 0
          : false;

        console.log(
          "Stream tracks - video:",
          hasVideoTracks,
          "audio:",
          hasAudioTracks,
        );

        // Only update if stream has changed or we're recovering from an error
        if (videoRef.current.srcObject !== stableStream.current || videoError) {
          // Store stream reference for cleanup
          streamRef.current = stableStream.current;

          // Reset video element completely
          videoRef.current.srcObject = null;
          videoRef.current.load();

          // Configure video element for optimal performance
          videoRef.current.playsInline = true;
          videoRef.current.muted = isMuted;
          videoRef.current.autoplay = true;

          // Add low latency hints
          if ("mediaSettings" in videoRef.current) {
            try {
              videoRef.current.mediaSettings = {
                lowLatency: true,
                highQuality: true,
              };
            } catch (e) {
              console.warn("Advanced media settings not supported", e);
            }
          }

          // Force a small delay before attaching stream (helps with some browser issues)
          setTimeout(() => {
            if (videoRef.current) {
              // Apply stream with minimal latency settings
              videoRef.current.srcObject = stableStream.current;
              console.log("Successfully set srcObject on video element");

              // Explicitly try to play the video
              videoRef.current.play().catch((e) => {
                console.warn(
                  "Initial play failed, will retry on user interaction",
                  e,
                );
                // Add a click handler to the document to play on first interaction
                const playOnInteraction = () => {
                  if (videoRef.current) {
                    videoRef.current
                      .play()
                      .catch((err) =>
                        console.error("Play on interaction failed", err),
                      );
                  }
                  document.removeEventListener("click", playOnInteraction);
                  document.removeEventListener("touchstart", playOnInteraction);
                };

                document.addEventListener("click", playOnInteraction, {
                  once: true,
                });
                document.addEventListener("touchstart", playOnInteraction, {
                  once: true,
                });
              });

              setVideoError(false);
            }
          }, 50);
        }
      } catch (err) {
        console.error("Error setting video stream:", err);
        setVideoError(true);
        attemptRecovery();
      }
    } else if (isVideoOff && videoRef.current) {
      // Properly detach stream when video is off
      videoRef.current.srcObject = null;
    } else {
      console.log("Conditions not met for setting video stream:", {
        videoRefExists: !!videoRef.current,
        streamExists: !!stableStream.current,
        isVideoOff,
      });
    }

    // Cleanup function with proper track handling
    return () => {
      if (recoveryTimerRef.current) {
        window.clearTimeout(recoveryTimerRef.current);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream, isVideoOff, isMuted, videoError, attemptRecovery]);

  // Log component render state
  useEffect(() => {
    console.log("VideoStream rendering with:", {
      hasStream: !!stableStream.current,
      isVideoOff,
      isMuted,
      videoError,
      name,
    });
  }, [stableStream.current, isVideoOff, isMuted, videoError, name]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-gray-900 shadow-lg border border-gray-800/50 ${className}`}
    >
      {stableStream.current && !isVideoOff && !videoError ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className="w-full h-full object-cover" /* Use cover for better appearance */
          onError={handleVideoError}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              // Set optimal video properties
              videoRef.current.volume = isMuted ? 0 : 0.7;

              // Attempt to play with error handling
              videoRef.current
                .play()
                .then(() => {
                  setIsPlaying(true);
                  console.log("Video playing successfully");
                })
                .catch((err) => {
                  console.error("Initial play failed:", err);
                  // For autoplay policy issues, wait for user interaction
                  document.addEventListener(
                    "click",
                    function playOnClick() {
                      if (videoRef.current)
                        videoRef.current
                          .play()
                          .then(() => setIsPlaying(true))
                          .catch((e) =>
                            console.error("Play on click failed:", e),
                          );
                      document.removeEventListener("click", playOnClick);
                    },
                    { once: true },
                  );
                });
            }
          }}
          onStalled={() => {
            console.log("Video stalled - attempting recovery");
            if (isPlaying) {
              setIsPlaying(false);
              attemptRecovery();
            }
          }}
          onPause={() => {
            // Only handle unexpected pauses
            if (isPlaying && videoRef.current && !videoRef.current.ended) {
              console.log("Unexpected pause - attempting to resume");
              videoRef.current.play().catch((e) => {
                console.warn("Could not resume after pause", e);
                attemptRecovery();
              });
            }
          }}
          onPlaying={() => setIsPlaying(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
          <div className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-2xl font-bold text-white shadow-lg border-2 border-gray-600/30">
              {name.charAt(0)}
            </div>
            {videoError && stableStream.current && (
              <p className="text-xs text-red-400 mt-2 px-2 py-1 rounded-full bg-red-900/20 border border-red-800/30">
                Video unavailable
              </p>
            )}
          </div>
        </div>
      )}

      {/* Overlay with participant info */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium truncate px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm">
            {name}
          </span>
          <div className="flex space-x-1">
            {isScreenSharing && (
              <span className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-1 rounded-full shadow-md flex items-center">
                <ScreenShare className="h-3 w-3 mr-1" /> Sharing
              </span>
            )}
            {isMuted && (
              <span className="text-xs bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded-full shadow-md flex items-center">
                <MicOff className="h-3 w-3 mr-1" /> Muted
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoStream;
