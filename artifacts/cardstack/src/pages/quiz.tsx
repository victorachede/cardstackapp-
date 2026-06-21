import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, Trophy, AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

const LABELS = ["A", "B", "C", "D"];

function shuffleArray(array: any[]) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Quiz() {
  const { deckId } = useParams<{ deckId: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [quizCards, setQuizCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<any[]>([]);

  const { data: deck } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: async () => {
      const { data } = await supabase.from("decks").select("*").eq("id", deckId).single();
      return data;
    },
    enabled: !!deckId,
  });

  const { data: allCards, isLoading } = useQuery<{ deckCards: any[]; otherCards: { back: any }[] } | null>({
    queryKey: ["all_deck_cards", deckId],
    queryFn: async () => {
      if (!deck) return null;
      const { data: deckCards } = await supabase.from("cards").select("*").eq("deck_id", deckId);
      const { data: otherCards } = await supabase.from("cards").select("back").neq("deck_id", deckId).limit(50);
      return { deckCards: deckCards || [], otherCards: otherCards || [] };
    },
    enabled: !!deck,
  });

  useEffect(() => {
    if (allCards?.deckCards && allCards.deckCards.length > 0 && quizCards.length === 0) {
      const shuffledDeck = shuffleArray(allCards.deckCards).slice(0, 10);
      const otherBacks = allCards.otherCards.map((c: any) => c.back);
      const generated = shuffledDeck.map(card => {
        const available = [...otherBacks, ...allCards.deckCards.map((c: any) => c.back).filter((b: any) => b !== card.back)];
        const distractors = shuffleArray([...new Set(available)]).slice(0, 3);
        const options = shuffleArray([card.back, ...distractors]);
        return { ...card, options };
      });
      setQuizCards(generated);
    }
  }, [allCards]);

  useEffect(() => {
    if (isFinished || selectedOption !== null || quizCards.length === 0) return;
    if (timeLeft <= 0) { handleAnswer(null); return; }
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, isFinished, selectedOption, quizCards]);

  const saveSession = useMutation({
    mutationFn: async (finalScore: number) => {
      await supabase.from("quiz_sessions").insert({
        user_id: user?.id, deck_id: deckId, score: finalScore, total: quizCards.length, mode: "standard",
      });
      const { data: p } = await supabase.from("profiles").select("xp").eq("user_id", user?.id).single();
      if (p) await supabase.from("profiles").update({ xp: p.xp + 50 + finalScore * 5 }).eq("user_id", user?.id);
    },
  });

  const handleAnswer = (option: string | null) => {
    if (selectedOption !== null) return;
    setSelectedOption(option ?? "timeout");
    const card = quizCards[currentIndex];
    const correct = option === card.back;
    if (correct) {
      setScore(s => s + 1);
    } else {
      setWrongAnswers(p => [...p, { question: card.front, correct: card.back, selected: option ?? "Timed out" }]);
    }
    setTimeout(() => {
      if (currentIndex < quizCards.length - 1) {
        setCurrentIndex(p => p + 1);
        setSelectedOption(null);
        setTimeLeft(30);
      } else {
        const final = correct ? score + 1 : score;
        setIsFinished(true);
        saveSession.mutate(final);
      }
    }, 1400);
  };

  if (isLoading || quizCards.length === 0) {
    if (isLoading) return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        <p className="text-muted-foreground text-sm">Preparing your quiz…</p>
      </div>
    );
    return (
      <div className="p-10 text-center space-y-3">
        <p className="font-semibold">Not enough cards for a quiz.</p>
        <p className="text-sm text-muted-foreground">Add at least 2 cards to this deck first.</p>
        <Button onClick={() => setLocation(`/decks/${deckId}`)}>Go back to deck</Button>
      </div>
    );
  }

  if (isFinished) {
    const pct = Math.round((score / quizCards.length) * 100);
    const xp = 50 + score * 5;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm mx-auto py-10 space-y-6">
        <div className="text-center space-y-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
            <Trophy className={`w-16 h-16 mx-auto ${pct >= 70 ? "text-yellow-400" : "text-muted-foreground"}`} />
          </motion.div>
          <h1 className="text-2xl font-black tracking-tight">Quiz Complete!</h1>
          <div className="text-5xl font-black font-mono">
            {score}<span className="text-2xl text-muted-foreground font-normal">/{quizCards.length}</span>
          </div>

          <div className="relative w-32 h-32 mx-auto">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border" />
              <motion.circle
                cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5"
                stroke={pct >= 70 ? "#00D9A3" : pct >= 50 ? "#6C63FF" : "#ef4444"}
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: `${pct} ${100 - pct}` }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black">{pct}%</span>
              <span className="text-xs text-muted-foreground">score</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-5 py-2 text-sm font-bold">
            +{xp} XP earned
          </div>
        </div>

        {wrongAnswers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-400" /> Review these
            </h2>
            {wrongAnswers.map((wa, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2 text-sm">
                <p className="font-medium text-foreground">{wa.question}</p>
                <div className="flex items-center gap-1.5 text-red-400"><XCircle className="w-3.5 h-3.5 shrink-0" />{wa.selected}</div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{wa.correct}</div>
              </motion.div>
            ))}
          </div>
        )}

        <Button className="w-full font-bold" onClick={() => setLocation(`/decks/${deckId}`)}>Back to Deck</Button>
      </motion.div>
    );
  }

  const card = quizCards[currentIndex];
  const progress = (currentIndex / quizCards.length) * 100;
  const timerPct = (timeLeft / 30) * 100;
  const timerDanger = timeLeft <= 7;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">

      {/* Top bar */}
      <div className="sticky top-0 bg-background/90 backdrop-blur-sm z-10 px-2 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setLocation(`/decks/${deckId}`)} className="-ml-2 text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Quit
          </Button>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 font-mono text-sm font-bold px-3 py-1 rounded-full transition-colors ${timerDanger ? "bg-red-500/15 text-red-400 animate-pulse" : "bg-muted text-foreground"}`}>
              <Clock className="w-3.5 h-3.5" />
              {timeLeft}s
            </div>
            <span className="text-sm text-muted-foreground font-medium">{currentIndex + 1}/{quizCards.length}</span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-colors ${timerDanger ? "bg-red-500" : "bg-primary"}`}
            style={{ width: `${timerPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-[#00D9A3] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col px-2 pb-6">
        <div className="flex items-center justify-center py-8 sm:py-12 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-center max-w-lg"
            >
              {deck?.subject && (
                <div className="inline-block text-xs font-bold uppercase tracking-widest text-primary/70 bg-primary/10 rounded-full px-3 py-1 mb-4">
                  {deck.subject}
                </div>
              )}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold leading-snug text-foreground">
                {card.front}
              </h2>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Options */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`opts-${currentIndex}`}
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
            className="grid grid-cols-1 gap-2.5 max-w-lg mx-auto w-full"
          >
            {card.options.map((option: string, i: number) => {
              const isSelected = selectedOption === option;
              const isCorrect = option === card.back;
              const showCorrect = selectedOption !== null && isCorrect;
              const showWrong = isSelected && !isCorrect;
              const dimmed = selectedOption !== null && !isCorrect && !isSelected;

              return (
                <motion.div
                  key={i}
                  variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}
                >
                  <button
                    onClick={() => handleAnswer(option)}
                    disabled={selectedOption !== null}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 font-medium
                      ${showCorrect ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : ""}
                      ${showWrong ? "border-red-500 bg-red-500/10 text-red-400" : ""}
                      ${dimmed ? "opacity-40 border-border" : ""}
                      ${!selectedOption ? "border-border hover:border-primary/60 hover:bg-primary/5 active:scale-[0.99]" : ""}
                    `}
                  >
                    <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-black transition-colors
                      ${showCorrect ? "bg-emerald-500 text-white" : ""}
                      ${showWrong ? "bg-red-500 text-white" : ""}
                      ${!showCorrect && !showWrong ? "bg-muted text-muted-foreground" : ""}
                    `}>
                      {showCorrect ? <CheckCircle2 className="w-4 h-4" /> : showWrong ? <XCircle className="w-4 h-4" /> : LABELS[i]}
                    </span>
                    <span className="text-sm sm:text-base leading-snug">{option}</span>
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
