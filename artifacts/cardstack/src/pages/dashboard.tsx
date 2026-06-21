import { useAuth } from "@/contexts/AuthContext";
import { supabase, getLevel } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { BrainCircuit, ShieldAlert, Target, Trophy, BookOpen, Zap, CheckCircle2, Store, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SpinWheel } from "@/components/SpinWheel";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

// ─── Daily challenge engine ────────────────────────────────────────────────────

const CHALLENGE_POOL = [
  { type: "review_cards",  description: "Review 20 cards today",         target: 20,  xp_reward: 50,  icon: "🃏" },
  { type: "quiz_score",    description: "Score 80%+ on any quiz",        target: 80,  xp_reward: 75,  icon: "🎯" },
  { type: "study_time",    description: "Study for 30 minutes",          target: 30,  xp_reward: 60,  icon: "⏱️" },
  { type: "mock_test",     description: "Complete a full mock test",      target: 1,   xp_reward: 100, icon: "📝" },
  { type: "review_cards",  description: "Review 10 cards before noon",   target: 10,  xp_reward: 30,  icon: "🌅" },
  { type: "streak",        description: "Maintain your study streak",     target: 1,   xp_reward: 40,  icon: "🔥" },
  { type: "review_cards",  description: "Review 30 cards in one session", target: 30,  xp_reward: 80,  icon: "💪" },
];

const WEEKLY_CHALLENGES = [
  { description: "Master 50 cards this week",     target: 50,  xp_reward: 300, icon: "🏆" },
  { description: "Study every day this week",     target: 7,   xp_reward: 250, icon: "📅" },
  { description: "Score 90%+ on 3 quizzes",       target: 3,   xp_reward: 400, icon: "⭐" },
];

function getDailyChallenge() {
  const day = new Date().getDate();
  return CHALLENGE_POOL[day % CHALLENGE_POOL.length];
}

function getWeeklyChallenge() {
  const week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  return WEEKLY_CHALLENGES[week % WEEKLY_CHALLENGES.length];
}

function getDailyChallengeProgress(type: string, target: number): number {
  const today = new Date().toISOString().split("T")[0];
  const stored = localStorage.getItem(`cardstack_challenge_${today}_${type}`);
  return Math.min(stored ? parseInt(stored) : 0, target);
}

// ─── Motion ───────────────────────────────────────────────────────────────────

