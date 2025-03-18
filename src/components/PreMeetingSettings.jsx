import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PreMeetingSettings = ({ meetingId, onJoin = () => {} }) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [enableVideo, setEnableVideo] = useState(true);
  const [enableAudio, setEnableAudio] = useState(true);
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = useRef(null);

  // Load user name from localStorage if available
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData.name) {
          setName(userData.name);
        }
      } catch (e) {
        console.error("Error parsing stored user data", e);
      }
    }
  }, []);

  // Initialize camera preview
  useEffect(() => {
    let stream = null;

    const initCamera = async () => {
      try {
        if (enableVideo) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user",
            },
            audio: false, // We don't need audio for the preview
          });
          setVideoStream(stream);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else if (stream) {
          // Stop the stream if video is disabled
          stopVideoStream();
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setEnableVideo(false);
      }
    };

    initCamera();

    return () => {
      stopVideoStream();
    };
  }, [enableVideo]);

  const stopVideoStream = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const handleJoin = () => {
    // Store user name in localStorage
    const userData = { name: name || "Guest" };
    localStorage.setItem("user", JSON.stringify(userData));

    // Stop video stream before joining
    stopVideoStream();

    // Call the onJoin callback with settings
    onJoin({
      name: name || "Guest",
      enableVideo,
      enableAudio,
    });

    // Navigate to the meeting room
    navigate(`/meeting/${meetingId}`);
  };

  const toggleVideo = () => {
    setEnableVideo(!enableVideo);
  };

  const toggleAudio = () => {
    setEnableAudio(!enableAudio);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">
            Join Meeting: {meetingId}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Your Name
            </label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            {enableVideo && videoStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-500 flex flex-col items-center">
                <VideoOff size={48} className="mb-2" />
                <span>Camera is off</span>
              </div>
            )}
          </div>

          <div className="flex justify-center space-x-4">
            <Button
              type="button"
              variant={enableVideo ? "default" : "outline"}
              className={`rounded-full p-3 ${enableVideo ? "bg-blue-600 hover:bg-blue-700" : "border-gray-300"}`}
              onClick={toggleVideo}
            >
              {enableVideo ? (
                <Video className="h-6 w-6 text-white" />
              ) : (
                <VideoOff className="h-6 w-6 text-gray-700" />
              )}
            </Button>

            <Button
              type="button"
              variant={enableAudio ? "default" : "outline"}
              className={`rounded-full p-3 ${enableAudio ? "bg-blue-600 hover:bg-blue-700" : "border-gray-300"}`}
              onClick={toggleAudio}
            >
              {enableAudio ? (
                <Mic className="h-6 w-6 text-white" />
              ) : (
                <MicOff className="h-6 w-6 text-gray-700" />
              )}
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleJoin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
          >
            Join Meeting
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PreMeetingSettings;
