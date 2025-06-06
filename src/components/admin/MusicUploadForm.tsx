
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, Music } from "lucide-react";

export const MusicUploadForm = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadMusicMutation = useMutation({
    mutationFn: async ({ file, title, artist, genre }: {
      file: File;
      title: string;
      artist: string;
      genre: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Create audio element to get duration
      const audio = new Audio();
      const duration = await new Promise<number>((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => {
          resolve(audio.duration);
        });
        audio.addEventListener('error', reject);
        audio.src = URL.createObjectURL(file);
      });

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `music/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('music')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('music')
        .getPublicUrl(filePath);

      // Insert into music library
      const { error: insertError } = await supabase
        .from('music_library')
        .insert({
          title,
          artist,
          genre: genre || null,
          file_url: publicUrl,
          duration,
          created_by: user.id
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["musicLibrary"] });
      toast.success("Music uploaded successfully!");
      setTitle("");
      setArtist("");
      setGenre("");
      setFile(null);
    },
    onError: (error) => {
      console.error("Error uploading music:", error);
      toast.error("Failed to upload music");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !artist) {
      toast.error("Please fill in all required fields and select a file");
      return;
    }

    uploadMusicMutation.mutate({ file, title, artist, genre });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Upload Music
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Song title"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="artist">Artist *</Label>
            <Input
              id="artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="genre">Genre</Label>
            <Input
              id="genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="Music genre (optional)"
            />
          </div>
          
          <div>
            <Label htmlFor="file">Audio File *</Label>
            <Input
              id="file"
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={uploadMusicMutation.isPending}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploadMusicMutation.isPending ? "Uploading..." : "Upload Music"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
