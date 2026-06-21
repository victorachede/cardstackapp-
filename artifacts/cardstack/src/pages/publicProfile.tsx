import { supabase, getLevel } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Trophy, Crown, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

function FlameIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 2C12 2 5 9 5 14a7 7 0 0014 0C19 9 12 2 12 2Z" fill="#F97316" />
      <path d="M12 8c0 0-3 4-3 6a3 3 0 006 0C15 12 12 8 12 8Z" fill="#FED7AA" />
    </svg>
  );
}

function CardStackLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
        <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
        <path d="M8 10h10M8 16h7M8 22h10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M20 14l4 4-4 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-bold text-lg">CardStack</span>
    </div>
  );
}

export default function PublicProfile() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public_profile", code],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, exam_target, xp, streak, is_pro, referral_code, subjects")
        .eq("referral_code", code)
        .single();
      return data;
    },
    enabled: !!code,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <p className="text-muted-foreground text-sm text-center">This profile link may be invalid or expired.</p>
        <Button onClick={() => setLocation("/")}>Go to CardStack</Button>
      </div>
    );
  }

  const levelInfo = getLevel(profile.xp);
  const initials = profile.full_name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() || "ST";
  const firstName = profile.full_name?.split(" ")[0] || "They";

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <CardStackLogo />
        <Button size="sm" onClick={() => setLocation(`/signup?ref=${code}`)}>
          Join free
        </Button>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          <Card className="bg-card border-primary/10 overflow-hidden relative">
            <div className="absolute top-0 w-full h-20 bg-gradient-to-r from-primary/20 to-accent/20" />
            <CardContent className="p-6 pt-10 flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 border-4 border-background bg-background shadow-xl mb-4">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold mb-1">{profile.full_name}</h1>
              <div className="flex gap-2 flex-wrap justify-center mb-4">
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
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Level</div>
                    <div className="text-xl font-bold">{levelInfo.level}</div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">{profile.xp} XP</div>
                </div>
                <Progress value={levelInfo.progress * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-11 h-11 bg-orange-500/10 rounded-full flex items-center justify-center">
                  <FlameIcon className="w-6 h-6" />
                </div>
                <div className="text-2xl font-bold">{profile.streak}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Day Streak</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl font-bold">{profile.xp}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Total XP</div>
              </CardContent>
            </Card>
          </div>

          {profile.subjects && profile.subjects.length > 0 && (
            <Card className="bg-card">
              <CardContent className="p-5">
                <p className="text-sm font-semibold mb-3">Studying</p>
                <div className="flex flex-wrap gap-2">
                  {profile.subjects.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-5 text-center space-y-3">
              <div className="text-base font-semibold">Prep for JAMB, WAEC & NECO together</div>
              <p className="text-sm text-muted-foreground">
                {firstName} is using CardStack to ace their exams. Join them and get 7 days PRO free with their invite.
              </p>
              <Button className="w-full gap-2" onClick={() => setLocation(`/signup?ref=${code}`)}>
                <Users className="w-4 h-4" /> Join with {firstName}'s invite <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
