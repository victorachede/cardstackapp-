import { useAuth } from "@/contexts/AuthContext";
import { supabase, ExamType, Subject } from "@/lib/supabase";
import { PAST_QUESTIONS } from "@/data/pastQuestions";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Check, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SUBJECTS = ["All", "English", "Maths", "Biology", "Chemistry", "Physics", "Government", "Literature", "Economics", "Geography", "CRS"];
const YEARS = ["All", "2023", "2022", "2021", "2020", "2019"];
const EXAMS = ["All", "JAMB", "WAEC", "NECO"];

export default function PastQuestions() {
  const { user } = useAuth();
  const [subject, setSubject] = useState<string>("All");
  const [examType, setExamType] = useState<string>("All");
  const [year, setYear] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [answeredQs, setAnsweredQs] = useState<Record<string, string>>({});

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user?.id).single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    async function seedDB() {
      const { count } = await supabase.from("past_questions").select("*", { count: 'exact', head: true });
      if (count === 0) {
        const chunks = [];
        for (let i = 0; i < PAST_QUESTIONS.length; i += 50) {
          chunks.push(PAST_QUESTIONS.slice(i, i + 50));
        }
        for (const chunk of chunks) {
          await supabase.from("past_questions").insert(chunk);
        }
      }
    }
    seedDB();
  }, []);

  const { data: questions, isLoading } = useQuery({
    queryKey: ["past_questions", subject, examType, year, page],
    queryFn: async () => {
      let query = supabase.from("past_questions").select("*", { count: "exact" });
      if (subject !== "All") query = query.eq("subject", subject);
      if (examType !== "All") query = query.eq("exam_type", examType);
      if (year !== "All") query = query.eq("year", parseInt(year));

      const { data, count } = await query
        .range((page - 1) * 10, page * 10 - 1)
        .order("year", { ascending: false });

      return { data: data || [], total: count || 0 };
    },
  });

  const handleSelectOption = (qId: string, option: string) => {
    if (answeredQs[qId]) return;
    setAnsweredQs(prev => ({ ...prev, [qId]: option }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Past Questions</h1>
        <p className="text-muted-foreground text-sm">Practice authentic exam questions with explanations.</p>
      </div>

      <div className="bg-card p-3 rounded-lg border border-border space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pl-1">Exam Type</p>
            <Select value={examType} onValueChange={(v) => { setExamType(v); setPage(1); }}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Exams" />
              </SelectTrigger>
              <SelectContent>
                {EXAMS.map(e => <SelectItem key={e} value={e}>{e === "All" ? "All Exams" : e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pl-1">Subject</p>
            <Select value={subject} onValueChange={(v) => { setSubject(v); setPage(1); }}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Subjects" : s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pl-1">Year</p>
            {!profile?.is_pro ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Select value="All" disabled>
                      <SelectTrigger className="bg-background opacity-70">
                        <SelectValue placeholder="Year" />
                        <Lock className="w-3 h-3 ml-1 text-muted-foreground" />
                      </SelectTrigger>
                    </Select>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Upgrade to PRO to filter by year</TooltipContent>
              </Tooltip>
            ) : (
              <Select value={year} onValueChange={(v) => { setYear(v); setPage(1); }}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={y}>{y === "All" ? "All Years" : y}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
        ) : questions?.data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No questions found for these filters.</p>
          </div>
        ) : (
          questions?.data.map((q: any, i: number) => {
            const isAnswered = !!answeredQs[q.id];
            const isCorrect = isAnswered && answeredQs[q.id] === q.answer;

            return (
              <Card key={q.id} className="bg-card">
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <Badge variant="outline" className="bg-primary/5">{q.exam_type} {q.year}</Badge>
                    <Badge variant="secondary" className="text-xs">{q.subject}</Badge>
                  </div>

                  <p className="text-lg font-medium leading-snug">
                    <span className="text-muted-foreground mr-2 font-mono text-sm">{(page - 1) * 10 + i + 1}.</span>
                    {q.question}
                  </p>

                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {Object.entries(q.options).map(([key, value]) => {
                      const isSelected = answeredQs[q.id] === key;
                      const isActualAnswer = q.answer === key;

                      let btnClass = "h-auto py-3 px-4 justify-start text-left font-normal border ";

                      if (isAnswered) {
                        if (isActualAnswer) btnClass += "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400 ";
                        else if (isSelected) btnClass += "bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400 ";
                        else btnClass += "opacity-50 ";
                      } else {
                        btnClass += "hover:bg-accent/5 ";
                      }

                      return (
                        <Button
                          key={key}
                          variant="outline"
                          className={btnClass}
                          onClick={() => handleSelectOption(q.id, key)}
                          disabled={isAnswered}
                        >
                          <span className="w-6 font-bold mr-2 opacity-50">{key}.</span>
                          <span>{value as string}</span>
                          {isAnswered && isActualAnswer && <Check className="w-4 h-4 ml-auto text-green-500" />}
                          {isAnswered && isSelected && !isActualAnswer && <X className="w-4 h-4 ml-auto text-red-500" />}
                        </Button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-4 mt-4 border-t border-border">
                      <div className={`text-sm font-semibold mb-1 ${isCorrect ? "text-green-500" : "text-red-500"}`}>
                        {isCorrect ? "Correct!" : "Incorrect"} — Explanation:
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{q.explanation}</p>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {questions && questions.total > 10 && (
        <div className="flex justify-between items-center py-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(questions.total / 10)}</span>
          <Button variant="outline" disabled={page >= Math.ceil(questions.total / 10)} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <Card className="bg-card">
      <CardContent className="p-5 space-y-4">
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 w-full bg-muted rounded animate-pulse" />)}
        </div>
      </CardContent>
    </Card>
  );
}
