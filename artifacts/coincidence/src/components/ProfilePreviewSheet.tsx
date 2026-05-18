import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, X, HelpCircle, MapPin, MessageCircle, Ruler } from "lucide-react";
import type { Profile } from "@/lib/data";

function resolvePhoto(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return /^(https?:|blob:|data:)/.test(url) ? url : `${import.meta.env.BASE_URL}${url}`;
}

export function ProfilePreviewSheet({
  profile,
  blurName,
  onClose,
  onSwipe,
  onMessage,
}: {
  profile: Profile;
  blurName?: boolean;
  onClose: () => void;
  onSwipe?: (dir: "left" | "right" | "maybe") => void;
  onMessage?: () => void;
}) {
  const allPhotos = profile.photos?.length ? profile.photos : profile.photo ? [profile.photo] : [];
  const [photoIdx, setPhotoIdx] = useState(0);

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  if (!portalTarget) return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "#0D0E1A" }}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
    >
      {/* ── Back button — floats over content ── */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-10 px-4 pb-4 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(13,14,26,0.9) 0%, transparent 100%)" }}>
        <button
          onClick={onClose}
          className="pointer-events-auto flex items-center gap-1.5 text-sm font-medium active:opacity-60 transition-opacity"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
      </div>

      {/* ── Scrollable body (photo + info together) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* Photo — full width, tall, inside the scroll */}
        <div className="relative w-full" style={{ height: 440 }}>
          {allPhotos.length > 0 ? (
            <img
              src={resolvePhoto(allPhotos[photoIdx])}
              alt={profile.name}
              className="w-full h-full object-cover object-top"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: profile.gradient }}>
              <span className="text-9xl font-black select-none" style={{ color: "rgba(255,255,255,0.08)" }}>{profile.avatar}</span>
            </div>
          )}

          {/* Deep gradient: name overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 px-5 pt-24 pb-5 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(13,14,26,0.85) 60%, #0D0E1A 100%)" }}>
            <h2 className="text-3xl font-black leading-tight tracking-tight">
              {blurName ? (
                <>
                  <span style={{ filter: "blur(9px)", userSelect: "none", background: "linear-gradient(135deg,#E8387D,#9B5DE5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} aria-hidden="true">{profile.name}</span>
                  <span className="sr-only">Name hidden</span>
                  <span style={{ color: "rgba(255,255,255,0.9)" }}>, {profile.age}</span>
                </>
              ) : (
                <>
                  <span style={{ background: "linear-gradient(135deg,#E8387D,#9B5DE5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{profile.name}</span>
                  <span style={{ color: "rgba(255,255,255,0.9)" }}>, {profile.age}</span>
                </>
              )}
            </h2>
            {blurName && <p className="text-[10px] italic mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>name revealed on match</p>}
          </div>

          {/* Photo dots */}
          {allPhotos.length > 1 && (
            <div className="absolute top-12 left-4 right-4 flex gap-1 pointer-events-none">
              {allPhotos.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 rounded-full transition-all duration-200"
                  style={{ background: i === photoIdx ? "#E8387D" : "rgba(255,255,255,0.3)" }} />
              ))}
            </div>
          )}

          {/* Tap zones for cycling */}
          {allPhotos.length > 1 && (
            <>
              <button className="absolute inset-y-0 left-0 w-1/2 opacity-0" onClick={() => setPhotoIdx(i => Math.max(0, i - 1))} aria-label="Previous photo" />
              <button className="absolute inset-y-0 right-0 w-1/2 opacity-0" onClick={() => setPhotoIdx(i => Math.min(allPhotos.length - 1, i + 1))} aria-label="Next photo" />
              {photoIdx > 0 && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center pointer-events-none" style={{ background: "rgba(13,14,26,0.55)" }}>
                  <ChevronLeft className="w-4 h-4 text-white/70" />
                </div>
              )}
              {photoIdx < allPhotos.length - 1 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center pointer-events-none" style={{ background: "rgba(13,14,26,0.55)" }}>
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Info section ── */}
        <div className="px-5 pt-3 pb-8" style={{ background: "#0D0E1A" }}>

          {/* Distance + height row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "#E8387D" }} />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{profile.distance}</span>
            </div>
            {profile.height && (
              <div className="flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 shrink-0" style={{ color: "#9B5DE5" }} />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{profile.height}</span>
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-base leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.8)" }}>{profile.bio}</p>
          )}

          {/* Interests / hobbies */}
          {profile.hobbies && profile.hobbies.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>Interests</p>
              <div className="flex flex-wrap gap-2">
                {profile.hobbies.map((h, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{
                      background: i % 2 === 0 ? "rgba(232,56,125,0.12)" : "rgba(155,93,229,0.12)",
                      border: `1px solid ${i % 2 === 0 ? "rgba(232,56,125,0.3)" : "rgba(155,93,229,0.3)"}`,
                      color: i % 2 === 0 ? "#f472b6" : "#c4b5fd",
                    }}>
                    {h}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Action bar ── */}
      {onSwipe && (
        <div className="shrink-0 flex items-center justify-center gap-6 px-6 pt-4 pb-10"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "#0D0E1A" }}>
          <button
            onClick={() => { onSwipe("left"); onClose(); }}
            className="rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ width: 56, height: 56, background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.4)", color: "#f87171" }}
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={() => { onSwipe("right"); onClose(); }}
            className="rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ width: 68, height: 68, background: "linear-gradient(135deg,#E8387D,#9B5DE5)", boxShadow: "0 0 30px rgba(232,56,125,0.55)" }}
          >
            <Heart className="w-7 h-7 text-white fill-white" />
          </button>
          <button
            onClick={() => { onSwipe("maybe"); onClose(); }}
            className="rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ width: 56, height: 56, background: "rgba(155,93,229,0.12)", border: "1.5px solid rgba(155,93,229,0.4)", color: "#a78bfa" }}
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        </div>
      )}
      {!onSwipe && onMessage && (
        <div className="shrink-0 px-6 pt-4 pb-10"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "#0D0E1A" }}>
          <button
            onClick={onMessage}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-semibold active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg,#E8387D,#9B5DE5)", boxShadow: "0 0 28px rgba(232,56,125,0.4)" }}
          >
            <MessageCircle className="w-5 h-5 text-white" />
            <span className="text-white">Message</span>
          </button>
        </div>
      )}
    </motion.div>,
    document.body
  );
}
