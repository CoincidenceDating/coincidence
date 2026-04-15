import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SwipePage from "@/pages/swipe";
import CoincidencePage from "@/pages/coincidence";
import { Heart, Zap } from "lucide-react";

const queryClient = new QueryClient();

type Tab = "swipe" | "coincidence";

function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("swipe");

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
