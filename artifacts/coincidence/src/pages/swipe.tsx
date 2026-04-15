import { useState } from "react";
import { swipeProfiles, type Profile } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, X } from "lucide-react";

export default function SwipePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const currentProfile: Profile | undefined = swipeProfiles[currentIndex];

  function handleSwipe(dir: "left" | "right") {
    setDirection(dir);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % swipeProfiles.length);
      setDirection(null);
    }, 300);
  }

  if (!currentProfile) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="w-full max-w-sm">
        <Card
          className={`transition-all duration-300 ease-out ${
            direction === "left"
              ? "-translate-x-40 -rotate-12 opacity-0"
              : direction === "right"
                ? "translate-x-40 rotate-12 opacity-0"
                : ""
          }`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-center w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-2xl font-bold mb-4">
              {currentProfile.avatar}
            </div>
            <h2 className="text-xl font-semibold text-center">
              {currentProfile.name}, {currentProfile.age}
            </h2>
            <p className="text-muted-foreground text-center mt-2 text-sm">
              {currentProfile.bio}
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-6 mt-6">
          <Button
            variant="outline"
            size="lg"
            className="rounded-full w-14 h-14 p-0 border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => handleSwipe("left")}
          >
            <X className="w-6 h-6" />
          </Button>
          <Button
            size="lg"
            className="rounded-full w-14 h-14 p-0 bg-primary hover:bg-primary/90"
            onClick={() => handleSwipe("right")}
          >
            <Heart className="w-6 h-6" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          {currentIndex + 1} / {swipeProfiles.length}
        </p>
      </div>
    </div>
  );
}
