
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

      console.log("Fetching user role for:", user.id);

      // First check if this is the admin email
      if (user.email === "ankurrawat620@gmail.com") {
        console.log("Admin email detected, checking database role...");
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .order("granted_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching user role:", error);
        return "user";
      }
      
      console.log("User roles data:", data);
      
      // Check for admin role first, then creator, then default to user
      const adminRole = data?.find(r => r.role === "admin");
      const creatorRole = data?.find(r => r.role === "creator");
      
      let role: UserRole = "user";
      if (adminRole) {
        role = "admin";
      } else if (creatorRole) {
        role = "creator";
      }
      
      console.log("Final user role:", role);
      
      return role;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds to ensure role updates are picked up
  });

  return {
    userRole,
    isLoading,
    isAdmin: userRole === "admin",
    isCreator: userRole === "creator" || userRole === "admin",
    isUser: userRole === "user"
  };
};
