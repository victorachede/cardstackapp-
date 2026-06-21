import { useAuth } from "@/contexts/AuthContext";
import { supabase, Subject } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Plus, Layers, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "react-hot-toast";

const SUBJECTS: Subject[] = ["English", "Maths", "Biology", "Chemistry", "Physics", "Government", "Literature", "Economics", "Geography", "CRS"];

export default function Decks() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<Subject | "">("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: decks, isLoading } = useQuery({
    queryKey: ["decks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("decks")
        .select("*, cards(count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const createDeck = useMutation({
    mutationFn: async () => {
      if (!user || !title || !subject) throw new Error("Missing fields");
      const { data, error } = await supabase.from("decks").insert({
        user_id: user.id,
        title,
        subject: subject as Subject,
        is_public: false,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks", user?.id] });
      setIsOpen(false);
      setTitle("");
      setSubject("");
      toast.success("Deck created!");
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const atLimit = !profile?.is_pro && (decks?.length || 0) >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your Decks</h1>
        {atLimit ? (
          <Button variant="outline" className="border-primary text-primary" onClick={() => setLocation("/upgrade")} data-testid="button-upgrade-decks">
            <Lock className="w-4 h-4 mr-2" /> Upgrade to PRO
          </Button>
        ) : (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-deck">
                <Plus className="w-4 h-4 mr-2" /> New Deck
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Deck</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Biology Cell Structure" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={subject} onValueChange={(v) => setSubject(v as Subject)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => createDeck.mutate()} disabled={createDeck.isPending || !title || !subject} className="w-full">
                  Create Deck
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : decks?.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-primary/30 rounded-2xl bg-primary/5 space-y-5"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-10 h-10 text-primary" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-accent flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-accent-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight">Your first deck is one tap away</h3>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              Create a deck and start crushing your exams. Use spaced repetition to remember everything.
            </p>
          </div>

          {!atLimit && (
            <Button
              size="lg"
              className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20"
              onClick={() => setIsOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" /> Create Deck
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decks?.map((deck: any) => (
            <Link key={deck.id} href={`/decks/${deck.id}`}>
              <a className="block group">
                <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-1 bg-card">
                  <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{deck.subject}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(deck.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{deck.title}</h3>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Layers className="w-4 h-4 mr-2" />
                      {deck.cards[0]?.count || 0} cards
                    </div>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}
