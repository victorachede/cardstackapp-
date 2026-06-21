import { supabase, getLevel } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LogOut, Flame, Trophy, BookOpen, BarChart3, Shield } from "lucide-react";

function CardStackLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="0" y="0" width="36" height="7" rx="2" fill="#6C63FF" />
      <rect x="0" y="10.5" width="18" height="7" rx="2" fill="#00D9A3" />
      <rect x="0" y="21" width="36" height="7" rx="2" fill="#6C63FF" />
      <circle cx="32" cy="3.5" r="2.5" fill="#00D9A3" />
    </svg>
  );
}

type Step = "login" | "link" | "dashboard";

export default function ParentDashboard() {
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [parentSession, setParentSession] = useState<any>(null);
  const [linkedStudentId, setLinkedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: studentProfile } = useQuery({
    queryKey: ["parent_student_profile", linkedStudentId],
    queryFn: async () => {
      if (!linkedStudentId) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", linkedStudentId).single();
      return data;
    },
    enabled: !!linkedStudentId,
  });

  const { data: studentQuizzes } = useQuery({
    queryKey: ["parent_student_quizzes", linkedStudentId],
    queryFn: async () => {
      if (!linkedStudentId) return [];
      const { data } = await supabase.from("quiz_sessions").select("*")
        .eq("user_id", linkedStudentId).order("completed_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!linkedStudentId,
  });

  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Login failed: " + error.message);
    } else if (data.session) {
      setParentSession(data.session);

      // Check for existing link
      const { data: link } = await supabase.from("parent_links")
        .select("student_id").eq("parent_id", data.session.user.id).single();
      if (link?.student_id) {
        setLinkedStudentId(link.student_id);
        setStep("dashboard");
      } else {
        setStep("link");
      }
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error("Signup failed: " + error.message);
    } else if (data.session) {
      setParentSession(data.session);
      setStep("link");
      toast.success("Account created! Now link your child's account.");
    }
    setLoading(false);
  };

  const handleLinkStudent = async () => {
    if (!studentCode.trim() || !parentSession) return;
    setLoading(true);

    // Find student by referral_code
    const { data: student, error } = await supabase.from("profiles")
      .select("user_id").eq("referral_code", studentCode.toUpperCase()).single();

    if (error || !student) {
      toast.error("Student code not found. Ask your child to find their code in Profile > Settings.");
      setLoading(false);
      return;
    }

    // Save link
    await supabase.from("parent_links").upsert({
      parent_id: parentSession.user.id,
      student_id: student.user_id,
    }, { onConflict: "parent_id" });

    setLinkedStudentId(student.user_id);
    setStep("dashboard");
    toast.success("Student linked successfully!");
    setLoading(false);
  };

  // ── LOGIN ──
  if (step === "login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-3">
            <CardStackLogo className="w-12 h-9 mx-auto" />
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/12 border border-primary/25 rounded-full px-3 py-1 mb-3">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">Parent Portal</span>
              </div>
              <h1 className="font-display text-4xl text-white">PARENT DASHBOARD</h1>
              <p className="text-muted-foreground text-sm mt-1">Monitor your child's study progress</p>
            </div>
          </div>

          <div className="space-y-3 p-6 rounded-2xl border border-white/8 bg-card/60">
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Your email address"
              className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground" />
            <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password"
              className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground" />
            <Button className="w-full font-bold btn-sweep" onClick={handleLogin} disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/8" /></div>
              <div className="relative text-center text-xs text-muted-foreground bg-card px-2 w-fit mx-auto">or</div>
            </div>
            <Button variant="outline" className="w-full border-white/15 text-white btn-sweep" onClick={handleSignup} disabled={loading}>
              Create Parent Account
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            This is a separate account for parents only.<br />Your child logs in at the main app.
          </p>
        </motion.div>
      </div>
    );
  }

  // ── LINK ──
  if (step === "link") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <CardStackLogo className="w-12 h-9 mx-auto mb-4" />
            <h1 className="font-display text-3xl text-white">LINK YOUR CHILD</h1>
            <p className="text-muted-foreground text-sm mt-1">Enter the student code from your child's profile</p>
          </div>
          <div className="p-5 rounded-2xl border border-white/8 bg-card/60 space-y-3">
            <p className="text-xs text-muted-foreground">Ask your child to open CardStack → Profile → Settings → copy their Student Code</p>
            <Input value={studentCode} onChange={e => setStudentCode(e.target.value.toUpperCase())}
              placeholder="8-character student code"
              maxLength={8}
              className="bg-white/5 border-white/10 text-white text-center font-mono text-lg tracking-widest uppercase"
            />
            <Button className="w-full font-bold btn-sweep" onClick={handleLinkStudent} disabled={loading || studentCode.length < 6}>
              {loading ? "Linking…" : "Link Student"}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── DASHBOARD ──
  const lvl = studentProfile ? getLevel(studentProfile.xp) : null;
  const recentScores = (studentQuizzes || []).slice(0, 5);
  const avgScore = recentScores.length > 0
    ? Math.round(recentScores.reduce((a: number, s: any) => a + (s.score / s.total) * 100, 0) / recentScores.length)
    : null;

  // Last 7 days activity (mock based on quiz data)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const day = d.toLocaleDateString("en", { weekday: "short" });
    const sessions = (studentQuizzes || []).filter((q: any) => q.completed_at?.startsWith(dateStr)).length;
    return { day, sessions };
  });
  const maxSessions = Math.max(...last7.map(d => d.sessions), 1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/6 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CardStackLogo className="w-7 h-5" />
          <span className="font-display text-lg text-primary tracking-wide">PARENT PORTAL</span>
        </div>
        <Button variant="ghost" size="sm" onClick={async () => {
          await supabase.auth.signOut();
          setStep("login");
          setParentSession(null);
          setLinkedStudentId(null);
        }} className="text-muted-foreground hover:text-white gap-1.5 text-xs">
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </Button>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-5 pb-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {!studentProfile ? (
            <div className="text-center py-16 text-muted-foreground">Loading student data…</div>
          ) : (
            <>
              {/* Student card */}
              <div className="p-5 rounded-2xl border border-primary/20 bg-primary/6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Monitoring</p>
                    <h1 className="font-display text-3xl text-white">{studentProfile.full_name?.toUpperCase()}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      {studentProfile.exam_target && <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">{studentProfile.exam_target}</Badge>}
                      {lvl && <span className="text-xs text-muted-foreground">{lvl.level}</span>}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-display text-4xl text-primary">{studentProfile.xp}</div>
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total XP</div>
                  </div>
                </div>
                {lvl && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Level Progress</span>
                      <span>{studentProfile.xp} / {lvl.nextThreshold} XP</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${lvl.progress * 100}%`, background: "linear-gradient(90deg, #6C63FF, #00D9A3)" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/6 text-center">
                  <div className="text-2xl font-black text-orange-400">{studentProfile.streak}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-orange-400/60 mt-1">Day Streak</div>
                </div>
                <div className="p-4 rounded-xl border border-[#00D9A3]/20 bg-[#00D9A3]/6 text-center">
                  <div className="text-2xl font-black text-[#00D9A3]">{avgScore !== null ? `${avgScore}%` : "—"}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-[#00D9A3]/60 mt-1">Avg Score</div>
                </div>
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/6 text-center">
                  <div className="text-2xl font-black text-primary">{(studentQuizzes || []).length}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-primary/60 mt-1">Sessions</div>
                </div>
              </div>

              {/* Weekly activity */}
              <div className="p-5 rounded-2xl border border-white/8 bg-card/60 space-y-4">
                <h2 className="font-display text-xl text-white">WEEKLY ACTIVITY</h2>
                <div className="flex items-end justify-between gap-2 h-20">
                  {last7.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t-md bg-primary/20 transition-all duration-500 relative overflow-hidden"
                        style={{ height: `${Math.max((d.sessions / maxSessions) * 60, d.sessions > 0 ? 8 : 2)}px` }}>
                        {d.sessions > 0 && <div className="absolute inset-0 bg-gradient-to-t from-primary to-primary/60" />}
                      </div>
                      <span className="text-[9px] text-muted-foreground font-semibold">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent quizzes */}
              {recentScores.length > 0 && (
                <div className="space-y-2">
                  <h2 className="font-display text-xl text-white">RECENT SCORES</h2>
                  {recentScores.map((s: any, i: number) => {
                    const pct = Math.round((s.score / s.total) * 100);
                    const col = pct >= 70 ? "text-[#00D9A3]" : pct >= 50 ? "text-amber-400" : "text-red-400";
                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-white/8 bg-card/40">
                        <div>
                          <div className="text-sm font-semibold text-white">{s.subject || "General"} Quiz</div>
                          <div className="text-xs text-muted-foreground">{s.score}/{s.total} questions</div>
                        </div>
                        <div className={`font-display text-2xl ${col}`}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Study minimum */}
              <div className="p-4 rounded-2xl border border-white/8 bg-card/40 space-y-3">
                <h2 className="font-display text-lg text-white">STUDY MINIMUM</h2>
                <p className="text-sm text-muted-foreground">
                  {studentProfile.daily_minimum_minutes
                    ? `Your child's daily minimum is set to ${studentProfile.daily_minimum_minutes} minutes.`
                    : "No daily minimum set. Students are encouraged when they miss their goal."}
                </p>
                <p className="text-xs text-primary/60">Parent controls for study minimums are coming in a future update.</p>
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
