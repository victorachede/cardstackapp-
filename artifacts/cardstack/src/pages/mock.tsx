import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Timer, Trophy, Lock, CheckCircle2, Circle, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

const OPTION_LABELS = ["A", "B", "C", "D"];

export default function Mock() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [examType, setExamType] = useState<string>("JAMB");
  const [status, setStatus] = useState<"setup" | "running" | "results">("setup");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(6300);
  const [score, setScore] = useState(0);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user?.id).single();
      return data;
    },
    enabled: !!user,
  });

  const fetchQuestions = useMutation({
    mutationFn: async () => {
      try {
        const { data: rpc, error: rpcError } = await supabase.rpc("get_random_questions", { limit_num: 60, exam: examType });
        if (!rpcError && rpc && rpc.length > 0) return rpc;
      } catch (_) {}
      const { data, error } = await supabase.from("past_questions").select("*").eq("exam_type", examType).limit(60);
      if (error) throw new Error("Failed to load questions");
      return data || [];
    },
    onError: () => {
      toast.error("Failed to load questions. Check your connection.");
    },
    onSuccess: (data) => {
      if (!data || data.length === 0) {
        toast.error("No questions found for this exam type. Try JAMB for now.");
        return;
      }
      if (data.length < 10) {
        toast.error(`Only ${data.length} questions available for ${examType}. Try JAMB for now.`);
        return;
      }
      setQuestions(data);
      setStatus("running");
      setTimeLeft(data.length < 60 ? data.length * 90 : 6300);
      setAnswers({});
      setCurrentIndex(0);
    },
  });

  const finishExam = useMutation({
    mutationFn: async () => {
      let correct = 0;
      questions.forEach(q => { if (answers[q.id] === q.answer) correct++; });
      setScore(correct);
      const { data: p } = await supabase.from("profiles").select("xp").eq("user_id", user?.id).single();
      if (p) await supabase.from("profiles").update({ xp: p.xp + 100 }).eq("user_id", user?.id);
    },
    onSuccess: () => { setStatus("results"); toast.success("Exam submitted! +100 XP"); },
  });

  useEffect(() => {
    if (status !== "running") return;
    if (timeLeft <= 0) { finishExam.mutate(); return; }
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, status]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  // PRO gate
  if (profile && !profile.is_pro) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-6 p-8 rounded-2xl border border-border bg-card">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black mb-2">Mock Exams are PRO</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">Full CBT simulation under real exam conditions — timed, no pausing, just like the actual thing.</p>
          </div>
          <Button className="w-full font-bold" onClick={() => setLocation("/upgrade")}>Upgrade to PRO</Button>
        </div>
      </motion.div>
    );
  }

  // SETUP screen
  if (status === "setup") {
    const examInfo: Record<string, { duration: string; questions: string; desc: string }> = {
      JAMB: { duration: "1h 45m", questions: "60 questions", desc: "Covers English, Maths + 2 science/art subjects" },
      WAEC: { duration: "2h 00m", questions: "60 questions", desc: "Covers your selected WAEC subjects" },
      NECO: { duration: "2h 00m", questions: "60 questions", desc: "Covers your selected NECO subjects" },
    };
    const info = examInfo[examType];

    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto space-y-6 py-10 px-4">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Timer className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-black">Mock Examination</h1>
          <p className="text-muted-foreground text-sm">Simulate the real CBT experience. No pausing. No cheating.</p>
        </div>

        <div className="space-y-4 p-6 rounded-2xl border border-border bg-card">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Select Exam</label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger className="h-11 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="JAMB">JAMB UTME</SelectItem>
                <SelectItem value="WAEC">WAEC SSCE</SelectItem>
                <SelectItem value="NECO">NECO SSCE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="text-lg font-black text-foreground">{info.duration}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Duration</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="text-lg font-black text-foreground">{info.questions}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Questions</div>
            </div>
          </div>

          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-500 text-xs font-bold uppercase tracking-wide">
              <AlertTriangle className="w-3.5 h-3.5" /> Rules
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 list-none">
              <li>• Timer starts immediately and cannot be paused</li>
              <li>• You can navigate between questions freely</li>
              <li>• Submit before time expires or it auto-submits</li>
            </ul>
          </div>

          <Button
            className="w-full h-12 font-black text-base"
            onClick={() => fetchQuestions.mutate()}
            disabled={fetchQuestions.isPending}
          >
            {fetchQuestions.isPending ? (
              <span className="flex items-center gap-2">
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full inline-block" />
                Loading questions…
              </span>
            ) : `Start ${examType} Mock`}
          </Button>
        </div>
      </motion.div>
    );
  }

  // RESULTS screen
  if (status === "results") {
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 70 ? { label: "Excellent", color: "text-emerald-400" } : pct >= 50 ? { label: "Good", color: "text-primary" } : { label: "Needs Work", color: "text-red-400" };
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm mx-auto py-10 px-4 space-y-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.15 }}>
          <Trophy className={`w-16 h-16 mx-auto ${pct >= 50 ? "text-yellow-400" : "text-muted-foreground"}`} />
        </motion.div>

        <div>
          <h1 className="text-2xl font-black">{examType} Mock Complete</h1>
          <p className={`text-sm font-semibold mt-1 ${grade.color}`}>{grade.label}</p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card space-y-5">
          <div>
            <div className="text-5xl font-black font-mono">{score}<span className="text-2xl text-muted-foreground font-normal">/{questions.length}</span></div>
            <p className="text-muted-foreground text-sm mt-1">correct answers</p>
          </div>

          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`absolute h-full rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-primary" : "bg-red-500"}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            {[
              { val: `${pct}%`, label: "Accuracy" },
              { val: `+100`, label: "XP earned" },
              { val: `${score}`, label: "Correct" },
            ].map(({ val, label }) => (
              <div key={label} className="bg-muted/50 rounded-xl p-3">
                <div className="text-lg font-black text-foreground">{val}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full font-bold" onClick={() => setStatus("setup")}>Take Another Mock</Button>
      </motion.div>
    );
  }

  // RUNNING exam
  const q = questions[currentIndex];
  const timerDanger = timeLeft < 300;
  const options = q?.options ? Object.entries(q.options) : [];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">

      {/* Header */}
      <header className="shrink-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-foreground hidden sm:block">{examType}</span>
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
            Q {currentIndex + 1} / {questions.length}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00D9A3]" /> {answeredCount} answered
            {unansweredCount > 0 && <><span className="mx-1">·</span><Circle className="w-3.5 h-3.5" /> {unansweredCount} left</>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 font-mono font-black text-sm px-3 py-1.5 rounded-lg transition-colors ${timerDanger ? "bg-red-500/15 text-red-400 animate-pulse" : "bg-muted text-foreground"}`}>
            <Timer className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
          <Button variant="destructive" size="sm" onClick={() => finishExam.mutate()} className="font-bold text-xs">
            Submit
          </Button>
        </div>
      </header>

      {/* Progress stripe */}
      <div className="h-0.5 bg-muted shrink-0">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Question body */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
          {/* Subject tag */}
          {q?.subject && (
            <div className="inline-block bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest rounded-full px-3 py-1">
              {q.subject}
            </div>
          )}

          {/* Question text */}
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-lg sm:text-xl font-semibold leading-relaxed text-foreground"
            >
              {q?.question}
            </motion.h2>
          </AnimatePresence>

          {/* Options */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`options-${currentIndex}`}
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
              className="space-y-2.5"
            >
              {options.map(([key, value], i) => {
                const selected = answers[q?.id] === key;
                return (
                  <motion.div
                    key={key}
                    variants={{ hidden: { opacity: 0, x: -14 }, visible: { opacity: 1, x: 0 } }}
                  >
                    <button
                      onClick={() => setAnswers(p => ({ ...p, [q.id]: key }))}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150 group
                        ${selected
                          ? "border-primary bg-primary/8 shadow-sm shadow-primary/10"
                          : "border-border hover:border-primary/40 hover:bg-accent/5 active:scale-[0.99]"
                        }`}
                    >
                      <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-black transition-colors
                        ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary"}`}>
                        {OPTION_LABELS[i] ?? key}
                      </span>
                      <span className={`text-sm sm:text-base leading-snug ${selected ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                        {value as string}
                      </span>
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer nav */}
      <footer className="shrink-0 bg-card border-t border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">

          <Button
            variant="outline"
            size="sm"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(p => p - 1)}
            className="gap-1 font-semibold"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </Button>

          {/* Question number grid - mobile shows condensed, desktop shows all */}
          <div className="flex gap-1 overflow-x-auto flex-1 justify-center py-1 px-2">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-7 h-7 shrink-0 rounded text-xs font-bold transition-all
                  ${currentIndex === i ? "bg-primary text-primary-foreground scale-110" :
                    answers[q.id] ? "bg-[#00D9A3]/20 text-[#00D9A3] border border-[#00D9A3]/30" :
                    "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            disabled={currentIndex === questions.length - 1}
            onClick={() => setCurrentIndex(p => p + 1)}
            className="gap-1 font-semibold"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
