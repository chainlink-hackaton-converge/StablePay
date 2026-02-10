import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";
import { api } from "~/lib/api";

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    payer_address: "",
    payee_address: "",
    total_amount_usdc: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createInvoice({
        payer_address: formData.payer_address,
        payee_address: formData.payee_address,
        total_amount_usdc: parseFloat(formData.total_amount_usdc),
        description: formData.description || undefined,
      });
      toast.success("Invoice created successfully!");
      navigate("/employer/invoices");
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Create Invoice</h2>
        <p className="text-muted-foreground">
          Create a B2B invoice with escrow-backed payment
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payer">Payer Wallet Address</Label>
              <Input
                id="payer"
                value={formData.payer_address}
                onChange={(e) =>
                  setFormData({ ...formData, payer_address: e.target.value })
                }
                placeholder="0x..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payee">Payee Wallet Address</Label>
              <Input
                id="payee"
                value={formData.payee_address}
                onChange={(e) =>
                  setFormData({ ...formData, payee_address: e.target.value })
                }
                placeholder="0x..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USDC)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.total_amount_usdc}
                onChange={(e) =>
                  setFormData({ ...formData, total_amount_usdc: e.target.value })
                }
                placeholder="10000.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Invoice for consulting services Q1 2026..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Invoice"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
