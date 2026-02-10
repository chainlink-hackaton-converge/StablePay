import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { api } from "~/lib/api";

export default function PayrollCreate() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getEmployees();
        setEmployees(data);
      } catch (err: any) {
        toast.error("Failed to load employees");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleEmployee(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function selectAll() {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map((e) => e.id)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) {
      toast.error("Select at least one employee");
      return;
    }
    if (!scheduledAt) {
      toast.error("Set a schedule date");
      return;
    }

    setSubmitting(true);
    try {
      await api.createPayroll({
        scheduled_at: new Date(scheduledAt).toISOString().replace("Z", ""),
        employee_ids: Array.from(selectedIds),
      });
      toast.success("Payroll created successfully!");
      navigate("/employer/payroll");
    } catch (err: any) {
      toast.error(err.message || "Failed to create payroll");
    } finally {
      setSubmitting(false);
    }
  }

  const totalLocal = employees
    .filter((e) => selectedIds.has(e.id))
    .reduce((sum, e) => sum + parseFloat(e.salary_amount), 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Create Payroll</h2>
        <p className="text-muted-foreground">
          Select employees and schedule a batch payment
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Employees</CardTitle>
                <CardDescription>
                  {selectedIds.size} of {employees.length} selected
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                {selectedIds.size === employees.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No employees found. Add employees first.
              </p>
            ) : (
              employees.map((emp) => (
                <div
                  key={emp.id}
                  className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedIds.has(emp.id) ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => toggleEmployee(emp.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                        selectedIds.has(emp.id)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {selectedIds.has(emp.id) && (
                        <span className="text-xs text-primary-foreground">✓</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{emp.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {emp.wallet_address.slice(0, 10)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {parseFloat(emp.salary_amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {emp.salary_currency}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled">Execution Date</Label>
              <Input
                id="scheduled"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total (local currencies)</p>
                <p className="text-2xl font-bold">
                  {totalLocal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  USDC amounts will be calculated at execution using live FX rates via Chainlink CRE
                </p>
              </div>
              <Button type="submit" size="lg" disabled={submitting || selectedIds.size === 0}>
                {submitting ? "Creating..." : "Create Payroll"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
