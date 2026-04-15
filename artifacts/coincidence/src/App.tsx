import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SwipePage from "@/pages/swipe";
import CoincidencePage from "@/pages/coincidence";
import MatchesPage from "@/pages/matches";
import ProfilePage from "@/pages/profile";
import { Heart, Zap, Sparkles, User } from "lucide-react";
import type { Match } from "@/lib/data";

const queryClient = new QueryClient();

type Tab = "swipe" | "coincidence" | "matches" | "profile";

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFading(true), 1800);
    const done = setTimeout(() => onDone(), 2300);
    return () => { clearTimeout(timer); clearTimeout(done); };
  }, [onDone]);

  return (
    <div
      onClick={() => { setFading(true); setTimeout(onDone, 400); }}
      style={{
        position: "fixed",
        inset: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0f0f0f",
        color: "white",
        textAlign: "center",
        cursor: "pointer",
        zIndex: 9999,
        transition: "opacity 0.5s ease",
        opacity: fading ? 0 : 1,
      }}
    >
      <h1 style={{ fontSize: "3rem", marginBottom: "1rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
        Coincidence
      </h1>
      <p style={{ fontSize: "1.2rem", opacity: 0.6, fontStyle: "italic" }}>
        making the invisible string – visible
      </p>
    </div>
  );
}

function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("swipe");
  const [matches, setMatches] = useState<Match[]>([]);
  const [newMatchCount, setNewMatchCount] = useState(0);

  const unseenMatches = newMatchCount;

  function handleMatch(match: Match) {
    setMatches((prev) => [...prev, match]);
    if (activeTab !== "matches") {
      setNewMatchCount((c) => c + 1);
    }
  }

  function handleTabChange(tab: Tab) {
    if (tab === "matches") setNewMatchCount(0);
    setActiveTab(tab);
  }

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  const tabs: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      id: "swipe",
      label: "Swipe",
      icon: (active) => <Heart className={`w-5 h-5 ${active ? "fill-primary" : ""}`} />,
    },
    {
      id: "coincidence",
      label: "Coincidence",
      icon: (active) => <Zap className={`w-5 h-5 ${active ? "fill-primary" : ""}`} />,
    },
    {
      id: "matches",
      label: "Matches",
      icon: (active) => (
        <div className="relative">
          <Sparkles className={`w-5 h-5 ${active ? "fill-primary" : ""}`} />
          {unseenMatches > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
              {unseenMatches > 9 ? "9+" : unseenMatches}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (active) => <User className={`w-5 h-5 ${active ? "fill-primary" : ""}`} />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1">
        {activeTab === "swipe" && <SwipePage onMatch={handleMatch} />}
        {activeTab === "coincidence" && <CoincidencePage onMatch={handleMatch} />}
        {activeTab === "matches" && <MatchesPage matches={matches} />}
        {activeTab === "profile" && <ProfilePage matches={matches} />}
      </main>

      <nav className="sticky bottom-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex max-w-lg mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon(activeTab === tab.id)}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppShell />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
