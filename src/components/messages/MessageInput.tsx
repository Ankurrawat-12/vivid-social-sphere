
import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Mic, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createBucketIfNotExists } from "@/integrations/supabase/client";

interface MessageInputProps {
  onSendMessage: (text: string, file?: File) => void;
  isSubmitting: boolean;
  onInputChange?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  isSubmitting,
  onInputChange
}) => {
  const [messageText, setMessageText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Ensure the messages bucket exists when component mounts
  useEffect(() => {
    createBucketIfNotExists('messages');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !mediaFile) || isSubmitting) return;
    
    try {
      onSendMessage(messageText.trim(), mediaFile || undefined);
      setMessageText("");
      clearMedia();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    // Trigger typing indicator
    if (onInputChange && e.target.value.trim()) {
      onInputChange();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("File is too large. Maximum size is 10MB.");
        return;
      }

      setMediaFile(file);
      const objectUrl = URL.createObjectURL(file);
      setMediaPreview(objectUrl);
    }
  };

  const clearMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.addEventListener("dataavailable", (event) => {
        audioChunksRef.current.push(event.data);
      });
      
      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voice-message.webm", { type: "audio/webm" });
        setMediaFile(audioFile);
        
        const audioUrl = URL.createObjectURL(audioBlob);
        setMediaPreview(audioUrl);
      });
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Could not access microphone. Please check your permissions.");
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      setMediaStream(null);
      setIsRecording(false);
    }
  };

  return (
    <div className="p-4 border-t border-border">
      {mediaPreview && (
        <div className="mb-2 relative w-24 h-24 bg-muted rounded-md overflow-hidden">
          {mediaFile?.type.startsWith("image/") ? (
            <img 
              src={mediaPreview} 
              alt="Media preview" 
              className="w-full h-full object-cover"
            />
          ) : mediaFile?.type.startsWith("video/") ? (
            <video 
              src={mediaPreview} 
              className="w-full h-full object-cover" 
              controls 
            />
          ) : mediaFile?.type.startsWith("audio/") ? (
            <div className="flex items-center justify-center h-full">
              <audio src={mediaPreview} controls className="w-full max-w-[90%]" />
            </div>
          ) : null}
          
          <button 
            type="button"
            onClick={clearMedia}
            className="absolute top-0 right-0 bg-black bg-opacity-50 rounded-full p-1"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-grow flex gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = "image/*";
                fileInputRef.current.click();
              }
            }}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            size="icon"
            variant={isRecording ? "destructive" : "ghost"}
            onMouseDown={() => !isRecording && startRecording()}
            onMouseUp={() => isRecording && stopRecording()}
            onTouchStart={() => !isRecording && startRecording()}
            onTouchEnd={() => isRecording && stopRecording()}
          >
            <Mic className="h-4 w-4" />
          </Button>
          
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={handleFileChange}
          />
          
          <Input
            placeholder={isRecording ? "Recording..." : "Message..."}
            value={messageText}
            onChange={handleTextChange}
            className="flex-1"
            disabled={isRecording}
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={(!messageText.trim() && !mediaFile) || isSubmitting || isRecording}
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};

export default MessageInput;
