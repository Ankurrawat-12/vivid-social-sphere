
import React from "react";
import { Link } from "react-router-dom";
import { Home, Search, PlusSquare, Heart, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import UploadPostForm from "../posts/UploadPostForm";

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;
  const { profile } = useAuth();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 md:hidden">
        <div className="flex items-center justify-around py-3">
          <Link to="/" className={cn("nav-icon", path === "/" && "text-social-purple")}>
            <Home className="h-6 w-6" />
          </Link>
          <Link to="/explore" className={cn("nav-icon", path === "/explore" && "text-social-purple")}>
            <Search className="h-6 w-6" />
          </Link>
          <div className={cn("nav-icon cursor-pointer")} onClick={() => setIsUploadOpen(true)}>
            <PlusSquare className="h-6 w-6" />
          </div>
          <Link to="/notifications" className={cn("nav-icon", path === "/notifications" && "text-social-purple")}>
            <Heart className="h-6 w-6" />
          </Link>
          <Link to={`/profile/${profile?.username}`} className={cn("nav-icon", path.startsWith("/profile") && "text-social-purple")}>
            <User className="h-6 w-6" />
          </Link>
        </div>
      </div>

      {/* Upload post modal */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Create New Post</DialogTitle>
          <UploadPostForm onSuccess={() => setIsUploadOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BottomNav;
