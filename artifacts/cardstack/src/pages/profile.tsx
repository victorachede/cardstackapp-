import { useAuth } from "@/contexts/AuthContext";
import { supabase, getLevel } from "@/lib/supabase";
import type { ExamTarget, Subject } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  LogOut, Trophy, Edit2, Crown, Share2, Copy, Volume2, VolumeX,
  Users, Bell, BellOff, Moon, Sun, Monitor, Target, BookOpen,
  ChevronDown, ChevronUp, Check, Link,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_SUBJECTS: Subject[] = [
  "English", "Maths", "Biology", "Chemistry", "Physics",
  "Government", "Literature", "Economics", "Geography", "CRS",
];

const EXAM_TARGETS: { value: ExamTarget; label: string; desc: string }[] = [
  { value: "JAMB",      label: "JAMB",       desc: "UTME only" },
  { value: "WAEC",      label: "WAEC",       desc: "SSCE only" },
  { value: "NECO",      label: "NECO",       desc: "NECO only" },
  { value: "JAMB+WAEC", label: "JAMB+WAEC",  desc: "Both exams" },
];

const GOAL_OPTIONS = [
  { label: "20 min", value: 20 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
];

const THEME_OPTIONS = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light",  label: "Light",  Icon: Sun },
  { value: "dark",   label: "Dark",   Icon: Moon },
];

const REFERRAL_REWARD_AT = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveReferralCode(userId: string): string {
  return userId.replace(/-/g, "").substring(0, 8).toUpperCase();
}

function applyTheme(theme: string) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // system
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FlameIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 2C12 2 5 9 5 14a7 7 0 0014 0C19 9 12 2 12 2Z" fill="#F97316" />
      <path d="M12 8c0 0-3 4-3 6a3 3 0 006 0C15 12 12 8 12 8Z" fill="#FED7AA" />
    </svg>
  );
}

