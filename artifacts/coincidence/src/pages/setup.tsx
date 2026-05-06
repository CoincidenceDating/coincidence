import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Home, Ruler, ChevronUp, ChevronDown, Check, Camera, X, Loader2 } from "lucide-react";
import { uploadPhoto } from "@/lib/db";

/* ─── constants ──────────────────────────────────────────── */
const HEIGHT_OPTIONS: string[] = [];
for (let ft = 4; ft <= 7; ft++) {
  const maxIn = ft === 7 ? 0 : 11;
  for (let inch = ft === 4 ? 9 : 0; inch <= maxIn; inch++) {
    HEIGHT_OPTIONS.push(`${ft}'${inch}"`);
  }
}

const HOBBY_SUGGESTIONS = [
  "Reading", "Cooking", "Gaming", "Yoga", "Photography", "Travel",
  "Music", "Hiking", "Dancing", "Art", "Film", "Cycling", "Running",
  "Swimming", "Climbing", "Tennis", "Skiing", "Surfing", "Writing", "Coffee",
  "Festivals", "Food", "Meditation", "Podcasts", "Fashion", "Theatre",
];

const LOOKING_FOR_OPTIONS = ["Everyone", "Women", "Men", "Non-binary"];

export interface SetupData {
  name: string;
  age: number;
  bio: string;
  hometown: string;
  height: string;
  hobbies: string[];
  gender: string;
  lookingFor: string;
  ageMin: number;
  ageMax: number;
  photos: string[];
}

interface SetupPageProps {
  onComplete: (data: SetupData) => void;
  onRequestGps?: () => void;
}

const TOTAL_STEPS = 6;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

