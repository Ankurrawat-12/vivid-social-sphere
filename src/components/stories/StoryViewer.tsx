
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Story } from '@/types/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface StoryViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stories: Story[];
  initialStoryIndex?: number;
}

const StoryViewer: React.FC<StoryViewerProps> = ({
  open,
  onOpenChange,
  stories,
  initialStoryIndex = 0,
}) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const queryClient = useQueryClient();
  
  const currentStory = stories[currentIndex];
  
  // Handle progress bar logic
  useEffect(() => {
    if (!open || !currentStory || isPaused) return;
    
    let startTime = Date.now();
    const duration = 5000; // 5 seconds per story
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(100, (elapsed / duration) * 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        goToNextStory();
      }
    };
    
    const timer = setInterval(updateProgress, 100);
    
    return () => {
      clearInterval(timer);
    };
  }, [currentIndex, open, isPaused, currentStory]);

  // Mark story as viewed when first opened
  useEffect(() => {
    const markAsViewed = async () => {
      if (!open || !currentStory || !user) return;
      
      // Check if already viewed
      const { data } = await supabase
        .from('story_views')
        .select('id')
        .eq('story_id', currentStory.id)
        .eq('viewer_id', user.id)
        .maybeSingle();
        
      // If not viewed, insert view record
      if (!data) {
        await supabase
          .from('story_views')
          .insert({
            story_id: currentStory.id,
            viewer_id: user.id,
          });
          
        // Invalidate stories query to refresh viewed status
        queryClient.invalidateQueries({ queryKey: ['stories'] });
      }
    };
    
    markAsViewed();
  }, [currentStory, user, open, queryClient]);

  const goToPreviousStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else {
      // If at the first story, close the viewer
      onOpenChange(false);
    }
  };

  const goToNextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      // If at the last story, close the viewer
      onOpenChange(false);
    }
  };

  if (!currentStory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 h-[80vh] bg-black text-white overflow-hidden">
        <div className="relative h-full w-full flex flex-col">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
            {stories.map((story, index) => (
              <div 
                key={story.id} 
                className="h-1 bg-gray-600 flex-1 overflow-hidden rounded-full"
              >
                {index === currentIndex && (
                  <div 
                    className="h-full bg-white rounded-full" 
                    style={{ width: `${progress}%` }} 
                  />
                )}
                {index < currentIndex && (
                  <div className="h-full bg-white rounded-full w-full" />
                )}
              </div>
            ))}
          </div>
          
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border border-white/20">
                <AvatarImage 
                  src={currentStory.profile?.avatar_url || ''} 
                  alt={currentStory.profile?.username || ''} 
                />
                <AvatarFallback>
                  {currentStory.profile?.username?.substring(0, 2).toUpperCase() || ''}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{currentStory.profile?.username}</p>
                <p className="text-xs opacity-70">
                  {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20" 
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Story Content */}
          <div 
            className="flex-1 flex items-center justify-center"
            onClick={() => setIsPaused(!isPaused)}
          >
            {currentStory.media_type === 'image' && (
              <img
                src={currentStory.media_url}
                alt="Story"
                className="max-h-full max-w-full object-contain"
              />
            )}
            {currentStory.media_type === 'video' && (
              <video
                src={currentStory.media_url}
                className="max-h-full max-w-full object-contain"
                autoPlay
                muted
                loop
              />
            )}
          </div>
          
          {/* Navigation */}
          <button 
            className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-start pl-4"
            onClick={(e) => {
              e.stopPropagation();
              goToPreviousStory();
            }}
          >
            <ChevronLeft className={cn(
              "h-6 w-6 text-white opacity-0 transition-opacity", 
              { "opacity-70 hover:opacity-100": currentIndex > 0 }
            )} />
          </button>
          
          <button 
            className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-4"
            onClick={(e) => {
              e.stopPropagation();
              goToNextStory();
            }}
          >
            <ChevronRight className="h-6 w-6 text-white opacity-70 hover:opacity-100" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryViewer;
