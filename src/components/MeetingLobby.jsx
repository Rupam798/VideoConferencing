import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PreMeetingSettings from "./PreMeetingSettings";
import MeetingRoom from "./MeetingRoom";

const MeetingLobby = ({ meetingId: propMeetingId }) => {
  const params = useParams();
  const navigate = useNavigate();
  const meetingId = propMeetingId || params?.meetingId;
  const [joinedMeeting, setJoinedMeeting] = useState(false);
  const [userSettings, setUserSettings] = useState(null);

  const handleJoinMeeting = (settings) => {
    setUserSettings(settings);
    setJoinedMeeting(true);
  };

  const handleLeaveMeeting = () => {
    setJoinedMeeting(false);
    if (navigate) {
      navigate("/");
    }
  };

  if (!meetingId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:text-white">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full transform transition-all duration-300 hover:scale-105">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Video className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
            Invalid Meeting
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            No meeting ID was provided.
          </p>
          <button
            onClick={() =>
              navigate ? navigate("/") : (window.location.href = "/")
            }
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return joinedMeeting && userSettings ? (
    <MeetingRoom
      meetingId={meetingId}
      onLeaveCall={handleLeaveMeeting}
      initialSettings={userSettings}
    />
  ) : (
    <PreMeetingSettings meetingId={meetingId} onJoin={handleJoinMeeting} />
  );
};

export default MeetingLobby;
