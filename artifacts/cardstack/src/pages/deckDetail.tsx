import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useParams, Link, useLocation } from "wouter";
import { Plus, BrainCircuit, Play, Trash2, Edit2, Lock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function DeckDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: deck, isLoading: deckLoading } = useQuery({
    queryKey: ["deck", id],
    queryFn: async () => {
      const { data } = await supabase.from("decks").select("*").eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ["cards", id],
    queryFn: async () => {
      const { data } = await supabase.from("cards").select("*").eq("deck_id", id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const addCard = useMutation({
    mutationFn: async () => {
      if (!front || !back) throw new Error("Missing fields");
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("cards").insert({
        deck_id: id,
        front,
        back,
        difficulty: "medium",
        next_review_date: today,
        interval: 1,
        ease_factor: 2.5
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", id] });
      setIsOpen(false);
      setFront("");
      setBack("");
      toast.success("Card added!");
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteCard = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.from("cards").delete().eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", id] });
      toast.success("Card deleted");
    }
  });

  const atLimit = !profile?.is_pro && (cards?.length || 0) >= 50;

  const handleShareDeck = () => {
    const link = `${window.location.origin}/d/${deck.id}`;
    const title = deck.title;
    const text = `Check out this "${title}" flashcard deck on CardStack — great for JAMB/WAEC/NECO prep! 📚`;
    if (navigator.share) {
      navigator.share({ title, text, url: link });
    } else {
      navigator.clipboard.writeText(link);
      toast.success("Deck link copied!");
    }
  };

  if (deckLoading) return <div className="p-8 text-center animate-pulse">Loading deck...</div>;
  if (!deck) return <div className="p-8 text-center">Deck not found</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{deck.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{deck.subject}</Badge>
            <span className="text-sm text-muted-foreground">{cards?.length || 0} cards</span>
          </div>
        </div>
        
        <div className="flex gap-2 w-full">
          <Button className="flex-1" onClick={() => setLocation(`/study/${deck.id}`)} disabled={!cards?.length} data-testid="button-study-deck">
            <Play className="w-4 h-4 mr-2" /> Study
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setLocation(`/quiz/${deck.id}`)} disabled={!cards?.length} data-testid="button-quiz-deck">
            <BrainCircuit className="w-4 h-4 mr-2" /> Quiz
          </Button>
          <Button variant="outline" size="icon" onClick={handleShareDeck} title="Share deck" data-testid="button-share-deck">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <h2 className="text-xl font-semibold">Cards</h2>
        {atLimit ? (
          <Button variant="outline" className="border-primary text-primary" onClick={() => setLocation("/upgrade")} data-testid="button-upgrade-cards">
            <Lock className="w-4 h-4 mr-2" /> PRO Limit Reached
          </Button>
        ) : (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-card">
                <Plus className="w-4 h-4 mr-2" /> Add Card
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Flashcard</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="front">Front (Question)</Label>
                  <Textarea id="front" value={front} onChange={(e) => setFront(e.target.value)} rows={3} placeholder="Enter the question or concept..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="back">Back (Answer)</Label>
                  <Textarea id="back" value={back} onChange={(e) => setBack(e.target.value)} rows={3} placeholder="Enter the answer or definition..." />
                </div>
                <Button onClick={() => addCard.mutate()} disabled={addCard.isPending || !front || !back} className="w-full">
                  Save Card
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {cards?.map((card: any) => (
          <Card key={card.id} className="bg-card group">
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Front</span>
                    <p className="text-sm font-medium mt-1">{card.front}</p>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Back</span>
                    <p className="text-sm mt-1 text-muted-foreground">{card.back}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className={
                    card.difficulty === 'easy' ? 'text-green-500 border-green-500/20' : 
                    card.difficulty === 'medium' ? 'text-yellow-500 border-yellow-500/20' : 
                    'text-red-500 border-red-500/20'
                  }>
                    {card.difficulty}
                  </Badge>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete card?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteCard.mutate(card.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {cards?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
            No cards in this deck yet. Add some to get started!
          </div>
        )}
      </div>
    </motion.div>
  );
}
