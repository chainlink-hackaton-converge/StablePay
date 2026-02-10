import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export default function EmployeeDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Welcome to StablePay</h2>
        <p className="text-muted-foreground">
          View your payment history and receipts
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Received</CardDescription>
            <CardTitle className="text-3xl">$0.00</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">USDC</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last Payment</CardDescription>
            <CardTitle className="text-3xl">—</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">No payments yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Payment Count</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/employee/payments">
              <Button variant="link" size="sm" className="p-0">
                View all payments
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How StablePay Works</CardTitle>
          <CardDescription>Your payments are private, instant, and low-cost</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-medium">Employer Schedules Payroll</p>
              <p className="text-sm text-muted-foreground">
                Your employer creates a payroll run with your salary in your local currency.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-medium">Automated FX Conversion</p>
              <p className="text-sm text-muted-foreground">
                Chainlink CRE fetches live FX rates from multiple APIs and converts to USDC.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold">
              3
            </div>
            <div>
              <p className="font-medium">Instant USDC Payment</p>
              <p className="text-sm text-muted-foreground">
                USDC is sent directly to your wallet on Arc chain. Sub-second finality, $0.01 fees.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