function SubjectBar({ subject, score }: { subject: string; score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  const textColor = score >= 70 ? "text-green-500" : score >= 40 ? "text-amber-500" : "text-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{subject}</span>
        <span className={`font-bold text-xs ${textColor}`}>{score}%</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-medium leading-tight">{label}</div>
          {description && <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{description}</div>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1 pt-1 pb-0.5">
      {children}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Local UI state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // App preferences (local only)
  const [audioEnabled, setAudioEnabled] = useState(
    () => localStorage.getItem("cardstack_audio_enabled") !== "false"
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem("cardstack_theme") || "system"
  );
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "unsupported">("default");

  // Study settings (mirrors DB, edited locally then saved)
  const [pendingExamTarget, setPendingExamTarget] = useState<ExamTarget | null>(null);
  const [pendingSubjects, setPendingSubjects] = useState<Subject[] | null>(null);
  const [pendingGoal, setPendingGoal] = useState<number | null>(
    () => { const v = localStorage.getItem("cardstack_daily_goal"); return v ? parseInt(v, 10) : null; }
  );

  const codeSavedRef = useRef(false);
  const settingsSaving = useRef(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: quizSessions } = useQuery({
    queryKey: ["quiz_sessions_profile", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("quiz_sessions").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: referralCount } = useQuery({
    queryKey: ["referral_count", profile?.referral_code],
    queryFn: async () => {
      if (!profile?.referral_code) return 0;
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", profile.referral_code);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!profile?.referral_code,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const updateProfile = useMutation({
    mutationFn: async (payload: Partial<{ full_name: string; exam_target: ExamTarget; subjects: Subject[] }>) => {
      if (!user) throw new Error("Not logged in");
      if (Object.keys(payload).length === 0) return;
      const { error } = await supabase.from("profiles").update(payload).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  const saveReferralCode = useMutation({
    mutationFn: async (code: string) => {
      if (!user) return;
      await supabase.from("profiles").update({ referral_code: code }).eq("user_id", user.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] }),
    onError: () => {},
  });

  // ── Effects ───────────────────────────────────────────────────────────────

  // Seed referral code once
  useEffect(() => {
    if (profile && !profile.referral_code && user && !codeSavedRef.current) {
      codeSavedRef.current = true;
      saveReferralCode.mutate(deriveReferralCode(user.id));
    }
  }, [profile?.user_id]);

  // Sync pending settings from DB when profile loads
  useEffect(() => {
    if (profile && pendingExamTarget === null) setPendingExamTarget(profile.exam_target);
    if (profile && pendingSubjects === null) setPendingSubjects(profile.subjects ?? []);
    if (pendingGoal === null) {
      const stored = localStorage.getItem("cardstack_daily_goal");
      setPendingGoal(stored ? parseInt(stored, 10) : (profile?.daily_goal_minutes ?? 30));
    }
  }, [profile?.user_id]);

  // Apply theme on mount and change
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("cardstack_theme", theme);
  }, [theme]);

  // Check notification permission
  useEffect(() => {
    if (!("Notification" in window)) {
      setNotifStatus("unsupported");
    } else {
      setNotifStatus(Notification.permission);
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAudioToggle = (val: boolean) => {
    setAudioEnabled(val);
    localStorage.setItem("cardstack_audio_enabled", val ? "true" : "false");
  };

  const handleNotifToggle = async () => {
    if (notifStatus === "unsupported") return;
    if (notifStatus === "granted") {
      // Can't revoke programmatically — guide them
      toast("To disable, go to your browser settings > Notifications.", { icon: "ℹ️" });
      return;
    }
    const result = await Notification.requestPermission();
    setNotifStatus(result);
    if (result === "granted") toast.success("Notifications enabled!");
    else toast.error("Permission denied. Check browser settings.");
  };

  const handleSaveStudySettings = () => {
    if (settingsSaving.current) return;
    settingsSaving.current = true;

    // daily_goal_minutes is stored locally — save immediately
    if (pendingGoal !== null) {
      localStorage.setItem("cardstack_daily_goal", String(pendingGoal));
    }

    const payload: Parameters<typeof updateProfile.mutate>[0] = {};
    if (pendingExamTarget && pendingExamTarget !== profile?.exam_target)
      payload.exam_target = pendingExamTarget;
    if (pendingSubjects && JSON.stringify(pendingSubjects.slice().sort()) !== JSON.stringify((profile?.subjects ?? []).slice().sort()))
      payload.subjects = pendingSubjects;

    if (Object.keys(payload).length === 0) {
      toast.success("Settings saved!");
      settingsSaving.current = false;
      return;
    }
    updateProfile.mutate(payload, {
      onSuccess: () => {
        toast.success("Settings saved!");
        settingsSaving.current = false;
      },
      onError: () => {
        toast.error("Couldn't save — try again");
        settingsSaving.current = false;
      },
    });
  };

  const toggleSubject = (subj: Subject) => {
    setPendingSubjects(prev =>
      prev
        ? prev.includes(subj)
          ? prev.filter(s => s !== subj)
          : [...prev, subj]
        : [subj]
    );
  };

  const handleCopyCode = () => {
    const code = profile?.referral_code || deriveReferralCode(user?.id || "");
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  const handleShareLink = () => {
    const code = profile?.referral_code || deriveReferralCode(user?.id || "");
    const link = `${window.location.origin}/signup?ref=${code}`;
    if (navigator.share) {
      navigator.share({
        title: "CardStack — Ace JAMB, WAEC & NECO",
        text: `Hey! I've been using CardStack to prep for my exams — it's got flashcards, past questions for JAMB/WAEC/NECO, and spaced repetition. Seriously a game changer. Use my code ${code} to get 7 days PRO for free! 🔥`,
        url: link,
      });
    } else {
      navigator.clipboard.writeText(link);
      toast.success("Invite link copied!");
    }
  };

  const handleShareProfile = () => {
    const code = profile?.referral_code || deriveReferralCode(user?.id || "");
    const link = `${window.location.origin}/u/${code}`;
    if (navigator.share) {
      navigator.share({
        title: `${profile.full_name} on CardStack`,
        text: `Check out my CardStack profile — Level ${getLevel(profile.xp).level}, ${profile.streak} day streak. Let's study for JAMB/WAEC/NECO together! 🔥`,
        url: link,
      });
    } else {
      navigator.clipboard.writeText(link);
      toast.success("Profile link copied!");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setLocation("/login");
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const subjectScores: Record<string, { score: number; count: number }> = {};
  for (const s of (quizSessions || [])) {
    const subj = (s as any).subject || "General";
    if (!subjectScores[subj]) subjectScores[subj] = { score: 0, count: 0 };
    subjectScores[subj].score += (s.score / s.total) * 100;
    subjectScores[subj].count += 1;
  }
  const performanceData = ALL_SUBJECTS
    .filter(s => subjectScores[s])
    .map(s => ({ subject: s, score: Math.round(subjectScores[s].score / subjectScores[s].count) }));

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading profile...</div>;
  if (!profile) return null;

  const levelInfo = getLevel(profile.xp);
  const initials = profile.full_name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() || "ST";
  const referralCode = profile.referral_code || deriveReferralCode(user?.id || "");
  const friendsJoined = referralCount ?? 0;
  const rewardUnlocked = friendsJoined >= REFERRAL_REWARD_AT;
  const rewardProgress = Math.min((friendsJoined / REFERRAL_REWARD_AT) * 100, 100);
  const activeSubjects = pendingSubjects ?? profile.subjects ?? [];
  const activeTarget = pendingExamTarget ?? profile.exam_target;
  const activeGoal = pendingGoal ?? profile.daily_goal_minutes;
  const settingsChanged =
    activeTarget !== profile.exam_target ||
    JSON.stringify(activeSubjects.slice().sort()) !== JSON.stringify((profile.subjects ?? []).slice().sort()) ||
    activeGoal !== profile.daily_goal_minutes;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 pb-8"
    >
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      {/* ── Profile card ─────────────────────────────────────────────────── */}
      <Card className="bg-card border-primary/10 overflow-hidden relative">
        <div className="absolute top-0 w-full h-24 bg-gradient-to-r from-primary/20 to-accent/20" />
        <CardContent className="p-6 pt-12 relative flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 border-4 border-background bg-background shadow-xl mb-4">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-2 justify-center">
            <h2 className="text-2xl font-bold">{profile.full_name}</h2>
            <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (open) setEditName(profile.full_name); }}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Edit2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader><DialogTitle>Edit Name</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <Button
                    onClick={() => updateProfile.mutate({ full_name: editName }, {
                      onSuccess: () => { toast.success("Name updated"); setIsEditOpen(false); }
                    })}
                    disabled={updateProfile.isPending}
                    className="w-full"
                  >
                    Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <p className="text-muted-foreground text-sm mb-3">{user?.email}</p>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShareProfile}
            className="mb-4 gap-1.5 text-xs"
          >
            <Link className="w-3.5 h-3.5" /> Share Profile
          </Button>

          <div className="flex gap-2 flex-wrap justify-center mb-6">
            <Badge variant="default" className="bg-accent text-accent-foreground">{profile.exam_target}</Badge>
            {profile.is_pro && (
              <Badge className="bg-yellow-500 text-black hover:bg-yellow-600 border-none">
                <Crown className="w-3 h-3 mr-1" /> PRO
              </Badge>
            )}
          </div>

          <div className="w-full bg-accent/5 rounded-xl p-4 border border-border">
            <div className="flex justify-between items-end mb-2">
              <div className="text-left">
                <div className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Level</div>
                <div className="text-xl font-bold">{levelInfo.level}</div>
              </div>
              <div className="text-right text-xs text-muted-foreground">{profile.xp} / {levelInfo.nextThreshold} XP</div>
            </div>
            <Progress value={levelInfo.progress * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
              <FlameIcon className="w-7 h-7" />
            </div>
            <div className="text-2xl font-bold">{profile.streak}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Day Streak</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div className="text-2xl font-bold">{profile.xp}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Total XP</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Performance heatmap ──────────────────────────────────────────── */}
      {performanceData.length > 0 && (
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subject Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {performanceData.map(({ subject, score }) => (
              <SubjectBar key={subject} subject={subject} score={score} />
            ))}
            <p className="text-xs text-muted-foreground pt-1">
              <span className="text-green-500 font-semibold">●</span> Strong &nbsp;
              <span className="text-amber-500 font-semibold">●</span> Average &nbsp;
              <span className="text-red-500 font-semibold">●</span> Needs work
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Referral card ─────────────────────────────────────────────────── */}
      <Card className={`bg-card ${rewardUnlocked ? "border-green-500/40" : "border-primary/20"}`}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-base">Invite friends, earn PRO</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Invite {REFERRAL_REWARD_AT} friends → both get <span className="text-primary font-semibold">7 days PRO free</span> on their first session.
              </div>
            </div>
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2.5">
              <span className="font-mono font-bold tracking-[0.2em] text-sm">{referralCode}</span>
              <button onClick={handleCopyCode} className="text-muted-foreground hover:text-primary transition-colors ml-2" title="Copy code">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <Button size="sm" onClick={handleShareLink} className="shrink-0 gap-1.5">
              <Share2 className="w-4 h-4" /> Share
            </Button>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> {friendsJoined} of {REFERRAL_REWARD_AT} friends joined
              </span>
              {rewardUnlocked
                ? <span className="text-green-500 font-semibold">Reward unlocked! 🎉</span>
                : <span className="text-muted-foreground">{REFERRAL_REWARD_AT - friendsJoined} more to go</span>}
            </div>
            <Progress value={rewardProgress} className={`h-2 ${rewardUnlocked ? "[&>div]:bg-green-500" : ""}`} />
          </div>
        </CardContent>
      </Card>

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      <Card className="bg-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/5 transition-colors"
          onClick={() => setShowSettings(s => !s)}
        >
          <CardTitle className="text-base">Settings</CardTitle>
          {showSettings
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        <AnimatePresence initial={false}>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="px-5 pb-5 pt-0 space-y-1">

                {/* ── Study preferences ───────────────────────────────── */}
                <SectionLabel>Study Preferences</SectionLabel>

                {/* Exam Target */}
                <div className="py-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Target className="w-4 h-4 text-muted-foreground shrink-0" />
                    Exam Target
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {EXAM_TARGETS.map(({ value, label, desc }) => (
                      <button
                        key={value}
                        onClick={() => setPendingExamTarget(value)}
                        className={`flex flex-col items-start px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${
                          activeTarget === value
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border hover:border-primary/40 hover:bg-accent/5"
                        }`}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="text-[11px] text-muted-foreground font-normal">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Subjects */}
                <div className="py-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                    My Subjects
                    <span className="ml-auto text-xs text-muted-foreground font-normal">{activeSubjects.length} selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SUBJECTS.map(subj => {
                      const active = activeSubjects.includes(subj);
                      return (
                        <button
                          key={subj}
                          onClick={() => toggleSubject(subj)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                          {subj}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Daily Goal */}
                <div className="py-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Target className="w-4 h-4 text-muted-foreground shrink-0" />
                    Daily Study Goal
                  </div>
                  <div className="flex gap-2">
                    {GOAL_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setPendingGoal(opt.value)}
                        className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${
                          activeGoal === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40 text-muted-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setPendingGoal(null)}
                      className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        activeGoal === null
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40 text-muted-foreground"
                      }`}
                    >
                      None
                    </button>
                  </div>
                </div>

                {/* Save study settings */}
                <Button
                  className="w-full mt-1"
                  onClick={handleSaveStudySettings}
                  disabled={!settingsChanged || updateProfile.isPending}
                  variant={settingsChanged ? "default" : "outline"}
                >
                  {updateProfile.isPending ? "Saving…" : settingsChanged ? "Save Changes" : "Up to date"}
                </Button>

                <Separator className="my-2" />

                {/* ── App Preferences ─────────────────────────────────── */}
                <SectionLabel>App Preferences</SectionLabel>

                <SettingRow
                  icon={audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  label="Audio on Flashcards"
                  description="Read cards aloud during study"
                >
                  <Switch checked={audioEnabled} onCheckedChange={handleAudioToggle} />
                </SettingRow>

                <Separator />

                <SettingRow
                  icon={notifStatus === "granted" ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  label="Study Reminders"
                  description={
                    notifStatus === "unsupported"
                      ? "Not supported on this browser"
                      : notifStatus === "granted"
                        ? "Notifications are on"
                        : notifStatus === "denied"
                          ? "Blocked — enable in browser settings"
                          : "Get nudged when cards are due"
                  }
                >
                  <Switch
                    checked={notifStatus === "granted"}
                    onCheckedChange={handleNotifToggle}
                    disabled={notifStatus === "unsupported" || notifStatus === "denied"}
                  />
                </SettingRow>

                <Separator />

                {/* Theme */}
                <div className="py-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sun className="w-4 h-4 text-muted-foreground shrink-0" />
                    Appearance
                  </div>
                  <div className="flex gap-2">
                    {THEME_OPTIONS.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          theme === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40 text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ── Upgrade / Sign out ────────────────────────────────────────────── */}
      <div className="space-y-3">
        {!profile.is_pro && (
          <Button
            className="w-full justify-between h-14 text-base font-bold bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black border-none"
            onClick={() => setLocation("/upgrade")}
            data-testid="button-go-pro"
          >
            <span className="flex items-center"><Crown className="w-5 h-5 mr-2" /> Upgrade to PRO</span>
            <span className="text-sm bg-black/20 px-2 py-1 rounded">N1,500/mo</span>
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive h-12"
          onClick={handleSignOut}
          data-testid="button-sign-out"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </motion.div>
  );
}
