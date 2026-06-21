import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";

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

export default function PublicDeck() {
  const { deckId } = useParams<{ deckId: string }>();
  const [, setLocation] = useLocation();

  const { data: deck, isLoading: deckLoading } = useQuery({
    queryKey: ["public_deck", deckId],
    queryFn: async () => {
      const { data } = await supabase.from("decks").select("*").eq("id", deckId).single();
      return data;
    },
    enabled: !!deckId,
  });

  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ["public_deck_cards", deckId],
    queryFn: async () => {
      const { data } = await supabase
        .from("cards")
        .select("front, back, difficulty")
        .eq("deck_id", deckId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!deck,
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  const handleShare = () => {
    const url = window.location.href;
    const title = deck?.title || "CardStack Deck";
    const text = `Check out this "${title}" flashcard deck on CardStack — great for JAMB/WAEC/NECO prep!`;
    if (navigator.share) {
      navigator.share({ title, text, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  if (deckLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading deck...</div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold">Deck not found</h1>
        <p className="text-muted-foreground text-sm text-center">
          This deck may have been deleted or the link is invalid.
        </p>
        <Button onClick={() => setLocation("/")}>Go to CardStack</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <CardStackLogo />
        <Button size="sm" onClick={() => setLocation("/signup")}>
          Study on CardStack
        </Button>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{deck.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{deck.subject}</Badge>
                <span className="text-sm text-muted-foreground">{cards?.length || 0} cards</span>
              </div>
            </div>
            <button
              onClick={handleCopyLink}
              className="text-muted-foreground hover:text-primary transition-colors mt-1 shrink-0"
              title="Copy link"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {(deckLoading || cardsLoading) ? (
            <div className="animate-pulse text-muted-foreground text-sm text-center py-8">
              Loading cards...
            </div>
          ) : (
            <div className="space-y-3">
              {cards?.map((card: any, i: number) => (
                <Card key={i} className="bg-card">
                  <CardContent className="p-4 space-y-2">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Front</span>
                      <p className="text-sm font-medium mt-1">{card.front}</p>
                    </div>
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Back</span>
                      <p className="text-sm mt-1 text-muted-foreground">{card.back}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {cards?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                  This deck has no cards yet.
                </div>
              )}
            </div>
          )}

          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-5 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-primary mx-auto" />
              <div className="text-base font-semibold">Study this deck on CardStack</div>
              <p className="text-sm text-muted-foreground">
                Sign up free and study with spaced repetition, quizzes, and past questions for JAMB, WAEC & NECO.
              </p>
              <Button className="w-full gap-2" onClick={() => setLocation("/signup")}>
                Start studying free <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
