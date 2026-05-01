import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/landing";
import AnimatedSplash from "@/pages/splash-animated";
import SwipePage from "@/pages/swipe";
import CoincidencePage from "@/pages/coincidence";
import MatchesPage from "@/pages/matches";
import UndecidedPage from "@/pages/undecided";
import ProfilePage from "@/pages/profile";
import ChatPage, { type Message } from "@/pages/chat";
import SetupPage, { type SetupData } from "@/pages/setup";
import AuthPage, { type AccountData } from "@/pages/auth";
import ReloginPage from "@/pages/relogin";
import { Heart, Zap, Sparkles, HelpCircle, User, Loader2 } from "lucide-react";
import { StringIcon } from "@/components/StringIcon";
import type { Match, CheckIn } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import * as db from "@/lib/db";

const queryClient = new QueryClient();

type Tab = "swipe" | "coincidence" | "matches" | "undecided" | "profile";

function getOpeningText(match: Match): string {
  if (match.source === "swipe") return "Hey! We matched 👋 How's your day going?";
  const loc = match.locationName ?? "there";
  if (match.locationIcon === "coffee") return `This place has the best coffee, right? So glad we found each other at ${loc}!`;
  if (match.locationIcon === "wine") return `What a night at ${loc}! Really glad we connected 🍷`;
  if (match.locationIcon === "beer") return `${loc} is my favourite spot. Crazy we hadn't crossed paths before!`;
  return `What are the odds of running into you at ${loc}? Glad we did 😄`;
}



