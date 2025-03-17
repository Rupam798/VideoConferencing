import React, { useEffect, useRef, useState, useCallback } from "react";

interface VideoStreamProps {
  stream?: MediaStream;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  name: string;
  className?: string;
}

const VideoStream: React.FC<VideoStreamProps> = ({
  stream,
  isMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
  name,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recoveryAttemptRef = useRef(0);
  const recoveryTimerRef = useRef<number | null>(null);

  // Memoize stream to prevent unnecessary re-renders
  const stableStream = useRef<MediaStream | undefined>(stream);
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

  // Setup video stream with optimized handling
  useEffect(() => {
    // Reset recovery attempts when stream changes
    recoveryAttemptRef.current = 0;

    if (videoRef.current && stableStream.current && !isVideoOff) {
      try {
        // Check if stream has video tracks before assigning
        const hasVideoTracks = stableStream.current.getVideoTracks().length > 0;
        const hasAudioTracks = stableStream.current.getAudioTracks().length > 0;

        // Only update if stream has changed or we're recovering from an error
        if (videoRef.current.srcObject !== stableStream.current || videoError) {
          // Only set srcObject if there are media tracks
          if (hasVideoTracks || hasAudioTracks) {
            // Store stream reference for cleanup
            streamRef.current = stableStream.current;

            // Reset video element completely
            videoRef.current.srcObject = null;
            videoRef.current.load();

            // Configure video element for optimal performance
            videoRef.current.playsInline = true;
            videoRef.current.muted = isMuted;
            videoRef.current.autoplay = true;

            // Apply stream with minimal latency settings
            videoRef.current.srcObject = stableStream.current;

            setVideoError(false);
          } else {
            console.warn("Stream has no media tracks, showing placeholder");
            setVideoError(true);
          }
        }
      } catch (err) {
        console.error("Error setting video stream:", err);
        setVideoError(true);
      }
    } else if (isVideoOff && videoRef.current) {
      // Properly detach stream when video is off
      videoRef.current.srcObject = null;
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
  }, [stream, isVideoOff, isMuted, videoError]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-gray-900 ${className}`}
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
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-white">
              {name.charAt(0)}
            </div>
            {videoError && stableStream.current && (
              <p className="text-xs text-red-400 mt-2">Video unavailable</p>
            )}
          </div>
        </div>
      )}

      {/* Overlay with participant info */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium truncate">{name}</span>
          <div className="flex space-x-1">
            {isScreenSharing && (
              <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">
                Sharing
              </span>
            )}
            {isMuted && (
              <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">
                Muted
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoStream;
