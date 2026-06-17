import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({ meta: [{ title: "Activity Log — MAM ERP" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const [entityType, setEntityType] = useState<string>("all");
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="size-7 text-primary" /> Activity Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Complete audit trail of every change across the ERP.</p>
        </div>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="quotation">Quotations</SelectItem>
            <SelectItem value="job">Jobs</SelectItem>
            <SelectItem value="follow_up">Follow-ups</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="panel p-5">
        <ActivityTimeline entityType={entityType === "all" ? undefined : entityType} limit={200} />
      </div>
    </div>
  );
}
