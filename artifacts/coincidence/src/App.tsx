import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import LandingPage from "@/pages/landing";
import AnimatedSplash from "@/pages/splash-animated";
import SwipePage from "@/pages/swipe";
import CoincidencePage from "@/pages/coincidence";
import MatchesPage from "@/pages/matches";
import UndecidedPage from "@/pages/undecided";
import LikedPage from "@/pages/liked";
import ProfilePage from "@/pages/profile";
import ChatPage, { type Message } from "@/pages/chat";
import SetupPage, { type SetupData } from "@/pages/setup";
import AuthPage, { type AccountData } from "@/pages/auth";
import ReloginPage from "@/pages/relogin";
import { Heart, Sparkles, HelpCircle, User, Loader2, Eye } from "lucide-react";
import { StringIcon } from "@/components/StringIcon";
import type { Match, CheckIn, Profile } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import * as db from "@/lib/db";

const queryClient = new QueryClient();

type Tab = "swipe" | "coincidence" | "matches" | "liked" | "undecided" | "profile";

function getOpeningText(match: Match): string {
  if (match.source === "swipe") return "Hey! We matched 👋 How's your day going?";
  const loc = match.locationName ?? "there";
  if (match.locationIcon === "coffee") return `This place has the best coffee, right? So glad we found each other at ${loc}!`;
  if (match.locationIcon === "wine") return `What a night at ${loc}! Really glad we connected 🍷`;
  if (match.locationIcon === "beer") return `${loc} is my favourite spot. Crazy we hadn't crossed paths before!`;
  return `What are the odds of running into you at ${loc}? Glad we did 😄`;
}

