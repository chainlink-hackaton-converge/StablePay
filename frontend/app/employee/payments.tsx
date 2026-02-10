import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "~/lib/api";

export default function EmployeePayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // In a real app, we'd filter by the current employee's ID
        const data = await api.getPayments();
        setPayments(data);
      } catch (err: any) {
        // May fail if no company is associated
        toast.error("Could not load payments");
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
      <div>
        <h2 className="text-2xl font-bold">Payment History</h2>
        <p className="text-muted-foreground">
          View all payments you've received through StablePay
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No payments received yet. Your employer will set up payroll soon.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Local Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>USDC Amount</TableHead>
                  <TableHead>FX Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">
                      {p.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {parseFloat(p.amount_local).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.currency}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.amount_usdc
                        ? `$${parseFloat(p.amount_usdc).toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {p.fx_rate
                        ? parseFloat(p.fx_rate).toFixed(4)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "completed"
                            ? "default"
                            : p.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {p.status}
                      </Badge>
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
