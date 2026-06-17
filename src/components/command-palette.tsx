import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { LayoutDashboard, UserPlus, Users, FileText, Factory, Calculator, ClipboardList, Bell, Activity, Plus, Search } from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Overview" },
  { to: "/leads", label: "Leads / CRM", icon: UserPlus, hint: "Pipeline" },
  { to: "/follow-ups", label: "Follow-ups", icon: Bell, hint: "Tasks" },
  { to: "/customers", label: "Customers", icon: Users, hint: "Accounts" },
  { to: "/quotations", label: "Quotations", icon: FileText, hint: "Quotes" },
  { to: "/jobs", label: "Production", icon: Factory, hint: "Jobs" },
  { to: "/calculators", label: "Calculators", icon: Calculator, hint: "Costing" },
  { to: "/reports", label: "Reports", icon: ClipboardList, hint: "Analytics" },
  { to: "/activity", label: "Activity Log", icon: Activity, hint: "Audit" },
] as const;

const QUICK_ACTIONS = [
  { to: "/leads", label: "Add new lead", icon: Plus },
  { to: "/quotations/new", label: "Create quotation", icon: Plus },
  { to: "/jobs", label: "Create production job", icon: Plus },
] as const;

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const { data: searchResults } = useQuery({
    queryKey: ["palette-search", query],
    enabled: open && query.length >= 2,
    queryFn: async () => {
      const s = `%${query}%`;
      const [leads, customers, quotations, jobs] = await Promise.all([
        supabase.from("leads").select("id,lead_code,name,company").or(`name.ilike.${s},company.ilike.${s},lead_code.ilike.${s},phone.ilike.${s}`).limit(5),
        supabase.from("customers").select("id,company_name,contact_person").or(`company_name.ilike.${s},contact_person.ilike.${s}`).limit(5),
        supabase.from("quotations").select("id,quotation_number,customer_name").or(`quotation_number.ilike.${s},customer_name.ilike.${s}`).limit(5),
        supabase.from("jobs").select("id,job_number,title").or(`job_number.ilike.${s},title.ilike.${s}`).limit(5),
      ]);
      return {
        leads: leads.data ?? [], customers: customers.data ?? [],
        quotations: quotations.data ?? [], jobs: jobs.data ?? [],
      };
    },
  });

  function go(to: string, params?: Record<string, string>) {
    setOpen(false);
    setQuery("");
    navigate({ to, params } as any);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search leads, quotes, jobs… or jump to a page" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results — try a different search.</CommandEmpty>

        {searchResults && query.length >= 2 && (
          <>
            {searchResults.leads.length > 0 && (
              <CommandGroup heading="Leads">
                {searchResults.leads.map((l: any) => (
                  <CommandItem key={l.id} onSelect={() => go("/leads/$id", { id: l.id })}>
                    <UserPlus className="size-4 mr-2 text-primary" />
                    <span className="font-medium">{l.name}</span>
                    <span className="text-muted-foreground ml-2">· {l.company || "—"}</span>
                    <span className="ml-auto text-xs font-mono text-muted-foreground">{l.lead_code}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchResults.customers.length > 0 && (
              <CommandGroup heading="Customers">
                {searchResults.customers.map((c: any) => (
                  <CommandItem key={c.id} onSelect={() => go("/customers")}>
                    <Users className="size-4 mr-2 text-chart-2" />
                    <span className="font-medium">{c.company_name}</span>
                    <span className="text-muted-foreground ml-2">· {c.contact_person || "—"}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchResults.quotations.length > 0 && (
              <CommandGroup heading="Quotations">
                {searchResults.quotations.map((q: any) => (
                  <CommandItem key={q.id} onSelect={() => go("/quotations")}>
                    <FileText className="size-4 mr-2 text-chart-3" />
                    <span className="font-mono text-xs">{q.quotation_number}</span>
                    <span className="ml-2">{q.customer_name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchResults.jobs.length > 0 && (
              <CommandGroup heading="Jobs">
                {searchResults.jobs.map((j: any) => (
                  <CommandItem key={j.id} onSelect={() => go("/jobs")}>
                    <Factory className="size-4 mr-2 text-warning" />
                    <span className="font-mono text-xs">{j.job_number}</span>
                    <span className="ml-2">{j.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigate">
          {NAV.map((n) => (
            <CommandItem key={n.to} onSelect={() => go(n.to)}>
              <n.icon className="size-4 mr-2 text-muted-foreground" />
              <span>{n.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{n.hint}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map((a, i) => (
            <CommandItem key={i} onSelect={() => go(a.to)}>
              <a.icon className="size-4 mr-2 text-primary" />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function CommandTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="relative flex-1 max-w-md flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background/60 text-sm text-muted-foreground hover:bg-background/80 hover:border-primary/40 transition-colors text-left">
      <Search className="size-4" />
      <span className="flex-1">Search or jump to…</span>
      <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono">
        ⌘K
      </kbd>
    </button>
  );
}
