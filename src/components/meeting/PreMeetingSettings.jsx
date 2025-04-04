import React, { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
// Remove Select import as it's not available
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Mic, Video, Settings, User } from "lucide-react";

const PreMeetingSettings = ({ onJoinMeeting = () => {} }) => {
  const [name, setName] = useState("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("");
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [stream, setStream] = useState(null);
  const videoPreviewRef = useRef(null);

  // Get user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setName(user.name || "");
    }
  }, []);

  // Get available media devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permissions first by getting a stream
        const initialStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setStream(initialStream);

        // Now get the list of devices
        const devices = await navigator.mediaDevices.enumerateDevices();

        const audioInputs = devices.filter(
          (device) => device.kind === "audioinput",
        );
        const videoInputs = devices.filter(
          (device) => device.kind === "videoinput",
        );

        setAudioDevices(audioInputs);
        setVideoDevices(videoInputs);

        // Set defaults if available
        if (audioInputs.length > 0 && !selectedAudioDevice) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }

        if (videoInputs.length > 0 && !selectedVideoDevice) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };

    getDevices();

    return () => {
      // Clean up stream when component unmounts
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Update video preview when stream changes
  useEffect(() => {
    if (videoPreviewRef.current && stream) {
      videoPreviewRef.current.srcObject = stream;
    }
  }, [stream]);

  // Handle device selection changes
  useEffect(() => {
    const updateStream = async () => {
      if (!selectedAudioDevice && !selectedVideoDevice) return;

      try {
        // Stop current tracks
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        // Get new stream with selected devices
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioDevice
            ? { deviceId: { exact: selectedAudioDevice } }
            : false,
          video: selectedVideoDevice
            ? { deviceId: { exact: selectedVideoDevice } }
            : false,
        });

        // Update audio/video enabled state
        newStream.getAudioTracks().forEach((track) => {
          track.enabled = isMicEnabled;
        });

        newStream.getVideoTracks().forEach((track) => {
          track.enabled = isVideoEnabled;
        });

        setStream(newStream);
      } catch (err) {
        console.error("Error updating media stream:", err);
      }
    };

    updateStream();
  }, [selectedAudioDevice, selectedVideoDevice]);

  // Toggle microphone
  const toggleMic = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !isMicEnabled;
      });
      setIsMicEnabled(!isMicEnabled);
    }
  };

  // Toggle camera
  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      const newState = !isVideoEnabled;

      videoTracks.forEach((track) => {
        track.enabled = newState;
      });

      console.log("Camera toggled:", {
        newState,
        videoTracks: videoTracks.length,
        tracksEnabled: videoTracks.some((track) => track.enabled),
      });

      setIsVideoEnabled(newState);
    } else {
      console.warn("Cannot toggle video: No stream available");
    }
  };

  // Join meeting with current settings
  const handleJoinMeeting = () => {
    // Stop preview stream before joining
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    onJoinMeeting({
      userName: name,
      isMicEnabled,
      isVideoEnabled,
      audioDeviceId: selectedAudioDevice,
      videoDeviceId: selectedVideoDevice,
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
        <CardTitle className="text-xl font-semibold flex items-center">
          <Settings className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Meeting Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Name input */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Your Name
          </Label>
          <div className="flex">
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-l-md flex items-center justify-center">
              <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-l-none flex-1"
              placeholder="Enter your name"
            />
          </div>
        </div>

        {/* Video preview */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Video Preview</Label>
          <div className="relative bg-gray-900 rounded-md overflow-hidden aspect-video flex items-center justify-center">
            {isVideoEnabled ? (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <User className="h-16 w-16 mb-2" />
                <span>Camera is off</span>
              </div>
            )}
          </div>
        </div>

        {/* Device selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="audioDevice" className="text-sm font-medium">
              Microphone
            </Label>
            <select
              id="audioDevice"
              value={selectedAudioDevice}
              onChange={(e) => setSelectedAudioDevice(e.target.value)}
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
            >
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label ||
                    `Microphone ${audioDevices.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="videoDevice" className="text-sm font-medium">
              Camera
            </Label>
            <select
              id="videoDevice"
              value={selectedVideoDevice}
              onChange={(e) => setSelectedVideoDevice(e.target.value)}
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
            >
              {videoDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4 pt-2">
          <Button
            type="button"
            variant={isMicEnabled ? "outline" : "destructive"}
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={toggleMic}
          >
            <Mic className={`h-5 w-5 ${!isMicEnabled && "line-through"}`} />
          </Button>
          <Button
            type="button"
            variant={isVideoEnabled ? "outline" : "destructive"}
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={toggleVideo}
          >
            <Video className={`h-5 w-5 ${!isVideoEnabled && "line-through"}`} />
          </Button>
        </div>

        {/* Join button */}
        <Button
          type="button"
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 text-lg font-medium"
          onClick={handleJoinMeeting}
        >
          Join Meeting
        </Button>
      </CardContent>
    </Card>
  );
};

export default PreMeetingSettings;
