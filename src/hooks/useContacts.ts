
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const useContacts = () => {
  const { user } = useAuth();

  // Fetch all profiles for the contacts list
  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user?.id || "")
        .order("username", { ascending: true });

      if (error) {
        console.error("Error fetching profiles:", error);
        toast.error("Failed to load contacts");
        throw error;
      }

      return data as Profile[];
    },
  });

  return {
    profiles,
    isLoadingProfiles
  };
};
