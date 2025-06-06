
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, createBucketIfNotExists } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Music, Plus, Trash2, Upload } from "lucide-react";

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  file_url: string;
  duration: number;
  genre: string | null;
  created_at: string;
}

export const MusicManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddingMusic, setIsAddingMusic] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch music library
  const { data: musicTracks = [], isLoading } = useQuery({
    queryKey: ["adminMusicLibrary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_library")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as MusicTrack[];
    }
  });

  // Add music mutation
  const addMusicMutation = useMutation({
    mutationFn: async ({ title, artist, genre, file }: { title: string; artist: string; genre: string; file: File }) => {
      if (!user) throw new Error("User not authenticated");

      // Ensure music library bucket exists
      await createBucketIfNotExists('music-library');

      // Upload music file
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("music-library")
        .upload(filePath, file);
        
      if (uploadError) {
        console.error("Error uploading music file:", uploadError);
        throw new Error(uploadError.message);
      }
      
      const { data: publicUrlData } = supabase.storage
        .from("music-library")
        .getPublicUrl(filePath);
        
      if (!publicUrlData?.publicUrl) {
        throw new Error("Failed to get public URL for uploaded music");
      }

      // Get audio duration
      const audio = new Audio();
      const duration = await new Promise<number>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          resolve(audio.duration);
        });
        audio.src = URL.createObjectURL(file);
      });

      // Save to database
      const { data, error } = await supabase
        .from("music_library")
        .insert({
          title,
          artist,
          genre: genre || null,
          file_url: publicUrlData.publicUrl,
          duration,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminMusicLibrary"] });
      queryClient.invalidateQueries({ queryKey: ["musicLibrary"] });
      toast.success("Music added successfully");
      setIsAddingMusic(false);
      setTitle("");
      setArtist("");
      setGenre("");
      setMusicFile(null);
    },
    onError: (error) => {
      console.error("Error adding music:", error);
      toast.error("Failed to add music");
    }
  });

  // Delete music mutation
  const deleteMusicMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const { error } = await supabase
        .from("music_library")
        .delete()
        .eq("id", trackId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminMusicLibrary"] });
      queryClient.invalidateQueries({ queryKey: ["musicLibrary"] });
      toast.success("Music deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting music:", error);
      toast.error("Failed to delete music");
    }
  });

  const handleAddMusic = async () => {
    if (!title || !artist || !musicFile) {
      toast.error("Please fill in all required fields and select a music file");
      return;
    }

    setIsUploading(true);
    try {
      await addMusicMutation.mutateAsync({ title, artist, genre, file: musicFile });
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Music Library Management</h3>
        <Dialog open={isAddingMusic} onOpenChange={setIsAddingMusic}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Music
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Music Track</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Song title"
                />
              </div>
              
              <div>
                <Label htmlFor="artist">Artist *</Label>
                <Input
                  id="artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Artist name"
                />
              </div>
              
              <div>
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Music genre"
                />
              </div>
              
              <div>
                <Label htmlFor="music-file">Music File *</Label>
                <Input
                  id="music-file"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setMusicFile(e.target.files?.[0] || null)}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingMusic(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMusic} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Music
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center">Loading music library...</div>
      ) : (
        <div className="grid gap-4">
          {musicTracks.map((track) => (
            <Card key={track.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Music className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">{track.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {track.artist} • {formatDuration(track.duration)}
                      {track.genre && ` • ${track.genre}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <audio controls className="h-8">
                    <source src={track.file_url} type="audio/mpeg" />
                  </audio>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMusicMutation.mutate(track.id)}
                    disabled={deleteMusicMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {musicTracks.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No music tracks in the library yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
