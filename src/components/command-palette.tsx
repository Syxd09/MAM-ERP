import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  FileText,
  Factory,
  Calculator,
  ClipboardList,
  Activity,
  Plus,
  Search,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Overview" },
  { to: "/customers", label: "Customers", icon: Users, hint: "Accounts" },
  { to: "/quotations", label: "Quotations", icon: FileText, hint: "Quotes" },
  { to: "/jobs", label: "Production", icon: Factory, hint: "Jobs" },
  { to: "/calculators", label: "Calculators", icon: Calculator, hint: "Costing" },
  { to: "/reports", label: "Reports", icon: ClipboardList, hint: "Analytics" },
  { to: "/activity", label: "Activity Log", icon: Activity, hint: "Audit" },
] as const;

const QUICK_ACTIONS = [
  { to: "/quotations/new", label: "Create quotation", icon: Plus },
  { to: "/jobs", label: "Create production job", icon: Plus },
  { to: "/customers", label: "Add new customer", icon: Plus },
] as const;

interface CustomerSearchResult {
  id: string;
  company_name: string;
  contact_person: string | null;
}

interface QuotationSearchResult {
  id: string;
  quotation_number: string;
  customer_name: string;
}

interface JobSearchResult {
  id: string;
  job_number: string;
  title: string;
}

function getSafeErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function CommandPalette({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
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

  const { data: searchResults, error } = useQuery({
    queryKey: ["palette-search-production-v2", query],
    enabled: open && query.length >= 2,
    queryFn: async () => {
      const s = `%${query}%`;
      const [customers, quotations, jobs] = await Promise.all([
        supabase
          .from("customers")
          .select("id,company_name,contact_person")
          .or(`company_name.ilike.${s},contact_person.ilike.${s}`)
          .limit(5),
        supabase
          .from("quotations")
          .select("id,quotation_number,customer_name")
          .or(`quotation_number.ilike.${s},customer_name.ilike.${s}`)
          .limit(5),
        supabase
          .from("jobs")
          .select("id,job_number,title")
          .or(`job_number.ilike.${s},title.ilike.${s}`)
          .limit(5),
      ]);

      if (customers.error) throw customers.error;
      if (quotations.error) throw quotations.error;
      if (jobs.error) throw jobs.error;

      return {
        customers: (customers.data as unknown as CustomerSearchResult[]) ?? [],
        quotations: (quotations.data as unknown as QuotationSearchResult[]) ?? [],
        jobs: (jobs.data as unknown as JobSearchResult[]) ?? [],
      };
    },
  });

  if (error) {
    console.error("Error fetching search results in palette:", getSafeErrorMessage(error));
  }

  function go(to: string) {
    setOpen(false);
    setQuery("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to } as any);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search quotes, jobs, customers… or jump to a page"
      />
      <CommandList className="max-h-[420px] bg-popover/90 backdrop-blur-xl">
        <CommandEmpty>No results — try a different search.</CommandEmpty>

        {searchResults && query.length >= 2 && (
          <>
            {searchResults.customers.length > 0 && (
              <CommandGroup heading="Customers">
                {searchResults.customers.map((c) => (
                  <CommandItem key={c.id} onSelect={() => go("/customers")}>
                    <Users className="size-4 mr-2 text-chart-2" />
                    <span className="font-medium text-foreground">{c.company_name}</span>
                    <span className="text-muted-foreground ml-2">· {c.contact_person || "—"}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchResults.quotations.length > 0 && (
              <CommandGroup heading="Quotations">
                {searchResults.quotations.map((q) => (
                  <CommandItem key={q.id} onSelect={() => go("/quotations")}>
                    <FileText className="size-4 mr-2 text-chart-3" />
                    <span className="font-mono text-xs text-foreground">{q.quotation_number}</span>
                    <span className="ml-2 text-muted-foreground">{q.customer_name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchResults.jobs.length > 0 && (
              <CommandGroup heading="Jobs">
                {searchResults.jobs.map((j) => (
                  <CommandItem key={j.id} onSelect={() => go("/jobs")}>
                    <Factory className="size-4 mr-2 text-warning" />
                    <span className="font-mono text-xs text-foreground">{j.job_number}</span>
                    <span className="ml-2 text-muted-foreground">{j.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator className="bg-border/60" />
          </>
        )}

        <CommandGroup heading="Navigate">
          {NAV.map((n) => (
            <CommandItem key={n.to} onSelect={() => go(n.to)} className="cursor-pointer">
              <n.icon className="size-4 mr-2 text-muted-foreground" />
              <span className="text-foreground">{n.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{n.hint}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map((a, i) => (
            <CommandItem key={i} onSelect={() => go(a.to)} className="cursor-pointer">
              <a.icon className="size-4 mr-2 text-primary" />
              <span className="text-foreground">{a.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function CommandTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative flex-1 max-w-md flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border bg-background/40 text-sm text-muted-foreground hover:bg-background/80 hover:border-primary/30 transition-all text-left cursor-pointer"
    >
      <Search className="size-4" />
      <span className="flex-1 text-xs">Search or jump to…</span>
      <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 text-[9px] font-mono leading-none">
        ⌘K
      </kbd>
    </button>
  );
}
