import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { api } from "~/lib/api";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPayrolls();
        setPayrolls(data);
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
          <p className="text-muted-foreground">Schedule and manage batch payroll payments</p>
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
                  <TableHead>Executed</TableHead>
                  <TableHead>TX Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-mono text-sm">
                      {payroll.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{new Date(payroll.scheduled_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {payroll.total_amount_usdc
                        ? `$${parseFloat(payroll.total_amount_usdc).toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell>{statusBadge(payroll.status)}</TableCell>
                    <TableCell>
                      {payroll.executed_at
                        ? new Date(payroll.executed_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {payroll.tx_hash ? `${payroll.tx_hash.slice(0, 10)}...` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
