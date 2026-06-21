import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import PublicProfile from "@/pages/publicProfile";
import PublicDeck from "@/pages/publicDeck";

import Dashboard from "@/pages/dashboard";
import Decks from "@/pages/decks";
import DeckDetail from "@/pages/deckDetail";
import Study from "@/pages/study";
import Quiz from "@/pages/quiz";
import PastQuestions from "@/pages/pastQuestions";
import Mock from "@/pages/mock";
import Leaderboard from "@/pages/leaderboard";
import Profile from "@/pages/profile";
import Upgrade from "@/pages/upgrade";
import Rooms from "@/pages/rooms";
import Social from "@/pages/social";
import Marketplace from "@/pages/marketplace";
import ParentDashboard from "@/pages/parent";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Redirect to="/" />;
  }

  return (
    <AppShell>
      <Component {...rest} />
    </AppShell>
  );
}

function Router() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {session ? <Redirect to="/dashboard" /> : <Landing />}
      </Route>
      <Route path="/login">
        {session ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/signup">
        {session ? <Redirect to="/dashboard" /> : <Signup />}
      </Route>

      <Route path="/parent">
        <ParentDashboard />
      </Route>

      <Route path="/u/:code">
        <PublicProfile />
      </Route>
      <Route path="/d/:deckId">
        <PublicDeck />
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/decks">
        <ProtectedRoute component={Decks} />
      </Route>
      <Route path="/decks/:id">
        <ProtectedRoute component={DeckDetail} />
      </Route>
      <Route path="/study/:deckId">
        <ProtectedRoute component={Study} />
      </Route>
      <Route path="/quiz/:deckId">
        <ProtectedRoute component={Quiz} />
      </Route>
      <Route path="/past-questions">
        <ProtectedRoute component={PastQuestions} />
      </Route>
      <Route path="/mock">
        <ProtectedRoute component={Mock} />
      </Route>
      <Route path="/leaderboard">
        <ProtectedRoute component={Leaderboard} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/upgrade">
        <ProtectedRoute component={Upgrade} />
      </Route>
      <Route path="/rooms">
        <ProtectedRoute component={Rooms} />
      </Route>
      <Route path="/social">
        <ProtectedRoute component={Social} />
      </Route>
      <Route path="/marketplace">
        <ProtectedRoute component={Marketplace} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "hsl(224 17% 13%)",
                color: "hsl(0 0% 97%)",
                border: "1px solid hsl(224 14% 20%)",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "500",
              },
            }}
          />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
