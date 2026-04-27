import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import DailyLog from "@/pages/DailyLog";
import Herd from "@/pages/Herd";
import Pipeline from "@/pages/Pipeline";
import Feed from "@/pages/Feed";
import Medical from "@/pages/Medical";
import Mortality from "@/pages/Mortality";
import Census from "@/pages/Census";
import Settings from "@/pages/Settings";
import Reports from "@/pages/Reports";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/log" component={DailyLog} />
      <Route path="/herd" component={Herd} />
      <Route path="/herd/:id" component={Herd} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/pipeline/:id" component={Pipeline} />
      <Route path="/feed" component={Feed} />
      <Route path="/medical" component={Medical} />
      <Route path="/mortality" component={Mortality} />
      <Route path="/census" component={Census} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppShell>
            <AppRouter />
          </AppShell>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
