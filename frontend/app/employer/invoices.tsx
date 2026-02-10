import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
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

function invoiceStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    pending: "outline",
    partial: "outline",
    completed: "default",
    disputed: "destructive",
  };
  return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getInvoices();
        setInvoices(data);
      } catch (err: any) {
        toast.error(err.message || "Failed to load invoices");
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
          <h2 className="text-2xl font-bold">Invoices</h2>
          <p className="text-muted-foreground">Manage B2B invoices with milestone-based escrow</p>
        </div>
        <Link to="/employer/invoices/new">
          <Button>Create Invoice</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No invoices yet. Create your first invoice to get started with B2B payments.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>Amount (USDC)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">
                      {inv.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {inv.payer_address.slice(0, 6)}...{inv.payer_address.slice(-4)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {inv.payee_address.slice(0, 6)}...{inv.payee_address.slice(-4)}
                    </TableCell>
                    <TableCell>
                      ${parseFloat(inv.total_amount_usdc).toFixed(2)}
                    </TableCell>
                    <TableCell>{invoiceStatusBadge(inv.status)}</TableCell>
                    <TableCell>
                      {new Date(inv.created_at).toLocaleDateString()}
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
