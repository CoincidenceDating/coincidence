import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SwipePage from "@/pages/swipe";
import CoincidencePage from "@/pages/coincidence";
import { Heart, Zap } from "lucide-react";

const queryClient = new QueryClient();

type Tab = "swipe" | "coincidence";

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

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1">
        {activeTab === "swipe" ? <SwipePage /> : <CoincidencePage />}
      </main>

      <nav className="sticky bottom-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("swipe")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              activeTab === "swipe"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart
              className={`w-5 h-5 ${activeTab === "swipe" ? "fill-primary" : ""}`}
            />
            Swipe
          </button>
          <button
            onClick={() => setActiveTab("coincidence")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              activeTab === "coincidence"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap
              className={`w-5 h-5 ${activeTab === "coincidence" ? "fill-primary" : ""}`}
            />
            Coincidence
          </button>
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
