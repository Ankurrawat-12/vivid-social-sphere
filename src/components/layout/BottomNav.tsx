
import React from "react";
import { Link } from "react-router-dom";
import { Home, Search, PlusSquare, Heart, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 md:hidden">
      <div className="flex items-center justify-around py-3">
        <Link to="/" className={cn("nav-icon", path === "/" && "text-social-purple")}>
          <Home />
        </Link>
        <Link to="/explore" className={cn("nav-icon", path === "/explore" && "text-social-purple")}>
          <Search />
        </Link>
        <Link to="/create" className={cn("nav-icon", path === "/create" && "text-social-purple")}>
          <PlusSquare />
        </Link>
        <Link to="/activity" className={cn("nav-icon", path === "/activity" && "text-social-purple")}>
          <Heart />
        </Link>
        <Link to="/profile" className={cn("nav-icon", path === "/profile" && "text-social-purple")}>
          <User />
        </Link>
      </div>
    </div>
  );
};

export default BottomNav;
