import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "~/lib/api";
import { Badge } from "~/components/ui/badge";
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

export default function EmployeePayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPayments();
        setPayments(data);
      } catch {
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
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {payment.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {parseFloat(payment.amount_local).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{payment.currency}</Badge>
                    </TableCell>
                    <TableCell>
                      {payment.amount_usdc
                        ? `$${parseFloat(payment.amount_usdc).toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.fx_rate ? parseFloat(payment.fx_rate).toFixed(4) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === "completed"
                            ? "default"
                            : payment.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {payment.status}
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
