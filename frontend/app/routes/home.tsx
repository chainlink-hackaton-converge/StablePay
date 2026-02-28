import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SP</span>
            </div>
            <span className="text-xl font-bold">StablePay</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/sandbox">
              <Button variant="outline">Web3 Sandbox</Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-24 text-center">
        <Badge variant="secondary" className="mb-4">
          Built on Arc Chain + Chainlink CRE
        </Badge>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Pay anyone, anywhere,
          <br />
          <span className="text-primary">in stablecoins</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Cross-border payroll and invoice settlement powered by Chainlink CRE
          for automated FX conversion. Private, instant, and costs less than $0.01
          per transaction.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/sandbox">
            <Button variant="outline" size="lg">
              Try Sandbox
            </Button>
          </Link>
          <Link to="/register">
            <Button size="lg">Start Paying Globally</Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">
              Employee Portal
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Automated FX Rates</CardTitle>
              <CardDescription>
                Chainlink CRE fetches live FX rates from multiple APIs with
                consensus verification. No manual rate checks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge>EUR</Badge>
                <Badge>GBP</Badge>
                <Badge>MXN</Badge>
                <Badge variant="secondary">+50 more</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Private Payments</CardTitle>
              <CardDescription>
                Arc chain's opt-in privacy keeps salary amounts confidential.
                Only authorized parties with view keys can see amounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Privacy-shielded by default
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>USDC Settlement</CardTitle>
              <CardDescription>
                All payments settle in USDC on Arc chain. Sub-second finality,
                $0.01 transaction fees, no volatile tokens needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Instant settlement
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>StablePay — Chainlink Convergence Hackathon 2026</p>
      </footer>
    </div>
  );
}