function AppShell() {
  const { toast } = useToast();

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
  const [myProfileSnapshot, setMyProfileSnapshot] = useState<Profile | null>(null);
  const [discoverProfiles, setDiscoverProfiles] = useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profilePrefs, setProfilePrefs] = useState({ ageMin: 18, ageMax: 50 });
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
  const [discoverRadius, setDiscoverRadius]     = useState(25);
  const [userLat, setUserLat]   = useState<number | null>(null);
  const [userLng, setUserLng]   = useState<number | null>(null);
  const [blockedIds, setBlockedIds]     = useState<string[]>([]);
  const [swipedIds, setSwipedIds]       = useState<string[]>([]);
  const [whoLikedMeCount, setWhoLikedMeCount]         = useState(0);
  const [whoLikedMeProfiles, setWhoLikedMeProfiles]   = useState<Profile[]>([]);
  const [hasWhoLikedMeAccess, setHasWhoLikedMeAccess] = useState(false);
  const [whoLikedMeExpiresAt, setWhoLikedMeExpiresAt] = useState<number | null>(null);

  const matchesSubRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const gpsWatchRef    = useRef<number | null>(null);
  const lastGpsSaveRef = useRef<number>(0);

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
        loadUserData().then(() => startGpsWatch());
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

  function subscribeToIncomingMatches(userId: string) {
    if (matchesSubRef.current) {
      supabase.removeChannel(matchesSubRef.current);
    }
    matchesSubRef.current = db.subscribeToNewMatches(userId, (profileId, profileData) => {
      const profile = profileData as Match["profile"];
      const match: Match = { profile, source: "swipe", matchedAt: Date.now() };
      setMatches((prev) => {
        const exists = prev.some((m) => m.profile.id === profileId);
        if (exists) return prev;
        return [...prev, match];
      });
      setNewMatchCount((c) => c + 1);
      toast({
        title: "It's a match!",
        description: `You and ${profile.name.split(" ")[0]} both liked each other`,
      });
    });
  }

  async function loadUserData() {
    setDataLoading(true);
    try {
      const [m, u, t, c, boost, blocked, swiped, profile, likedMeCount, access, expiry] = await Promise.all([
        db.getMatches(false),
        db.getMatches(true),
        db.getThreads(),
        db.getCheckins(),
        db.getBoost(),
        db.getBlocked(),
        db.getSwiped(),
        db.getProfile(),
        db.getWhoLikedMeCount(),
        db.hasWhoLikedMeAccess(),
        db.getWhoLikedMeExpiry(),
      ]);
      setWhoLikedMeCount(likedMeCount);
      setHasWhoLikedMeAccess(access);
      setWhoLikedMeExpiresAt(expiry);
      if (access) {
        db.getWhoLikedMe().then(setWhoLikedMeProfiles);
      }
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
        const lf   = profile.looking_for ?? "Everyone";
        const amin = profile.age_min ?? 18;
        const amax = profile.age_max ?? 50;
        setLookingFor(lf);
        setProfilePrefs({ ageMin: amin, ageMax: amax });
        setShowSetup(!profile.setup_complete);
        if (profile.setup_complete) {
          setMyProfileSnapshot(db.buildProfileSnapshot(profile));
          refreshDiscoverProfiles(lf, amin, amax);
        }
      } else {
        setShowSetup(true);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        subscribeToIncomingMatches(user.id);
      }
    } finally {
      setDataLoading(false);
    }
  }

  async function refreshDiscoverProfiles(lf?: string, amin?: number, amax?: number, lat?: number | null, lng?: number | null, radiusMi?: number) {
    setIsLoadingProfiles(true);
    try {
      const profiles = await db.getDiscoverProfiles(
        lf  ?? lookingFor,
        amin ?? profilePrefs.ageMin,
        amax ?? profilePrefs.ageMax,
        lat  !== undefined ? lat  : userLat,
        lng  !== undefined ? lng  : userLng,
        radiusMi !== undefined ? radiusMi : discoverRadius,
      );
      setDiscoverProfiles(profiles);
    } finally {
      setIsLoadingProfiles(false);
    }
  }

  function stopGpsWatch() {
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
  }

  function startGpsWatch() {
    if (!navigator.geolocation) return;
    stopGpsWatch();

    const GPS_SAVE_INTERVAL_MS = 2 * 60 * 1000;

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude);
        setUserLng(longitude);

        const now = Date.now();
        if (now - lastGpsSaveRef.current > GPS_SAVE_INTERVAL_MS) {
          lastGpsSaveRef.current = now;
          db.updateUserLocation(latitude, longitude);
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60 * 1000 }
    );
  }

  // Refresh location the moment the user comes back to the tab
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && gpsWatchRef.current !== null) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setUserLat(latitude);
            setUserLng(longitude);
            lastGpsSaveRef.current = Date.now();
            db.updateUserLocation(latitude, longitude);
          },
          () => {},
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
        );
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

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
    const lf   = data.lookingFor ?? "Everyone";
    const amin = data.ageMin ?? 18;
    const amax = data.ageMax ?? 50;
    const profileFields = {
      name: data.name, age: data.age, bio: data.bio,
      hometown: data.hometown, height: data.height,
      hobbies: data.hobbies,
      gender: data.gender ?? "prefer-not-to-say",
      looking_for: lf,
      age_min: amin, age_max: amax,
      setup_complete: true,
      photos: data.photos ?? [],
    };
    db.upsertProfile(profileFields);
    setLookingFor(lf);
    setProfilePrefs({ ageMin: amin, ageMax: amax });
    setMyProfileSnapshot(db.buildProfileSnapshot({
      user_id: account?.id ?? "",
      name: data.name,
      age: data.age,
      bio: data.bio,
      photos: data.photos ?? [],
      gender: data.gender ?? "prefer-not-to-say",
    }));
    setShowSetup(false);
    refreshDiscoverProfiles(lf, amin, amax);
  }

  function handleProfileUpdate(updated: { name: string; age: number; bio: string; hometown: string; height: string; hobbies: string[]; lookingFor?: string }) {
    const lf = updated.lookingFor ?? "Everyone";
    setLookingFor(lf);
    setMyProfileSnapshot(db.buildProfileSnapshot({
      user_id: account?.id ?? "",
      name: updated.name,
      age: updated.age,
      bio: updated.bio,
      photos: myProfileSnapshot?.photos ?? [],
      gender: myProfileSnapshot?.gender ?? "",
    }));
    refreshDiscoverProfiles(lf, profilePrefs.ageMin, profilePrefs.ageMax);
  }

  function handleResetSetup() {
    db.upsertProfile({ setup_complete: false });
    setShowSetup(true);
  }

  async function handleLogout() {
    stopGpsWatch();
    if (matchesSubRef.current) {
      supabase.removeChannel(matchesSubRef.current);
      matchesSubRef.current = null;
    }
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
    setDiscoverProfiles([]);
    setMyProfileSnapshot(null);
    setActiveTab("swipe");
    setIsLoggedOut(true);
  }

  async function handleDeleteAccount() {
    stopGpsWatch();
    if (matchesSubRef.current) {
      supabase.removeChannel(matchesSubRef.current);
      matchesSubRef.current = null;
    }
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
    setDiscoverProfiles([]);
    setMyProfileSnapshot(null);
    setLookingFor("Everyone");
    setShowSetup(true);
    setIsLoggedOut(false);
  }

  async function handleUnlockWhoLikedMe() {
    // TODO: replace with Stripe checkout session when Stripe is connected
    await db.grantWhoLikedMeAccess();
    const [profiles, expiry] = await Promise.all([
      db.getWhoLikedMe(),
      db.getWhoLikedMeExpiry(),
    ]);
    setHasWhoLikedMeAccess(true);
    setWhoLikedMeProfiles(profiles);
    setWhoLikedMeExpiresAt(expiry);
  }

  async function handleLikeBack(profile: Profile) {
    setWhoLikedMeProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    setWhoLikedMeCount((c) => Math.max(0, c - 1));
    await handleRealRightSwipe(profile);
  }

  async function handlePassLiker(profile: Profile) {
    setWhoLikedMeProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    setWhoLikedMeCount((c) => Math.max(0, c - 1));
    await db.addSwiped(profile.id, false);
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

  async function handleRealRightSwipe(profile: Profile) {
    setSwipedIds((prev) => prev.includes(profile.id) ? prev : [...prev, profile.id]);
    setDiscoverProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    await db.addSwiped(profile.id, true);
    if (!myProfileSnapshot) return;
    const mutual = await db.createMutualMatch(profile.id, profile, myProfileSnapshot);
    if (mutual) {
      handleMatch({ profile, source: "swipe", matchedAt: Date.now() });
    }
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
    if (tab === "swipe") {
      db.getProfile().then((p) => {
        if (p?.looking_for) {
          const lf   = p.looking_for;
          const amin = p.age_min ?? 18;
          const amax = p.age_max ?? 50;
          setLookingFor(lf);
          setProfilePrefs({ ageMin: amin, ageMax: amax });
          refreshDiscoverProfiles(lf, amin, amax);
        }
      });
    } else if (tab === "coincidence") {
      db.getProfile().then((p) => { if (p?.looking_for) setLookingFor(p.looking_for); });
    }
    setActiveTab(tab);
  }

  function handleOpenChat(match: Match) {
    if (!db.isRealUserId(match.profile.id)) {
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
    }
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
      id: "liked",
      label: "Liked",
      icon: (a) => (
        <div className="relative">
          <Eye className={`w-5 h-5 ${a ? "text-primary" : ""}`} />
          {whoLikedMeCount > 0 && !hasWhoLikedMeAccess && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full gradient-btn text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {whoLikedMeCount > 9 ? "9+" : whoLikedMeCount}
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
        {activeTab === "swipe" && (
          <SwipePage
            onMatch={handleMatch}
            onMaybe={handleMaybe}
            isBoostActive={isBoostActive}
            boostTimeLeft={boostTimeLeft}
            boostRadius={boostRadius}
            boostCredits={boostCredits}
            onActivateBoost={handleActivateBoost}
            onDoubleStringCredit={handleDoubleStringCredit}
            blockedIds={blockedIds}
            onSwiped={(id, liked) => {
              setSwipedIds((prev) => prev.includes(id) ? prev : [...prev, id]);
              setDiscoverProfiles((prev) => prev.filter(p => p.id !== id));
              db.addSwiped(id, liked);
            }}
            onRealRightSwipe={handleRealRightSwipe}
            onGoToProfile={() => setActiveTab("profile")}
            discoverProfiles={discoverProfiles}
            isLoadingProfiles={isLoadingProfiles}
            discoverRadius={discoverRadius}
            hasGps={userLat !== null}
            onRadiusChange={(r) => {
              setDiscoverRadius(r);
              refreshDiscoverProfiles(undefined, undefined, undefined, userLat, userLng, r);
            }}
          />
        )}
        {activeTab === "coincidence" && (
          <CoincidencePage
            onMatch={handleMatch}
            onMaybe={handleMaybe}
            onCheckIn={handleCheckIn}
            onSendMessage={handleOpenChat}
            checkedInLocations={checkedInLocations}
            lookingFor={lookingFor}
            boostCredits={boostCredits}
            onDoubleStringCredit={handleDoubleStringCredit}
            blockedIds={blockedIds}
          />
        )}
        {activeTab === "matches" && (
          <MatchesPage matches={matches} messageCounts={messageCounts} checkIns={checkIns} onOpenChat={handleOpenChat} />
        )}
        {activeTab === "liked" && (
          <LikedPage
            whoLikedMeCount={whoLikedMeCount}
            whoLikedMeProfiles={whoLikedMeProfiles}
            hasWhoLikedMeAccess={hasWhoLikedMeAccess}
            whoLikedMeExpiresAt={whoLikedMeExpiresAt}
            onUnlockWhoLikedMe={handleUnlockWhoLikedMe}
            onLikeBack={handleLikeBack}
            onPassLiker={handlePassLiker}
          />
        )}
        {activeTab === "undecided" && (
          <UndecidedPage undecided={undecided} onDecide={handleUndecidedDecision} />
        )}
        {activeTab === "profile" && (
          <ProfilePage
            matches={matches}
            checkIns={checkIns}
            boostCredits={boostCredits}
            isBoostActive={isBoostActive}
            boostTimeLeft={boostTimeLeft}
            boostRadius={boostRadius}
            onBoostRadiusChange={(r) => { setBoostRadius(r); db.upsertBoost(boostCredits, boostActiveUntil, r); }}
            onActivateBoost={handleActivateBoost}
            onAddCredits={(n) => {
              setBoostCredits((c) => {
                const next = c + n;
                db.upsertBoost(next, boostActiveUntil, boostRadius);
                return next;
              });
            }}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            onProfileUpdate={handleProfileUpdate}
          />
        )}
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
