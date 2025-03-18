import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { Send, X, MessageSquare } from "lucide-react";

const ChatPanel = ({
  isOpen = true,
  onClose = () => {},
  onSendMessage = () => {},
  messages = [
    {
      id: "1",
      sender: "John Doe",
      content: "Hello everyone! Welcome to the meeting.",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      isCurrentUser: false,
    },
    {
      id: "2",
      sender: "You",
      content: "Thanks for having me. Excited to discuss the project.",
      timestamp: new Date(Date.now() - 1000 * 60 * 4),
      isCurrentUser: true,
    },
    {
      id: "3",
      sender: "Sarah Johnson",
      content: "I have some questions about the timeline. Can we go over that?",
      timestamp: new Date(Date.now() - 1000 * 60 * 3),
      isCurrentUser: false,
    },
    {
      id: "4",
      sender: "You",
      content: "Sure, I have the timeline document ready to share.",
      timestamp: new Date(Date.now() - 1000 * 60 * 2),
      isCurrentUser: true,
    },
  ],
}) => {
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
        <h2 className="text-lg font-semibold flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Chat
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isCurrentUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] ${
                  message.isCurrentUser
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-primary-foreground shadow-md"
                    : "bg-muted dark:bg-gray-700 shadow-sm"
                } rounded-lg p-3 transition-all duration-300 hover:shadow-lg`}
              >
                {!message.isCurrentUser && (
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-6 w-6">
                      <div className="bg-muted-foreground text-xs font-medium text-white">
                        {message.sender
                          .split(" ")
                          .map((name) => name[0])
                          .join("")}
                      </div>
                    </Avatar>
                    <span className="text-xs font-medium">
                      {message.sender}
                    </span>
                  </div>
                )}
                <p className="text-sm">{message.content}</p>
                <div
                  className={`text-xs mt-1 ${message.isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white shadow-sm"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-300 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
