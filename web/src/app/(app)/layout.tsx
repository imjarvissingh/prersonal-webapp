"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { PageLoader } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const started = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // The server rolls everyone over at midnight; this catches up straight away
  // if the app is opened before the job has run (or the server was down).
  // Pages render after it settles so they never show yesterday's leftovers.
  useEffect(() => {
    if (user && !started.current) {
      started.current = true;
      api
        .rollover()
        .catch(() => undefined)
        .finally(() => setReady(true));
    }
  }, [user]);

  if (loading || !user || !ready) return <PageLoader />;
  return <AppShell>{children}</AppShell>;
}
