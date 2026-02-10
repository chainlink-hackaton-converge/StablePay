import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/lib/api";

export default function EmployerDashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [emps, pays] = await Promise.all([
          api.getEmployees().catch(() => []),
          api.getPayrolls().catch(() => []),
        ]);
        setEmployees(emps);
        setPayrolls(pays);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pendingPayrolls = payrolls.filter((p) => p.status === "pending");
  const completedPayrolls = payrolls.filter((p) => p.status === "completed");
  const totalPaid = completedPayrolls.reduce(
    (sum, p) => sum + parseFloat(p.total_amount_usdc || "0"),
    0
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Employees</CardDescription>
            <CardTitle className="text-3xl">{employees.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/employer/employees" className="text-sm text-primary hover:underline">
              Manage employees
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Payrolls</CardDescription>
            <CardTitle className="text-3xl">{pendingPayrolls.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={pendingPayrolls.length > 0 ? "default" : "secondary"}>
              {pendingPayrolls.length > 0 ? "Action needed" : "All clear"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed Payrolls</CardDescription>
            <CardTitle className="text-3xl">{completedPayrolls.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/employer/payroll" className="text-sm text-primary hover:underline">
              View history
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid (USDC)</CardDescription>
            <CardTitle className="text-3xl">
              ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">All-time payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Link to="/employer/employees">
            <Button variant="outline">Add Employee</Button>
          </Link>
          <Link to="/employer/payroll/new">
            <Button>Create Payroll</Button>
          </Link>
          <Link to="/employer/invoices/new">
            <Button variant="outline">Create Invoice</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Payrolls */}
      {payrolls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Payrolls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payrolls.slice(0, 5).map((payroll) => (
                <div
                  key={payroll.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Payroll #{payroll.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Scheduled: {new Date(payroll.scheduled_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {payroll.total_amount_usdc && (
                      <span className="text-sm font-medium">
                        ${parseFloat(payroll.total_amount_usdc).toFixed(2)} USDC
                      </span>
                    )}
                    <Badge
                      variant={
                        payroll.status === "completed"
                          ? "default"
                          : payroll.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {payroll.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
