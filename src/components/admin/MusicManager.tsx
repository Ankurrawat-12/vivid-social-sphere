
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Clock } from "lucide-react";
import { MusicUploadForm } from "./MusicUploadForm";

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: string | null;
  duration: number;
  file_url: string;
  created_at: string;
}

export const MusicManager = () => {
  const { data: musicTracks = [], isLoading } = useQuery({
    queryKey: ["musicLibrary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_library")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as MusicTrack[];
    }
  });

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <MusicUploadForm />
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Music Library</h3>
        
        {isLoading ? (
          <div className="text-center">Loading music library...</div>
        ) : (
          <div className="grid gap-4">
            {musicTracks.map((track) => (
              <Card key={track.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Music className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-medium">{track.title}</h4>
                      <p className="text-sm text-muted-foreground">{track.artist}</p>
                      {track.genre && (
                        <Badge variant="outline" className="mt-1">
                          {track.genre}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDuration(track.duration)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
