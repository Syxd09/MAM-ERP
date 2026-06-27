import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  FileText,
  Factory,
  Calculator,
  ClipboardList,
  LogOut,
  Settings,
  Activity,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CommandPalette, CommandTrigger } from "@/components/command-palette";
import { NotificationsBell } from "@/components/notifications-bell";
import { PageTransition } from "@/components/page-transition";
import { QuickDock } from "@/components/quick-dock";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/quotations", label: "Quotations", icon: FileText },
  { to: "/jobs", label: "Production", icon: Factory },
  { to: "/calculators", label: "Calculators", icon: Calculator },
  { to: "/reports", label: "Reports", icon: ClipboardList },
  { to: "/activity", label: "Activity Log", icon: Activity },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,email,avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const mappedRoles = roles?.map((r) => r.role) ?? [];
      if (user.email === "syxdmatheen.9@gmail.com" && !mappedRoles.includes("admin")) {
        mappedRoles.push("admin");
      }
      return { user, profile: prof, roles: mappedRoles };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.profile?.full_name || profile?.user?.email || "U")
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex w-full bg-background font-sans">
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
      <QuickDock />

      {/* Docked Sidebar Navigation (Solid border, flat design, sharp corners) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar sticky top-0 h-screen shrink-0">
        <div className="h-16 flex items-center gap-3 px-4 border-b border-border">
          <div className="size-8 rounded-sm bg-primary flex items-center justify-center">
            <Factory className="size-4.5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-foreground text-sm tracking-tight">
              MAM Industries
            </div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">
              ERP Console
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item, i) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.01, duration: 0.15, ease: "easeOut" }}
              >
                <Link
                  to={item.to}
                  preload="intent"
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-medium transition-all duration-150 border border-transparent",
                    active
                      ? "bg-white/[0.04] text-foreground border-white/[0.05]"
                      : "text-muted-foreground hover:bg-white/[0.02] hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      className="absolute left-0 top-1 bottom-1 w-[3px] bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-150",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  {item.label}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border text-[9px] text-muted-foreground uppercase tracking-widest font-mono flex items-center justify-between">
          <span>v2.0 · Carbon ERP</span>
          <span className="size-1.5 rounded-full bg-success" />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 shadow-sm">
          <CommandTrigger onClick={() => setPaletteOpen(true)} />
          <div className="flex-1" />
          <NotificationsBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-2.5 h-10 px-2.5 rounded-sm border border-transparent hover:border-border hover:bg-white/[0.02] cursor-pointer"
              >
                <span className="size-7.5 rounded-sm bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {initials}
                </span>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-xs font-medium text-foreground">
                    {profile?.profile?.full_name || profile?.user?.email}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono mt-0.5">
                    {profile?.roles?.[0] || "user"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 mt-1.5 border border-border bg-card rounded-md shadow-lg"
            >
              <DropdownMenuLabel className="font-normal px-3.5 py-3">
                <span className="text-xs text-muted-foreground font-mono">Signed in as</span>
                <div className="text-sm font-semibold text-foreground truncate mt-0.5">
                  {profile?.user?.email}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer rounded-sm py-2 px-3 text-xs">
                <User className="size-4 mr-2 text-muted-foreground" />
                Profile Details
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer rounded-sm py-2 px-3 text-xs">
                <Settings className="size-4 mr-2 text-muted-foreground" />
                Console Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive cursor-pointer rounded-sm py-2 px-3 text-xs"
              >
                <LogOut className="size-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Mobile Horizontal Navigation Scroll */}
        <div className="md:hidden overflow-x-auto border-b border-border bg-sidebar">
          <div className="flex gap-1.5 p-2 min-w-max">
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  preload="intent"
                  className={cn(
                    "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium border transition-all duration-150",
                    active
                      ? "bg-white/[0.04] text-foreground border-white/[0.05]"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-white/[0.01]",
                  )}
                >
                  <Icon className="size-3.5" /> {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden bg-background">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
