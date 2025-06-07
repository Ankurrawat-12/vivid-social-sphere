
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { BannedUserProtection } from "./BannedUserProtection";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-social-purple"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <BannedUserProtection>
      {children}
    </BannedUserProtection>
  );
};

export default ProtectedRoute;
