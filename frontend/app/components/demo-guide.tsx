import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

type GuideMode = "public" | "employer" | "employee";

type GuideStep = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaPath?: string;
};

const GUIDE_STEPS: Record<GuideMode, GuideStep[]> = {
  public: [
    {
      title: "Connect a wallet in Sandbox",
      description:
        "Open the Web3 Sandbox to prove wallet connection, signature, and Arc network reads.",
      ctaLabel: "Open Sandbox",
      ctaPath: "/sandbox",
    },
    {
      title: "Create an employer account",
      description:
        "Register as an employer to unlock payroll, invoices, and CRE decision logs.",
      ctaLabel: "Register",
      ctaPath: "/register",
    },
    {
      title: "Run payroll and show decisions",
      description:
        "Use Payroll pages to show pending runs and explain how CRE stores accepted/blocked decisions.",
      ctaLabel: "Go to Employer",
      ctaPath: "/employer",
    },
  ],
  employer: [
    {
      title: "Set up employees",
      description:
        "Add employees and salary/currency values before creating payroll runs.",
      ctaLabel: "Open Employees",
      ctaPath: "/employer/employees",
    },
    {
      title: "Create a payroll run",
      description:
        "Create at least one pending payroll so CRE can evaluate FX consensus and risk thresholds.",
      ctaLabel: "Create Payroll",
      ctaPath: "/employer/payroll/new",
    },
    {
      title: "Show CRE decision logs",
      description:
        "Open Payroll Runs and present accepted/blocked decisions with reason and consensus stats.",
      ctaLabel: "Open Payroll Runs",
      ctaPath: "/employer/payroll",
    },
  ],
  employee: [
    {
      title: "Open payment history",
      description:
        "Review payment entries and explain privacy-preserving payroll execution.",
      ctaLabel: "Open Payments",
      ctaPath: "/employee/payments",
    },
    {
      title: "Verify wallet context",
      description:
        "Use wallet connect in the top bar to demonstrate account ownership and signing flow.",
      ctaLabel: "Open Sandbox",
      ctaPath: "/sandbox",
    },
  ],
};

export function DemoGuide({
  mode,
  autoOpen = false,
}: {
  mode: GuideMode;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const storageKey = `stablepay_guide_seen_${mode}`;
  const steps = useMemo(() => GUIDE_STEPS[mode], [mode]);
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!autoOpen) return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setOpen(true);
      localStorage.setItem(storageKey, "true");
    }
  }, [autoOpen, storageKey]);

  function nextStep() {
    if (isLastStep) {
      setOpen(false);
      return;
    }
    setStepIndex((prev) => prev + 1);
  }

  function prevStep() {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Demo Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2">
            <Badge variant="secondary">
              Step {stepIndex + 1} of {steps.length}
            </Badge>
          </div>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={prevStep}
              disabled={stepIndex === 0}
            >
              Back
            </Button>
            <Button type="button" onClick={nextStep}>
              {isLastStep ? "Finish" : "Next"}
            </Button>
          </div>
          {step.ctaLabel && step.ctaPath ? (
            <Link to={step.ctaPath}>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                {step.ctaLabel}
              </Button>
            </Link>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

