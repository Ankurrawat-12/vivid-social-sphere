
import React from "react";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 pb-14 md:pb-0 container max-w-6xl mx-auto px-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
