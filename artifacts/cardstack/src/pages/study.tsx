import { useAuth } from "@/contexts/AuthContext";
import { supabase, computeSM2 } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useLocation } from "wouter";
import { CheckCircle2, ChevronLeft, RotateCcw, Volume2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";

function useTTS() {
  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.lang = "en-NG";
    window.speechSynthesis.speak(u);
  }, []);
  const stop = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);
  return { speak, stop };
}

const RATINGS = [
  { id: "again", label: "Again",  sub: "< 1m",   color: "text-red-400",    border: "border-red-500/30",    bg: "hover:bg-red-500/15",    active: "bg-red-500/20" },
  { id: "hard",  label: "Hard",   sub: "1–2d",   color: "text-orange-400", border: "border-orange-500/30", bg: "hover:bg-orange-500/15", active: "bg-orange-500/20" },
  { id: "good",  label: "Good",   sub: "3–7d",   color: "text-primary",    border: "border-primary/30",    bg: "hover:bg-primary/15",    active: "bg-primary/20" },
  { id: "easy",  label: "Easy",   sub: "1–2w",   color: "text-[#00D9A3]",  border: "border-[#00D9A3]/30",  bg: "hover:bg-[#00D9A3]/15",  active: "bg-[#00D9A3]/20" },
];

export default function Study() {
  const { deckId } = useParams<{ deckId: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [pressed, setPressed] = useState<string | null>(null);
  const { speak, stop } = useTTS();
  const audioEnabled = localStorage.getItem("cardstack_audio_enabled") !== "false";

  useEffect(() => () => stop(), [stop]);

  const { data: deck } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: async () => {
      const { data } = await supabase.from("decks").select("*").eq("id", deckId).single();
      return data;
    },
    enabled: !!deckId,
  });

  const { data: cards, isLoading } = useQuery({
    queryKey: ["study_cards", deckId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("cards").select("*")
        .eq("deck_id", deckId).lte("next_review_date", today).order("next_review_date");
      return data || [];
    },
    enabled: !!deckId,
  });

  const rateCard = useMutation({
    mutationFn: async ({ cardId, rating, currentCard }: { cardId: string; rating: any; currentCard: any }) => {
      const sm2 = computeSM2(currentCard, rating);
      const { error } = await supabase.from("cards").update({
        interval: sm2.interval, ease_factor: sm2.ease_factor, next_review_date: sm2.next_review_date,
        difficulty: rating === "again" || rating === "hard" ? "hard" : rating === "easy" ? "easy" : "medium",
      }).eq("id", cardId);
      if (error) throw error;
      const { data: p } = await supabase.from("profiles").select("xp").eq("user_id", user?.id).single();
      if (p) await supabase.from("profiles").update({ xp: p.xp + 10 }).eq("user_id", user?.id);
    },
    onSuccess: () => {
      stop();
      setPressed(null);
      setReviewedCount(prev => prev + 1);
      if (cards && currentIndex < cards.length - 1) {
        setIsFlipped(false);
        setTimeout(() => setCurrentIndex(p => p + 1), 200);
      } else {
        setFinished(true);
      }
    },
  });

  const handleRate = (rating: string) => {
    setPressed(rating);
    rateCard.mutate({ cardId: currentCard.id, rating, currentCard });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        <p className="text-muted-foreground text-sm">Loading study session…</p>
      </div>
    );
  }

  if (finished || (cards && cards.length === 0)) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
          className="w-20 h-20 rounded-2xl bg-[#00D9A3]/15 border border-[#00D9A3]/25 flex items-center justify-center glow-accent">
          <CheckCircle2 className="w-10 h-10 text-[#00D9A3]" />
        </motion.div>
        <div>
          <h1 className="font-display text-5xl text-white mb-2">ALL CAUGHT UP!</h1>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
            {finished
              ? `You reviewed ${reviewedCount} cards and earned +${reviewedCount * 10} XP.`
              : "No cards due for review in this deck today. Check back tomorrow."}
          </p>
        </div>
        {finished && (
          <div className="flex items-center gap-2 bg-primary/15 border border-primary/25 rounded-full px-5 py-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-sm">+{reviewedCount * 10} XP earned</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button variant="outline" onClick={() => { stop(); setLocation(`/decks/${deckId}`); }}
            className="border-white/15 hover:bg-white/5 text-white">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Deck
          </Button>
          {finished && (
            <Button className="bg-primary hover:bg-primary/90 font-bold btn-sweep" onClick={() => {
              setCurrentIndex(0); setIsFlipped(false); setFinished(false); setReviewedCount(0);
              queryClient.invalidateQueries({ queryKey: ["study_cards", deckId] });
            }}>
              <RotateCcw className="w-4 h-4 mr-2" /> Study Again
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  const currentCard = (cards ?? [])[currentIndex];
  const progress = (currentIndex / (cards ?? []).length) * 100;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Top bar */}
      <div className="shrink-0 py-3 px-1 space-y-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { stop(); setLocation(`/decks/${deckId}`); }}
            className="-ml-2 text-muted-foreground hover:text-white">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {deck?.subject && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/10 rounded-full px-3 py-1">
                {deck.subject}
              </span>
            )}
            <span className="text-sm font-medium text-muted-foreground">{currentIndex + 1} / {(cards ?? []).length}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #6C63FF, #00D9A3)", width: `${progress}%` }}
            transition={{ duration: 0.4 }} />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-1">
        <div style={{ perspective: "1200px" }} className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="w-full cursor-pointer select-none"
                style={{ perspective: "1200px" }}
                onClick={() => !isFlipped && setIsFlipped(true)}
                data-testid="study-card"
              >
                <motion.div
                  style={{ transformStyle: "preserve-3d", height: "280px" }}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="relative w-full"
                >
                  {/* Front */}
                  <div className="absolute inset-0 grain" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                    <div className="w-full h-72 rounded-2xl border border-white/8 bg-card/90 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden shadow-2xl shadow-black/40">
                      <div className="absolute inset-0 opacity-[0.04]"
                        style={{ background: "radial-gradient(ellipse at top right, #6C63FF, transparent 60%)" }} />
                      <div className="absolute top-4 left-0 right-0 flex justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/50">Question</span>
                      </div>
                      {audioEnabled && (
                        <button className="absolute top-3 right-3 p-2 rounded-xl hover:bg-white/8 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                          onClick={(e) => { e.stopPropagation(); speak(currentCard.front); }}>
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                      <p className="text-xl sm:text-2xl font-semibold text-white leading-snug relative z-10">
                        {currentCard.front}
                      </p>
                      {!isFlipped && (
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                          className="absolute bottom-5 text-xs font-bold uppercase tracking-[0.2em] text-primary/50">
                          Tap to reveal
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Back */}
                  <div
                    className="absolute inset-0 grain"
                    style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <div className="w-full h-72 rounded-2xl border border-primary/25 bg-card/90 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden shadow-2xl shadow-primary/10">
                      <div className="absolute inset-0"
                        style={{ background: "radial-gradient(ellipse at bottom left, rgba(108,99,255,0.08), transparent 60%)" }} />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                      <div className="absolute top-4 left-0 right-0 flex justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/60">Answer</span>
                      </div>
                      {audioEnabled && (
                        <button className="absolute top-3 right-3 p-2 rounded-xl hover:bg-white/8 text-muted-foreground/40 hover:text-primary transition-colors"
                          onClick={(e) => { e.stopPropagation(); speak(currentCard.back); }}>
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                      <p className="text-lg sm:text-xl text-white leading-relaxed relative z-10">{currentCard.back}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Rating buttons */}
        <div className="w-full max-w-md mt-6 h-20">
          <AnimatePresence>
            {isFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="grid grid-cols-4 gap-2"
              >
                {RATINGS.map((r) => {
                  const cardData = (cards ?? [])[currentIndex];
                  const nextInterval = r.id === "again" ? "< 1m"
                    : r.id === "hard" ? `${Math.max(1, Math.round(cardData.interval * 1.2))}d`
                    : r.id === "good" ? `${Math.max(1, Math.round(cardData.interval * cardData.ease_factor))}d`
                    : `${Math.max(1, Math.round(cardData.interval * cardData.ease_factor * 1.3))}d`;
                  return (
                    <motion.button
                      key={r.id}
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => { e.stopPropagation(); handleRate(r.id); }}
                      disabled={rateCard.isPending}
                      className={`flex flex-col items-center justify-center gap-0.5 h-16 rounded-xl border transition-all duration-150 ${r.color} ${r.border} ${r.bg}
                        ${pressed === r.id ? r.active : "bg-card/60"}
                        ${rateCard.isPending ? "opacity-50 pointer-events-none" : ""}
                      `}
                    >
                      <span className="font-bold text-sm">{r.label}</span>
                      <span className="text-[9px] opacity-60 font-medium">{nextInterval}</span>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