const slideUp: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const GOAL_OPTIONS = [
  { label: "20 min", value: 20, desc: "Light daily practice" },
  { label: "45 min", value: 45, desc: "Solid study session" },
  { label: "60 min", value: 60, desc: "Deep focus mode" },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [examDate, setExamDate] = useState(() => localStorage.getItem("cardstack_exam_date") || "");
  const [daysUntil, setDaysUntil] = useState<number | null>(null);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showSpinWheel, setShowSpinWheel] = useState(false);

  const studyMinutesToday = (() => {
    const today = new Date().toISOString().split("T")[0];
    const s = localStorage.getItem(`cardstack_study_mins_${today}`);
    return s ? parseInt(s) : 0;
  })();

  const dailyChallenge = getDailyChallenge();
  const weeklyChallenge = getWeeklyChallenge();
  const challengeProgress = getDailyChallengeProgress(dailyChallenge.type, dailyChallenge.target);
  const challengePct = Math.min((challengeProgress / dailyChallenge.target) * 100, 100);
  const challengeDone = challengePct >= 100;

  const today = new Date().toISOString().split("T")[0];
  const spinUsedToday = localStorage.getItem("cardstack_spin_used") === today;

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: dueCards } = useQuery({
    queryKey: ["due_cards", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("cards").select("*, decks!inner(user_id, title, subject)")
        .lte("next_review_date", today).eq("decks.user_id", user.id).limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: recentDecks } = useQuery({
    queryKey: ["recent_decks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("decks").select("*, cards(count)")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(3);
      return data || [];
    },
    enabled: !!user,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const setGoal = useMutation({
    mutationFn: async (minutes: number) => {
      if (!user) throw new Error();
      await supabase.from("profiles").update({ daily_goal_minutes: minutes }).eq("user_id", user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      setShowGoalDialog(false);
    },
  });

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (examDate) {
      const diff = new Date(examDate).getTime() - Date.now();
      setDaysUntil(Math.ceil(diff / (1000 * 3600 * 24)));
    }
  }, [examDate]);

  useEffect(() => {
    if (!profile) return;
    if (!profile.daily_goal_minutes) setShowGoalDialog(true);
    // Daily login XP
    const last = localStorage.getItem("cardstack_last_login");
    if (last !== today) {
      localStorage.setItem("cardstack_last_login", today);
      supabase.from("profiles").update({ xp: profile.xp + 20, last_study_date: today }).eq("user_id", profile.user_id).then();
    }
  }, [profile?.user_id]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleExamDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setExamDate(val);
    localStorage.setItem("cardstack_exam_date", val);
    if (val) setDaysUntil(Math.ceil((new Date(val).getTime() - Date.now()) / (1000 * 3600 * 24)));
  };

  const handleSpinReward = async (reward: { type: string; amount: number }) => {
    localStorage.setItem("cardstack_spin_used", today);
    if (reward.type === "xp" && reward.amount > 0 && profile) {
      await supabase.from("profiles").update({ xp: profile.xp + reward.amount }).eq("user_id", profile.user_id);
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success(`+${reward.amount} XP awarded!`);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const levelInfo = profile ? getLevel(profile.xp) : null;
  const goalProgress = profile?.daily_goal_minutes
    ? Math.min((studyMinutesToday / profile.daily_goal_minutes) * 100, 100) : 0;
  const firstName = profile?.full_name?.split(" ")[0] || "Student";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD DAY" : "GOOD EVENING";

  // Jamb season countdown (example: June 1)
  const jambDate = new Date(`${new Date().getFullYear()}-06-01`);
  const jambDays = Math.max(0, Math.ceil((jambDate.getTime() - Date.now()) / (1000 * 3600 * 24)));

  return (
    <>
      {/* Goal dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent className="sm:max-w-[380px] bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-white">Set your daily goal</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">How long do you want to study each day?</p>
          </DialogHeader>
          <div className="grid gap-3 pt-2">
            {GOAL_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setGoal.mutate(opt.value)}
                className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/3 hover:border-primary/50 hover:bg-primary/8 transition-all text-left group">
                <div>
                  <div className="font-bold text-lg text-white group-hover:text-primary transition-colors">{opt.label}</div>
                  <div className="text-sm text-muted-foreground">{opt.desc}</div>
                </div>
                <Target className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Spin wheel */}
      <SpinWheel open={showSpinWheel} onClose={() => setShowSpinWheel(false)} onReward={handleSpinReward} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5 py-2">

        {/* ── GREETING ── */}
        <motion.div variants={slideUp} className="space-y-0 pt-2">
          <p className="font-display text-4xl sm:text-5xl text-muted-foreground/50 leading-none">{greeting},</p>
          <h1 className="font-display text-5xl sm:text-7xl text-primary leading-none tracking-wide">
            {profileLoading ? <span className="opacity-30">LOADING…</span> : firstName.toUpperCase()}
          </h1>
          {profile?.exam_target && (
            <p className="text-sm text-muted-foreground mt-2">Targeting <span className="text-white font-semibold">{profile.exam_target}</span> 🔥</p>
          )}
        </motion.div>

        {/* ── JAMB SEASON BANNER ── */}
        <motion.div variants={slideUp}
          className="relative p-4 rounded-2xl overflow-hidden border border-amber-500/20 bg-amber-500/6">
          <div className="absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(ellipse at right bottom, #F59E0B, transparent 60%)" }} />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/70 mb-0.5">🏆 JAMB Season Challenge</div>
              <div className="font-display text-xl text-white">COMING SOON</div>
              <div className="text-xs text-muted-foreground mt-0.5">{jambDays} days away — start preparing now</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-3xl text-amber-400">{jambDays}</div>
              <div className="text-[9px] text-amber-400/60 uppercase tracking-wider">days</div>
            </div>
          </div>
        </motion.div>

        {/* ── STATS ROW ── */}
        <motion.div variants={slideUp} className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl border border-orange-500/20 bg-orange-500/6 text-center">
            <div className="flex items-center justify-center mb-1">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]">
                <path d="M12 2C12 2 5 9 5 14a7 7 0 0014 0C19 9 12 2 12 2Z" fill="#F97316" />
                <path d="M12 8c0 0-3 4-3 6a3 3 0 006 0C15 12 12 8 12 8Z" fill="#FED7AA" />
              </svg>
            </div>
            <div className="text-2xl font-black text-orange-400">{profile?.streak ?? 0}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-orange-400/60">Streak</div>
          </div>
          <div className="p-4 rounded-2xl border border-primary/20 bg-primary/6 text-center">
            <div className="text-2xl font-black text-primary">{profile?.xp ?? 0}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-primary/60">Total XP</div>
            {levelInfo && <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">{levelInfo.level}</div>}
          </div>
          <div className="p-4 rounded-2xl border border-[#00D9A3]/20 bg-[#00D9A3]/6 text-center">
            <div className="text-2xl font-black text-[#00D9A3]">{dueCards?.length ?? 0}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#00D9A3]/60">Due Today</div>
          </div>
        </motion.div>

        {/* ── XP BAR ── */}
        {levelInfo && (
          <motion.div variants={slideUp} className="space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span className="font-semibold text-white">{levelInfo.level}</span>
              <span>{profile?.xp} / {levelInfo.nextThreshold} XP</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${levelInfo.progress * 100}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
                className="h-full rounded-full glow-primary"
                style={{ background: "linear-gradient(90deg, #6C63FF, #00D9A3)" }}
              />
            </div>
          </motion.div>
        )}

        {/* ── DAILY CHALLENGE ── */}
        <motion.div variants={slideUp}
          className={`relative p-4 rounded-2xl border overflow-hidden transition-all ${challengeDone ? "border-[#00D9A3]/30 bg-[#00D9A3]/6" : "border-primary/20 bg-primary/5"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Daily Challenge</div>
                {challengeDone && <Badge className="text-[9px] bg-[#00D9A3]/20 text-[#00D9A3] border-[#00D9A3]/30 py-0">Completed!</Badge>}
              </div>
              <div className="font-semibold text-sm text-white flex items-center gap-2">
                <span>{dailyChallenge.icon}</span>
                {dailyChallenge.description}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{
                    width: `${challengePct}%`,
                    background: challengeDone ? "#00D9A3" : "linear-gradient(90deg, #6C63FF, #00D9A3)"
                  }} initial={{ width: 0 }} animate={{ width: `${challengePct}%` }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }} />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{challengeProgress}/{dailyChallenge.target}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-bold text-primary">+{dailyChallenge.xp_reward}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">XP</div>
            </div>
          </div>

          {challengeDone && !spinUsedToday && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="mt-3 pt-3 border-t border-[#00D9A3]/15">
              <Button size="sm" onClick={() => setShowSpinWheel(true)}
                className="w-full font-bold text-sm btn-sweep bg-[#00D9A3]/20 hover:bg-[#00D9A3]/30 text-[#00D9A3] border border-[#00D9A3]/30 gap-2">
                🎡 Claim Your Spin!
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* ── WEEKLY CHALLENGE ── */}
        <motion.div variants={slideUp} className="p-4 rounded-2xl border border-white/8 bg-card/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Weekly Challenge</div>
            <span className="text-xs font-bold text-amber-400">+{weeklyChallenge.xp_reward} XP</span>
          </div>
          <div className="font-semibold text-sm text-white flex items-center gap-2">
            <span>{weeklyChallenge.icon}</span>
            {weeklyChallenge.description}
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500/50 rounded-full" style={{ width: "15%" }} />
          </div>
        </motion.div>

        {/* ── STUDY NOW ── */}
        <motion.div variants={slideUp}
          className="relative p-5 rounded-2xl overflow-hidden border border-primary/25 bg-primary/8"
          style={{ boxShadow: "0 0 40px hsl(245 100% 69% / 0.08)" }}>
          <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse at right bottom, #6C63FF, transparent 60%)" }} />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="font-display text-3xl text-white">{dueCards?.length || 0} CARDS</div>
              <div className="text-sm text-muted-foreground mt-0.5">waiting for review today</div>
            </div>
            <Button onClick={() => {
              if (dueCards && dueCards.length > 0) setLocation(`/study/${dueCards[0].deck_id}`);
              else if (recentDecks && recentDecks.length > 0) setLocation(`/study/${recentDecks[0].id}`);
              else setLocation("/decks");
            }} className="font-bold btn-sweep bg-primary hover:bg-primary/90 glow-primary" data-testid="button-study-now">
              Study Now
            </Button>
          </div>
        </motion.div>

        {/* ── EXAM COUNTDOWN ── */}
        <motion.div variants={slideUp} className="p-5 rounded-2xl border border-white/8 bg-card/60">
          {daysUntil !== null && daysUntil > 0 ? (
            <div className="flex items-end justify-between">
              <div>
                <div className="font-display text-7xl sm:text-8xl text-white leading-none text-glow-primary">{daysUntil}</div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-primary/70 mt-1">DAYS TO EXAM</div>
                <button onClick={() => { setExamDate(""); setDaysUntil(null); localStorage.removeItem("cardstack_exam_date"); }}
                  className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground underline mt-1">Change date</button>
              </div>
              <div className="text-right">
                <div className="font-semibold text-white/40">{profile?.exam_target || "Exam"}</div>
                <div className="text-xs text-muted-foreground">{examDate}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-display text-xl text-white/60">SET EXAM COUNTDOWN</p>
              <p className="text-xs text-muted-foreground">Track how many days until your exam</p>
              <input type="date" value={examDate} onChange={handleExamDateChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl text-sm p-3 text-white focus:border-primary/60 transition-colors"
                data-testid="input-exam-date" />
            </div>
          )}
        </motion.div>

        {/* ── QUICK ACTIONS ── */}
        <motion.div variants={slideUp} className="grid grid-cols-2 gap-3">
          <button onClick={() => setLocation("/past-questions")}
            className="relative h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/8 bg-card/60 hover:border-primary/40 hover:bg-primary/8 transition-all duration-300 group btn-sweep"
            data-testid="button-take-quiz">
            <BrainCircuit className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors relative z-10" />
            <span className="text-sm font-bold text-muted-foreground group-hover:text-white transition-colors relative z-10">Take Quiz</span>
          </button>

          <button onClick={() => setLocation("/leaderboard")}
            className="relative h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 hover:border-yellow-500/40 hover:bg-yellow-500/10 transition-all duration-300 group btn-sweep">
            <Trophy className="w-6 h-6 text-yellow-400 relative z-10" />
            <span className="text-sm font-bold text-yellow-400/80 group-hover:text-yellow-300 transition-colors relative z-10">Leaderboard</span>
          </button>

          {profile?.is_pro ? (
            <button onClick={() => setLocation("/mock")}
              className="relative h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#00D9A3]/25 bg-[#00D9A3]/6 hover:border-[#00D9A3]/50 hover:bg-[#00D9A3]/12 transition-all group btn-sweep"
              data-testid="button-mock-test">
              <ShieldAlert className="w-6 h-6 text-[#00D9A3] relative z-10" />
              <span className="text-sm font-bold text-[#00D9A3] relative z-10">Mock Test</span>
            </button>
          ) : (
            <button onClick={() => setLocation("/upgrade")}
              className="relative h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/6 bg-card/40 transition-all group overflow-hidden"
              data-testid="button-mock-locked">
              <div className="absolute inset-0 bg-background/40" />
              <ShieldAlert className="w-6 h-6 text-muted-foreground/30" />
              <span className="text-sm font-bold text-muted-foreground/30">Mock (PRO)</span>
              <span className="relative text-[9px] font-bold uppercase tracking-widest text-primary/50 border border-primary/15 rounded-full px-2 py-0.5 z-10">Upgrade</span>
            </button>
          )}

          <button onClick={() => setLocation("/marketplace")}
            className="relative h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border border-violet-500/25 bg-violet-500/5 hover:border-violet-500/40 hover:bg-violet-500/10 transition-all duration-300 group btn-sweep">
            <Store className="w-6 h-6 text-violet-400 relative z-10" />
            <span className="text-sm font-bold text-violet-400/80 group-hover:text-violet-300 transition-colors relative z-10">Marketplace</span>
          </button>
        </motion.div>

        {/* ── COMMUNITY ── */}
        <motion.div variants={slideUp} className="flex gap-3">
          <button
            onClick={() => setLocation("/rooms")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/8 bg-card/50 hover:border-primary/40 hover:bg-primary/8 transition-all group"
          >
            <Users className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm font-semibold text-muted-foreground group-hover:text-white transition-colors">Study Rooms</span>
          </button>
          <button
            onClick={() => setLocation("/social")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/8 bg-card/50 hover:border-primary/40 hover:bg-primary/8 transition-all group"
          >
            <MessageCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm font-semibold text-muted-foreground group-hover:text-white transition-colors">Social</span>
          </button>
        </motion.div>

        {/* ── GOAL PROGRESS ── */}
        {profile?.daily_goal_minutes && (
          <motion.div variants={slideUp} className="p-4 rounded-2xl border border-white/8 bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Daily Goal</span>
              <span className="text-xs text-muted-foreground">{studyMinutesToday} / {profile.daily_goal_minutes} min</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${goalProgress}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
                className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #6C63FF, #00D9A3)" }} />
            </div>
          </motion.div>
        )}

        {/* ── RECENT DECKS ── */}
        <motion.div variants={slideUp} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-white/80">RECENT DECKS</h2>
            <Link href="/decks"><a className="text-xs font-bold text-primary/70 hover:text-primary uppercase tracking-wider">View all →</a></Link>
          </div>
          <div className="space-y-2">
            {recentDecks?.map((deck: any) => (
              <Link key={deck.id} href={`/decks/${deck.id}`}>
                <a className="block group">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/6 bg-card/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200">
                    <div className="min-w-0">
                      <div className="font-semibold text-white text-sm truncate group-hover:text-primary transition-colors">{deck.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {deck.subject && <Badge variant="secondary" className="text-[9px] py-0 bg-primary/15 text-primary/80 border-primary/20">{deck.subject}</Badge>}
                        <span className="text-xs text-muted-foreground">{deck.cards[0]?.count || 0} cards</span>
                      </div>
                    </div>
                    <div className="text-muted-foreground/30 group-hover:text-primary/50 ml-4 shrink-0">→</div>
                  </div>
                </a>
              </Link>
            ))}
            {recentDecks?.length === 0 && (
              <div className="text-center py-10 border border-dashed border-white/6 rounded-2xl space-y-2">
                <div className="font-display text-2xl text-white/20">NO DECKS YET</div>
                <p className="text-sm text-muted-foreground">
                  <button onClick={() => setLocation("/decks")} className="text-primary hover:underline">Create your first deck</button>
                </p>
              </div>
            )}
          </div>
        </motion.div>

      </motion.div>
    </>
  );
}
