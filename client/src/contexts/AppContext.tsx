import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Theme = "light" | "dark";

interface PendingMutation {
  id: string;
  method: string;
  url: string;
  body: unknown;
  label: string;
  timestamp: string;
}

interface AppContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isOnline: boolean;
  pendingMutations: PendingMutation[];
  enqueueMutation: (m: Omit<PendingMutation, "id" | "timestamp">) => Promise<Response | null>;
  retryQueue: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingMutations, setPendingMutations] = useState<PendingMutation[]>([]);
  const { toast } = useToast();

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  // Online/offline tracking
  useEffect(() => {
    const onOn = () => {
      setIsOnline(true);
      setTimeout(() => retryQueue(), 200);
    };
    const onOff = () => setIsOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryQueue = useCallback(async () => {
    const queue = [...pendingMutations];
    if (!queue.length) return;
    let succeeded = 0;
    for (const m of queue) {
      try {
        await apiRequest(m.method, m.url, m.body);
        setPendingMutations((q) => q.filter((x) => x.id !== m.id));
        succeeded++;
      } catch {
        // stop on failure; will retry next online event
        break;
      }
    }
    if (succeeded) {
      queryClient.invalidateQueries();
      toast({ title: "Synced", description: `${succeeded} queued ${succeeded === 1 ? "entry" : "entries"} sent.` });
    }
  }, [pendingMutations, toast]);

  const enqueueMutation = useCallback<AppContextValue["enqueueMutation"]>(async (m) => {
    if (!navigator.onLine) {
      const pm: PendingMutation = {
        ...m,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };
      setPendingMutations((q) => [...q, pm]);
      toast({ title: "Queued offline", description: `${m.label} will sync when online.` });
      return null;
    }
    try {
      const res = await apiRequest(m.method, m.url, m.body);
      return res;
    } catch (e) {
      // network failure → queue
      const pm: PendingMutation = {
        ...m,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };
      setPendingMutations((q) => [...q, pm]);
      toast({ title: "Queued (network error)", description: `${m.label} will retry shortly.` });
      return null;
    }
  }, [toast]);

  return (
    <AppContext.Provider
      value={{ theme, toggleTheme, isOnline, pendingMutations, enqueueMutation, retryQueue }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
