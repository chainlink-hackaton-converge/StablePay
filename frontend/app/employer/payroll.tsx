import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/lib/api";
import { toast } from "sonner";

type PayrollDecision = {
  id: string;
  payroll_id: string;
  decision: "accepted" | "blocked";
  reason: string;
  spread_bps?: number | null;
  max_deviation_bps?: number | null;
  consensus_rate?: number | null;
  quote_currency?: string | null;
  decided_at: string;
};

function statusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    executing: "outline",
    completed: "default",
    failed: "destructive",
  };
  return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
}

export default function Payroll() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [decisionsByPayroll, setDecisionsByPayroll] = useState<
    Record<string, PayrollDecision[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPayrolls();
        setPayrolls(data);

        const decisionEntries = await Promise.all(
          data.map(async (payroll: any) => {
            try {
              const decisions = await api.getPayrollDecisions(payroll.id);
              return [payroll.id, decisions as PayrollDecision[]] as const;
            } catch {
              return [payroll.id, [] as PayrollDecision[]] as const;
            }
          })
        );

        setDecisionsByPayroll(Object.fromEntries(decisionEntries));
      } catch (err: any) {
        toast.error(err.message || "Failed to load payrolls");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payroll Runs</h2>
          <p className="text-muted-foreground">
            Schedule payroll batches and track CRE risk decisions per run.
          </p>
        </div>
        <Link to="/employer/payroll/new">
          <Button>Create Payroll</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {payrolls.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No payrolls yet. Create your first payroll run to pay your team.</p>
              <Link to="/employer/payroll/new" className="mt-2 inline-block">
                <Button variant="outline" size="sm">
                  Create Payroll
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payroll ID</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Total USDC</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CRE Decision</TableHead>
                  <TableHead>CRE Reason</TableHead>
                  <TableHead>Executed</TableHead>
                  <TableHead>TX Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((payroll) => {
                  const latestDecision = decisionsByPayroll[payroll.id]?.[0];

                  return (
                    <TableRow key={payroll.id}>
                      <TableCell className="font-mono text-sm">{payroll.id.slice(0, 8)}...</TableCell>
                      <TableCell>{new Date(payroll.scheduled_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {payroll.total_amount_usdc
                          ? `$${parseFloat(payroll.total_amount_usdc).toFixed(2)}`
                          : "--"}
                      </TableCell>
                      <TableCell>{statusBadge(payroll.status)}</TableCell>
                      <TableCell>
                        {latestDecision ? (
                          <Badge
                            variant={latestDecision.decision === "accepted" ? "default" : "destructive"}
                          >
                            {latestDecision.decision}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">none</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-xs text-muted-foreground">
                        {latestDecision?.reason || "--"}
                      </TableCell>
                      <TableCell>
                        {payroll.executed_at
                          ? new Date(payroll.executed_at).toLocaleDateString()
                          : "--"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {payroll.tx_hash ? `${payroll.tx_hash.slice(0, 10)}...` : "--"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CRE Decision Log</CardTitle>
          <CardDescription>
            Decision history by payroll from POST /api/payrolls/{"{id}"}/decision.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {payrolls.every((payroll) => (decisionsByPayroll[payroll.id] || []).length === 0) ? (
            <p className="text-sm text-muted-foreground">
              No CRE decisions recorded yet. Trigger the workflow and refresh this page.
            </p>
          ) : (
            payrolls
              .filter((payroll) => (decisionsByPayroll[payroll.id] || []).length > 0)
              .map((payroll) => (
                <div key={`decision-log-${payroll.id}`} className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Payroll {payroll.id.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payroll.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {decisionsByPayroll[payroll.id].slice(0, 5).map((decision) => (
                      <div
                        key={decision.id}
                        className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm"
                      >
                        <Badge
                          variant={decision.decision === "accepted" ? "default" : "destructive"}
                        >
                          {decision.decision}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          spread {decision.spread_bps ?? "--"} bps
                        </span>
                        <span className="text-muted-foreground">{decision.reason}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {new Date(decision.decided_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
