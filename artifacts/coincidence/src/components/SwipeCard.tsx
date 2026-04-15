import { useState, useEffect } from "react";
import {
  useMotionValue,
  useTransform,
  animate,
  motion,
  AnimatePresence,
} from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, X } from "lucide-react";
import type { Profile } from "@/lib/data";

type Action = "none" | "yes" | "no";
type SnapPhase = "main" | "broken" | "hidden";

function StringVisual({ action }: { action: Action }) {
  const cx = useMotionValue(53);
  const [snapPhase, setSnapPhase] = useState<SnapPhase>("main");
  const [yesPhase, setYesPhase] = useState(false);

  const d = useTransform([cx] as [typeof cx], ([x]: [number]) =>
    `M 50 0 Q ${x} 30 50 60`
  );

  useEffect(() => {
    if (action === "no") {
      setSnapPhase("main");
      setYesPhase(false);
      animate(cx, 4, { duration: 0.22, ease: "easeIn" });

      const t1 = setTimeout(() => {
        setSnapPhase("broken");
        cx.set(53);
      }, 240);
      const t2 = setTimeout(() => setSnapPhase("hidden"), 640);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    if (action === "yes") {
      setSnapPhase("main");
      setYesPhase(false);
      animate(cx, 50, { duration: 0.18, ease: "easeOut" });
      setTimeout(() => setYesPhase(true), 180);
      setTimeout(() => setSnapPhase("hidden"), 480);
    }

    if (action === "none") {
      setSnapPhase("main");
      setYesPhase(false);
      cx.set(53);
    }
  }, [action]);

  if (snapPhase === "hidden") return <div style={{ height: 60 }} />;

  return (
    <div className="flex justify-center" style={{ height: 60 }}>
      <svg
        width="100"
        height="60"
        viewBox="0 0 100 60"
        style={{ overflow: "visible" }}
      >
        <AnimatePresence mode="wait">
          {snapPhase === "main" && (
            <motion.path
              key="main"
              d={d as unknown as string}
              stroke={yesPhase ? "#f43f5e" : "#b8a090"}
              strokeWidth={yesPhase ? 2.5 : 1.5}
              fill="none"
              strokeLinecap="round"
              initial={{ opacity: 1 }}
              animate={{ opacity: yesPhase ? 0 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
              style={{
                filter: yesPhase
                  ? "drop-shadow(0 0 4px rgba(244,63,94,0.6))"
                  : "none",
              }}
            />
          )}

          {snapPhase === "broken" && (
            <motion.g key="broken" initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
              <motion.path
                d="M 50 0 Q 72 10 63 24"
                stroke="#b8a090"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: 24, y: -20, opacity: 0 }}
                transition={{ duration: 0.36, ease: [0.2, 0, 0.8, 1] }}
              />
              <motion.path
                d="M 37 36 Q 27 50 50 60"
                stroke="#b8a090"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: -24, y: 20, opacity: 0 }}
                transition={{ duration: 0.36, ease: [0.2, 0, 0.8, 1] }}
              />
              <motion.circle
                cx="50"
                cy="30"
                r="2"
                fill="#c8b4a8"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 2, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {snapPhase === "main" && yesPhase && (
          <motion.circle
            cx="50"
            cy="30"
            r="5"
            fill="#f43f5e"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.8, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 0.42, ease: "easeOut", times: [0, 0.45, 1] }}
          />
        )}
      </svg>
    </div>
  );
}

interface SwipeCardProps {
  profile: Profile;
  onSwipe: (direction: "left" | "right") => void;
  locationIcon?: React.ReactNode;
  locationName?: string;
  progress?: string;
}

export function SwipeCard({
  profile,
  onSwipe,
  locationIcon,
  locationName,
  progress,
}: SwipeCardProps) {
  const [action, setAction] = useState<Action>("none");
  const [sliding, setSliding] = useState<"left" | "right" | null>(null);

  function handleSwipe(dir: "left" | "right") {
    if (action !== "none") return;
    const act: Action = dir === "left" ? "no" : "yes";
    setAction(act);

    setTimeout(() => setSliding(dir), 140);

    setTimeout(() => {
      onSwipe(dir);
      setAction("none");
      setSliding(null);
    }, 460);
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {progress && (
        <p className="text-xs text-muted-foreground text-center mb-4 uppercase tracking-wide">
          {progress}
        </p>
      )}

      <div
        className={`transition-all duration-300 ease-out ${
          sliding === "left"
            ? "-translate-x-40 -rotate-12 opacity-0"
            : sliding === "right"
              ? "translate-x-40 rotate-12 opacity-0"
              : ""
        }`}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/70 to-primary text-primary-foreground text-2xl font-bold mb-4">
              {profile.avatar}
            </div>
            <h2 className="text-xl font-semibold text-center">
              {profile.name}, {profile.age}
            </h2>
            <p className="text-muted-foreground text-center mt-2 text-sm">
              {profile.bio}
            </p>
            {locationIcon && locationName && (
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {locationIcon}
                <span className="text-xs text-muted-foreground">
                  {locationName}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <StringVisual action={action} />

      <div className="flex justify-center gap-6">
        <Button
          variant="outline"
          size="lg"
          className="rounded-full w-14 h-14 p-0 border-destructive text-destructive hover:bg-destructive/10"
          onClick={() => handleSwipe("left")}
          disabled={action !== "none"}
        >
          <X className="w-6 h-6" />
        </Button>
        <Button
          size="lg"
          className="rounded-full w-14 h-14 p-0 bg-primary hover:bg-primary/90"
          onClick={() => handleSwipe("right")}
          disabled={action !== "none"}
        >
          <Heart className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