function AppShell() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [dataLoading, setDataLoading]   = useState(false);
  const [showSetup, setShowSetup]       = useState(false);
  const [account, setAccount]           = useState<AccountData | null>(null);
  const [isLoggedOut, setIsLoggedOut]   = useState(false);
  const [activeTab, setActiveTab]       = useState<Tab>("swipe");

  const hasAccount = !!localStorage.getItem("coincidence-has-account");
  const [showLanding, setShowLanding]   = useState(!hasAccount);
  const [showSplash, setShowSplash]     = useState(true);

  const [lookingFor, setLookingFor]     = useState("Everyone");
  const [matches, setMatches]           = useState<Match[]>([]);
  const [undecided, setUndecided]       = useState<Match[]>([]);
  const [newMatchCount, setNewMatchCount]       = useState(0);
  const [newUndecidedCount, setNewUndecidedCount] = useState(0);
  const [activeChat, setActiveChat]     = useState<Match | null>(null);
  const [threads, setThreads]           = useState<Record<string, Message[]>>({});
  const [checkIns, setCheckIns]         = useState<CheckIn[]>([]);
  const [boostCredits, setBoostCredits]       = useState(3);
  const [boostActiveUntil, setBoostActiveUntil] = useState<number | null>(null);
  const [boostTimeLeft, setBoostTimeLeft]       = useState(0);
  const [boostRadius, setBoostRadius]           = useState(5);
  const [blockedIds, setBlockedIds]     = useState<string[]>([]);
  const [swipedIds, setSwipedIds]       = useState<string[]>([]);

  const BOOST_DURATION_MS = 30 * 60 * 1000;
  const MAX_BOOST_CREDITS = 5;
  const isBoostActive = boostActiveUntil !== null && boostTimeLeft > 0;

  const checkedInLocations = new Set(checkIns.map((c) => c.locationId));

  // ── Session management ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const acct: AccountData = {
          id: u.id,
          email: u.email ?? "",
          phone: (u.user_metadata?.phone as string) ?? "",
        };
        localStorage.setItem("coincidence-has-account", "1");
        setShowLanding(false);
        setAccount(acct);
        setIsLoggedOut(false);
        loadUserData();
      }
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setAccount(null);
        setIsLoggedOut(true);
      } else if (event === "SIGNED_IN" && session?.user) {
        const u = session.user;
        setAccount({
          id: u.id,
          email: u.email ?? "",
          phone: (u.user_metadata?.phone as string) ?? "",
        });
        setIsLoggedOut(false);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUserData() {
    setDataLoading(true);
    try {
      const [m, u, t, c, boost, blocked, swiped, profile] = await Promise.all([
        db.getMatches(false),
        db.getMatches(true),
        db.getThreads(),
        db.getCheckins(),
        db.getBoost(),
        db.getBlocked(),
        db.getSwiped(),
        db.getProfile(),
      ]);
      setMatches(m);
      setUndecided(u);
      setThreads(t);
      setCheckIns(c);
      setBoostCredits(boost.credits);
      setBoostActiveUntil(boost.until && boost.until > Date.now() ? boost.until : null);
      setBoostRadius(boost.radius);
      setBlockedIds(blocked);
      setSwipedIds(swiped);
      if (profile) {
        setLookingFor(profile.looking_for ?? "Everyone");
        setShowSetup(!profile.setup_complete);
      } else {
        setShowSetup(true);
      }
    } finally {
      setDataLoading(false);
    }
  }

  // Countdown tick
  useEffect(() => {
    if (!boostActiveUntil) return;
    const tick = () => {
      const left = boostActiveUntil - Date.now();
      if (left <= 0) {
        setBoostTimeLeft(0);
        setBoostActiveUntil(null);
      } else {
        setBoostTimeLeft(left);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [boostActiveUntil]);

  function handleActivateBoost() {
    if (boostCredits <= 0 || isBoostActive) return;
    const newCredits = boostCredits - 1;
    const until = Date.now() + BOOST_DURATION_MS;
    setBoostCredits(newCredits);
    setBoostActiveUntil(until);
    setBoostTimeLeft(BOOST_DURATION_MS);
    db.upsertBoost(newCredits, until, boostRadius);
  }

  function handleCreateAccount(data: AccountData) {
    localStorage.setItem("coincidence-has-account", "1");
    setAccount(data);
    setIsLoggedOut(false);
    loadUserData();
  }

  function handleLogin() {
    setIsLoggedOut(false);
    loadUserData();
  }

  function handleSetupComplete(data: SetupData) {
    const profileFields = {
      name: data.name, age: data.age, bio: data.bio,
      hometown: data.hometown, height: data.height,
      hobbies: data.hobbies,
      looking_for: data.lookingFor ?? "Everyone",
      age_min: data.ageMin ?? 18, age_max: data.ageMax ?? 50,
      setup_complete: true,
    };
    db.upsertProfile(profileFields);
    setLookingFor(data.lookingFor ?? "Everyone");
    setShowSetup(false);
  }

  function handleResetSetup() {
    db.upsertProfile({ setup_complete: false });
    setShowSetup(true);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUndecided([]);
    setMatches([]);
    setNewMatchCount(0);
    setNewUndecidedCount(0);
    setActiveChat(null);
    setThreads({});
    setCheckIns([]);
    setBoostCredits(3);
    setBoostActiveUntil(null);
    setBoostTimeLeft(0);
    setBlockedIds([]);
    setSwipedIds([]);
    setActiveTab("swipe");
    setIsLoggedOut(true);
  }

  async function handleDeleteAccount() {
    await db.deleteAllUserData();
    await supabase.auth.signOut();
    setAccount(null);
    setMatches([]);
    setUndecided([]);
    setNewMatchCount(0);
    setNewUndecidedCount(0);
    setThreads({});
    setCheckIns([]);
    setBoostCredits(3);
    setBoostActiveUntil(null);
    setBoostTimeLeft(0);
    setBlockedIds([]);
    setSwipedIds([]);
    setLookingFor("Everyone");
    setShowSetup(true);
    setIsLoggedOut(false);
  }

  function handleCheckIn(checkIn: CheckIn) {
    setCheckIns((prev) => {
      if (prev.some((c) => c.locationId === checkIn.locationId)) return prev;
      db.addCheckin(checkIn);
      setBoostCredits((c) => {
        const next = Math.min(c + 1, MAX_BOOST_CREDITS);
        db.upsertBoost(next, boostActiveUntil, boostRadius);
        return next;
      });
      return [...prev, checkIn];
    });
  }

  function handleDoubleStringCredit() {
    setBoostCredits((c) => {
      const next = Math.max(0, c - 2);
      db.upsertBoost(next, boostActiveUntil, boostRadius);
      return next;
    });
  }

  const messageCounts = Object.fromEntries(
    Object.entries(threads).map(([id, msgs]) => [id, msgs.length])
  );

  function handleMatch(match: Match) {
    setMatches((prev) => {
      const exists = prev.some(
        (m) => m.profile.id === match.profile.id && m.source === match.source
      );
      if (exists) return prev;
      db.addMatch(match, false);
      return [...prev, match];
    });
    if (activeTab !== "matches") setNewMatchCount((c) => c + 1);
  }

  function handleMaybe(match: Match) {
    setUndecided((prev) => {
      const exists = prev.some((m) => m.profile.id === match.profile.id);
      if (exists) return prev;
      db.addMatch(match, true);
      return [...prev, match];
    });
    if (activeTab !== "undecided") setNewUndecidedCount((c) => c + 1);
  }

  function handleUndecidedDecision(match: Match, decision: "yes" | "no") {
    setUndecided((prev) => prev.filter((m) => m.profile.id !== match.profile.id));
    if (decision === "yes") {
      db.promoteUndecided(match.profile.id);
      handleMatch(match);
    } else {
      db.removeMatch(match.profile.id);
    }
  }

  function handleTabChange(tab: Tab) {
    if (tab === "matches") setNewMatchCount(0);
    if (tab === "undecided") setNewUndecidedCount(0);
    if (tab === "swipe" || tab === "coincidence") {
      db.getProfile().then((p) => { if (p?.looking_for) setLookingFor(p.looking_for); });
    }
    setActiveTab(tab);
  }

  function handleOpenChat(match: Match) {
    setThreads((prev) => {
      if (prev[match.profile.id]) { return prev; }
      const opening: Message = {
        id: `open-${match.profile.id}`,
        text: getOpeningText(match),
        from: "them",
        timestamp: Date.now(),
      };
      const updated = { ...prev, [match.profile.id]: [opening] };
      db.upsertThread(match.profile.id, updated[match.profile.id]);
      return updated;
    });
    setActiveChat(match);
  }

  function handleSend(profileId: string, text: string) {
    const isTheirReply = profileId.startsWith("__them__");
    const realId = isTheirReply ? profileId.replace("__them__", "") : profileId;
    const msg: Message = {
      id: `${realId}-${Date.now()}-${Math.random()}`,
      text, from: isTheirReply ? "them" : "me", timestamp: Date.now(),
    };
    setThreads((prev) => {
      const updated = { ...prev, [realId]: [...(prev[realId] ?? []), msg] };
      db.upsertThread(realId, updated[realId]);
      return updated;
    });
  }

  if (!sessionChecked) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (showLanding && !account) return (
    <AnimatePresence>
      <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
        <LandingPage onGetStarted={() => setShowLanding(false)} />
      </motion.div>
    </AnimatePresence>
  );
  if (showSplash && (!!account || hasAccount)) return (
    <AnimatePresence>
      <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
        <AnimatedSplash onDone={() => setShowSplash(false)} />
      </motion.div>
    </AnimatePresence>
  );
  if (isLoggedOut) return (
    <AnimatePresence>
      <motion.div key="relogin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        <ReloginPage onLogin={handleLogin} />
      </motion.div>
    </AnimatePresence>
  );
  if (!account) return (
    <AnimatePresence>
      <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        <AuthPage
          defaultMode="create"
          existingAccount={null}
          onCreateAccount={handleCreateAccount}
          onLogin={handleLogin}
        />
      </motion.div>
    </AnimatePresence>
  );
  if (showSetup) return (
    <AnimatePresence>
      <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        <SetupPage onComplete={handleSetupComplete} />
      </motion.div>
    </AnimatePresence>
  );

  const tabs: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      id: "swipe",
      label: "Discover",
      icon: (a) => (
        <div className="relative">
          <Sparkles className={`w-5 h-5 ${a ? "fill-primary text-primary" : ""}`} />
          {isBoostActive && (
            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full gradient-btn border-2 border-background" />
          )}
        </div>
      ),
    },
    {
      id: "coincidence",
      label: "Coincidence",
      icon: (a) => <StringIcon className={`w-5 h-5 ${a ? "text-primary" : ""}`} />,
    },
    {
      id: "matches",
      label: "Matches",
      icon: (a) => (
        <div className="relative">
          <Heart className={`w-5 h-5 ${a ? "fill-primary text-primary" : ""}`} />
          {newMatchCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full gradient-btn text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {newMatchCount > 9 ? "9+" : newMatchCount}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "undecided",
      label: "Maybe",
      icon: (a) => (
        <div className="relative">
          <HelpCircle className={`w-5 h-5 ${a ? "fill-primary text-primary" : ""}`} />
          {newUndecidedCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full gradient-btn text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {newUndecidedCount > 9 ? "9+" : newUndecidedCount}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (a) => <User className={`w-5 h-5 ${a ? "fill-primary text-primary" : ""}`} />,
    },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-background">
      <main className="flex-1 min-h-0 overflow-y-auto relative" style={{ zIndex: 1 }}>
        {activeTab === "swipe" && <SwipePage onMatch={handleMatch} onMaybe={handleMaybe} isBoostActive={isBoostActive} boostTimeLeft={boostTimeLeft} boostRadius={boostRadius} boostCredits={boostCredits} onActivateBoost={handleActivateBoost} onDoubleStringCredit={handleDoubleStringCredit} lookingFor={lookingFor} blockedIds={blockedIds} swipedIds={swipedIds} onSwiped={(id) => { setSwipedIds((prev) => prev.includes(id) ? prev : [...prev, id]); db.addSwiped(id); }} onGoToProfile={() => setActiveTab("profile")} />}
        {activeTab === "coincidence" && <CoincidencePage onMatch={handleMatch} onMaybe={handleMaybe} onCheckIn={handleCheckIn} onSendMessage={handleOpenChat} checkedInLocations={checkedInLocations} lookingFor={lookingFor} boostCredits={boostCredits} onDoubleStringCredit={handleDoubleStringCredit} blockedIds={blockedIds} />}
        {activeTab === "matches" && (
          <MatchesPage matches={matches} messageCounts={messageCounts} checkIns={checkIns} onOpenChat={handleOpenChat} />
        )}
        {activeTab === "undecided" && (
          <UndecidedPage undecided={undecided} onDecide={handleUndecidedDecision} />
        )}
        {activeTab === "profile" && <ProfilePage matches={matches} checkIns={checkIns} boostCredits={boostCredits} isBoostActive={isBoostActive} boostTimeLeft={boostTimeLeft} boostRadius={boostRadius} onBoostRadiusChange={(r) => { setBoostRadius(r); db.upsertBoost(boostCredits, boostActiveUntil, r); }} onActivateBoost={handleActivateBoost} onAddCredits={(n) => { setBoostCredits((c) => { const next = c + n; db.upsertBoost(next, boostActiveUntil, boostRadius); return next; }); }} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} />}
      </main>

      {/* Nav bar */}
      <div className="sticky bottom-0" style={{ zIndex: 1 }}>
        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <nav className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-safe">
          <div className="flex max-w-lg mx-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors ${
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                {tab.icon(activeTab === tab.id)}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {activeChat && (
          <ChatPage
            key={activeChat.profile.id}
            match={activeChat}
            messages={threads[activeChat.profile.id] ?? []}
            onSend={handleSend}
            onBack={() => setActiveChat(null)}
            onUnmatch={() => {
              const id = activeChat.profile.id;
              setActiveChat(null);
              setMatches((prev) => prev.filter((m) => m.profile.id !== id));
              setBlockedIds((prev) => { if (prev.includes(id)) return prev; db.addBlocked(id); return [...prev, id]; });
              db.removeMatch(id);
            }}
            onReport={() => {
              const id = activeChat.profile.id;
              setActiveChat(null);
              setMatches((prev) => prev.filter((m) => m.profile.id !== id));
              setBlockedIds((prev) => { if (prev.includes(id)) return prev; db.addBlocked(id); return [...prev, id]; });
              db.removeMatch(id);
            }}
          />
        )}
      </AnimatePresence>
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
