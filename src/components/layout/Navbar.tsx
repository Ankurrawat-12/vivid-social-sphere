
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Home,
  Search,
  PlusSquare,
  Heart,
  MessageSquare,
  User,
  Bell,
  Menu,
  LogOut,
  Upload
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import UploadPostForm from "@/components/posts/UploadPostForm";

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const [notifications, setNotifications] = useState(2);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-50 px-4">
      <div className="container flex items-center justify-between h-full max-w-6xl mx-auto">
        <Link to="/" className="text-2xl font-bold text-social-purple">
          VividSocial
        </Link>

        {/* Mobile Menu Toggle */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>

        {/* Desktop Navigation */}
        {user && (
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="nav-icon">
              <Home />
            </Link>
            <Link to="/explore" className="nav-icon">
              <Search />
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setUploadDialogOpen(true)} className="nav-icon">
              <Upload />
            </Button>
            <Link to="/notifications" className="nav-icon relative">
              <Bell />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-social-purple text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </Link>
            <Link to="/messages" className="nav-icon">
              <MessageSquare />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full p-0 h-8 w-8">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.username || ''} />
                    <AvatarFallback>
                      {profile?.username?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/saved" className="flex gap-2">
                    <Heart className="h-4 w-4" />
                    Saved
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/notifications" className="flex gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="flex gap-2 cursor-pointer">
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        )}
      </div>

      {/* Upload Post Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Post</DialogTitle>
          </DialogHeader>
          <UploadPostForm onComplete={() => setUploadDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Navbar;