export default function SetupPage({ onComplete, onRequestGps }: SetupPageProps) {
  const [step, setStep]   = useState(0);
  const [dir, setDir]     = useState(1);

  // Request GPS permission as soon as the wizard opens so the first fix
  // is written to the DB while the user is filling in their details.
  useEffect(() => { onRequestGps?.(); }, []);

  const [name, setName]         = useState("");
  const [age, setAge]           = useState(25);
  const [height, setHeight]     = useState("5'8\"");
  const [hometown, setHometown] = useState("");
  const [bio, setBio]           = useState("");
  const [hobbies, setHobbies]   = useState<string[]>([]);
  const [gender, setGender]     = useState("");
  const [lookingFor, setLookingFor] = useState("Everyone");
  const [ageMin, setAgeMin]     = useState(18);
  const [ageMax, setAgeMax]     = useState(40);
  const [photos, setPhotos]     = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const heightIdx = HEIGHT_OPTIONS.indexOf(height);

  const initials = name
    .split(" ").filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join("") || "?";

  function goNext() { setDir(1); setStep(s => s + 1); }
  function goBack() { setDir(-1); setStep(s => s - 1); }

  function finish() {
    onComplete({ name: name.trim() || "You", age, bio, hometown, height, hobbies, gender: gender || "prefer-not-to-say", lookingFor, ageMin, ageMax, photos });
  }

  function toggleHobby(h: string) {
    setHobbies(prev =>
      prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]
    );
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || photos.length >= 3) return;
    e.target.value = "";
    setIsUploading(true);
    setUploadError("");
    const { url, error } = await uploadPhoto(file);
    if (error || !url) {
      setUploadError(error ?? "Upload failed — try again");
    } else {
      setPhotos(prev => [...prev, url]);
    }
    setIsUploading(false);
  }

  const canNext = [
    name.trim().length > 0,
    gender.length > 0,
    bio.trim().length > 0,
    hobbies.length > 0,
    true,
    photos.length > 0,
  ][step];

  const stepTitles = [
    "What's your name?",
    "How do you identify?",
    "Your story",
    "What do you love?",
    "Your preferences",
    "Add your photos",
  ];
  const stepSubs = [
    "This is how you'll appear to others.",
    "Help people know who they might coincide with.",
    "Write something that feels like you.",
    "Pick as many as you like.",
    "Who are you hoping to cross paths with?",
    "At least one photo so people can recognise you.",
  ];

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">

      {/* Progress bar */}
      <div className="px-6 pt-10 pb-2 shrink-0">
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <motion.div
              key={i}
              className="h-1 rounded-full flex-1 bg-muted overflow-hidden"
            >
              <motion.div
                className="h-full bg-foreground rounded-full"
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
            <h1 className="text-2xl font-bold leading-tight">{stepTitles[step]}</h1>
            <p className="text-sm text-muted-foreground mt-1">{stepSubs[step]}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence custom={dir} mode="wait">
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="absolute inset-0 px-6 pt-6 pb-4 overflow-y-auto"
          >

            {/* ── Step 0: Name ── */}
            {step === 0 && (
              <div className="flex flex-col items-center gap-8">
                <motion.div
                  className="w-28 h-28 rounded-full bg-foreground text-background flex items-center justify-center text-3xl font-bold"
                  animate={{ scale: initials !== "?" ? 1 : 0.92 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  {initials}
                </motion.div>

                <div className="w-full">
                  <input
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-4 rounded-2xl border-2 bg-muted/30 text-lg font-medium outline-none focus:border-foreground transition-colors text-center"
                  />
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Your first name is fine too
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 1: Gender / Age / Height / Hometown ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">I am a</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "man", label: "Man" },
                      { value: "woman", label: "Woman" },
                      { value: "non-binary", label: "Non-binary" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setGender(opt.value)}
                        className={`py-3.5 rounded-2xl text-sm font-semibold transition-all border-2 ${
                          gender === opt.value
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {!gender && (
                    <p className="text-xs text-muted-foreground mt-2">Select one to continue</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">Age</label>
                  <div className="flex items-center gap-6">
                    <button onClick={() => setAge(a => Math.max(18, a - 1))}
                      className="w-11 h-11 rounded-full border-2 flex items-center justify-center text-xl hover:bg-muted transition-colors">−</button>
                    <span className="text-4xl font-bold tabular-nums w-12 text-center">{age}</span>
                    <button onClick={() => setAge(a => Math.min(99, a + 1))}
                      className="w-11 h-11 rounded-full border-2 flex items-center justify-center text-xl hover:bg-muted transition-colors">+</button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">Height</label>
                  <div className="flex items-center gap-4">
                    <button onClick={() => { const n = HEIGHT_OPTIONS[heightIdx - 1]; if (n) setHeight(n); }}
                      disabled={heightIdx === 0}
                      className="w-11 h-11 rounded-full border-2 flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors">
                      <ChevronDown className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <Ruler className="w-4 h-4 text-muted-foreground" />
                      <span className="text-2xl font-bold tabular-nums">{height}</span>
                    </div>
                    <button onClick={() => { const n = HEIGHT_OPTIONS[heightIdx + 1]; if (n) setHeight(n); }}
                      disabled={heightIdx === HEIGHT_OPTIONS.length - 1}
                      className="w-11 h-11 rounded-full border-2 flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors">
                      <ChevronUp className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">Hometown</label>
                  <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={hometown}
                      onChange={e => setHometown(e.target.value)}
                      placeholder="e.g. London, UK"
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 bg-muted/30 text-sm font-medium outline-none focus:border-foreground transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Bio ── */}
            {step === 2 && (
              <div className="space-y-4">
                <textarea
                  autoFocus
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={160}
                  rows={5}
                  placeholder="Living in the moment, one coincidence at a time…"
                  className="w-full px-4 py-4 rounded-2xl border-2 bg-muted/30 text-sm leading-relaxed outline-none focus:border-foreground transition-colors resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/160</p>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Need inspiration?</p>
                  {[
                    "I believe in fate — but also good playlists.",
                    "Always down for an unplanned adventure.",
                    "Best conversations happen by accident.",
                  ].map(prompt => (
                    <button key={prompt} onClick={() => setBio(prompt)}
                      className="w-full text-left px-4 py-3 rounded-xl border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all">
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 3: Hobbies ── */}
            {step === 3 && (
              <div>
                <div className="flex flex-wrap gap-2">
                  {HOBBY_SUGGESTIONS.map(h => {
                    const selected = hobbies.includes(h);
                    return (
                      <motion.button
                        key={h}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => toggleHobby(h)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all border-2 ${
                          selected
                            ? "bg-foreground text-background border-foreground"
                            : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        {selected && <Check className="w-3 h-3" />}
                        {h}
                      </motion.button>
                    );
                  })}
                </div>
                {hobbies.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    {hobbies.length} selected
                  </p>
                )}
              </div>
            )}

            {/* ── Step 4: Preferences ── */}
            {step === 4 && (
              <div className="space-y-8">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">Looking for</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LOOKING_FOR_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setLookingFor(opt)}
                        className={`py-3 rounded-2xl text-sm font-semibold transition-all border-2 ${
                          lookingFor === opt
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">
                    Age range · {ageMin}–{ageMax}
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground w-6">Min</span>
                      <button onClick={() => setAgeMin(a => Math.max(18, a - 1))}
                        className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors text-lg">−</button>
                      <span className="text-xl font-bold tabular-nums w-10 text-center">{ageMin}</span>
                      <button onClick={() => setAgeMin(a => Math.min(ageMax - 1, a + 1))}
                        className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors text-lg">+</button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground w-6">Max</span>
                      <button onClick={() => setAgeMax(a => Math.max(ageMin + 1, a - 1))}
                        className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors text-lg">−</button>
                      <span className="text-xl font-bold tabular-nums w-10 text-center">{ageMax}</span>
                      <button onClick={() => setAgeMax(a => Math.min(80, a + 1))}
                        className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors text-lg">+</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 5: Photos ── */}
            {step === 5 && (
              <div className="space-y-5">
                {/* Thumbnails */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((url, i) => (
                      <div key={url} className="relative aspect-square rounded-2xl overflow-hidden">
                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setPhotos(prev => prev.filter(p => p !== url))}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 3 && Array.from({ length: 3 - photos.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square rounded-2xl border-2 border-dashed border-border" />
                    ))}
                  </div>
                )}

                {/* Upload button */}
                {photos.length < 3 && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handlePhotoUpload}
                      disabled={isUploading}
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-3xl border-2 border-dashed border-border hover:border-foreground/40 transition-colors disabled:opacity-60"
                    >
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      ) : (
                        <Camera className="w-8 h-8 text-muted-foreground" />
                      )}
                      <p className="text-sm text-muted-foreground font-medium">
                        {isUploading ? "Uploading…" : photos.length === 0 ? "Tap to add a photo" : "Add another photo"}
                      </p>
                    </motion.button>
                  </>
                )}

                {uploadError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 text-center font-medium">
                    {uploadError}
                  </motion.p>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  {photos.length === 0
                    ? "You need at least one photo to continue"
                    : `${photos.length} of 3 photos added`}
                </p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav buttons */}
      <div className="px-6 pb-10 pt-4 shrink-0 flex gap-3">
        {step > 0 && (
          <button
            onClick={goBack}
            className="w-12 h-12 rounded-full border-2 flex items-center justify-center hover:bg-muted transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={step < TOTAL_STEPS - 1 ? goNext : finish}
          disabled={!canNext}
          className="flex-1 h-12 rounded-full font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-30 transition-all"
          style={{ background: "linear-gradient(135deg, #E8387D 0%, #9B5DE5 100%)" }}
        >
          {step < TOTAL_STEPS - 1 ? (
            <>Continue <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>Let's go <Check className="w-4 h-4" /></>
          )}
        </motion.button>
      </div>
    </div>
  );
}
