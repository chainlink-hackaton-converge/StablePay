import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "~/lib/api";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

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
      } catch {
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
      setSelectedIds(new Set(employees.map((employee) => employee.id)));
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
    .filter((employee) => selectedIds.has(employee.id))
    .reduce((sum, employee) => sum + parseFloat(employee.salary_amount), 0);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Create Payroll</h2>
        <p className="text-muted-foreground">Select employees and schedule a batch payment</p>
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
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading employees...</p>
            ) : employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No employees found. Add employees first.
              </p>
            ) : (
              employees.map((employee) => (
                <div
                  key={employee.id}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    selectedIds.has(employee.id) ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => toggleEmployee(employee.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                          selectedIds.has(employee.id)
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {selectedIds.has(employee.id) && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{employee.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {employee.wallet_address.slice(0, 10)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {parseFloat(employee.salary_amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {employee.salary_currency}
                      </Badge>
                    </div>
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
                  USDC amounts will be calculated at execution using live FX rates via Chainlink
                  CRE
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
