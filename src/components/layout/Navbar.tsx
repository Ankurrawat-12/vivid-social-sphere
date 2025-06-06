
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  Home, 
  LogOut, 
  Menu, 
  MessageCircle, 
  PlusSquare, 
  Search, 
  User,
  Shield
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import UploadPostForm from '../posts/UploadPostForm';

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut?.();
    navigate('/auth');
  };

  const navigateToSearch = () => {
    navigate('/explore');
  };

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Close mobile menu when a link is clicked
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="border-b py-2 bg-background sticky top-0 z-10 backdrop-blur-lg bg-opacity-90">
      <div className="container max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold">
          VividSphere
        </Link>

        {/* Desktop Navigation */}
        {!isMobile && user && (
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            
            <Button variant="ghost" size="icon" onClick={navigateToSearch}>
              <Search className="h-5 w-5" />
            </Button>
            
            <Link to="/messages">
              <Button variant="ghost" size="icon">
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>
            
            <Button variant="ghost" size="icon" onClick={() => setIsUploadOpen(true)}>
              <PlusSquare className="h-5 w-5" />
            </Button>
            
            <Link to="/notifications">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>

            {/* Admin Button - Only show for admins */}
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="icon">
                  <Shield className="h-5 w-5" />
                </Button>
              </Link>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback>{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <Link to={`/profile/${profile?.username}`}>
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                </Link>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <Link to="/admin">
                      <DropdownMenuItem className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                      </DropdownMenuItem>
                    </Link>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Mobile Header Options */}
        {isMobile && user && (
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={navigateToSearch}>
              <Search className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={() => setIsUploadOpen(true)}>
              <PlusSquare className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Authentication Buttons */}
        {!user && (
          <div>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Menu Sheet */}
      {isMobile && (
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetContent side="right" className="w-[80vw]">
            <SheetHeader className="mb-4">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            
            {/* Mobile Menu Items */}
            <div className="space-y-3">
              <div onClick={() => { navigate('/'); closeMenu(); }} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-accent rounded-md">
                <Home className="h-5 w-5" />
                <span>Home</span>
              </div>
              
              <div onClick={() => { navigate('/explore'); closeMenu(); }} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-accent rounded-md">
                <Search className="h-5 w-5" />
                <span>Search & Explore</span>
              </div>
              
              <div onClick={() => { navigate('/profile/' + profile?.username); closeMenu(); }} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-accent rounded-md">
                <User className="h-5 w-5" />
                <span>Profile</span>
              </div>
              
              <div onClick={() => { navigate('/messages'); closeMenu(); }} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-accent rounded-md">
                <MessageCircle className="h-5 w-5" />
                <span>Messages</span>
              </div>
              
              <div onClick={() => { navigate('/notifications'); closeMenu(); }} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-accent rounded-md">
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
              </div>
              
              <div onClick={() => { setIsUploadOpen(true); closeMenu(); }} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-accent rounded-md">
                <PlusSquare className="h-5 w-5" />
                <span>Create Post</span>
              </div>

              {/* Admin option in mobile menu */}
              {isAdmin && (
                <div onClick={() => { navigate('/admin'); closeMenu(); }} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-accent rounded-md">
                  <Shield className="h-5 w-5" />
                  <span>Admin Panel</span>
                </div>
              )}
              
              <div onClick={handleLogout} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-accent rounded-md text-destructive">
                <LogOut className="h-5 w-5" />
                <span>Log Out</span>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Upload post modal */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Create New Post</DialogTitle>
          <UploadPostForm onSuccess={() => setIsUploadOpen(false)} />
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default Navbar;
