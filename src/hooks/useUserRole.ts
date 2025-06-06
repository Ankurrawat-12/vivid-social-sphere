
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "admin" | "creator" | "user";

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: userRole = "user", isLoading } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      if (!user) return "user";

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .order("granted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching user role:", error);
        return "user";
      }
      
      return (data?.role as UserRole) || "user";
    },
    enabled: !!user,
  });

  return {
    userRole,
    isLoading,
    isAdmin: userRole === "admin",
    isCreator: userRole === "creator" || userRole === "admin",
    isUser: userRole === "user"
  };
};
