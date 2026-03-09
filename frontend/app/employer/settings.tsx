import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";
import { api } from "~/lib/api";

export default function Settings() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [vaultAddress, setVaultAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getCompanies();
        setCompanies(data);
        if (data.length > 0) {
          setCompanyName(data[0].name);
          setVaultAddress(data[0].vault_address || "");
        }
      } catch (err: any) {
        // Company may not exist yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (companies.length > 0) {
        await api.updateCompany(companies[0].id, {
          name: companyName,
          vault_address: vaultAddress || null,
        });
        toast.success("Company updated!");
      } else {
        const storedUserRaw = localStorage.getItem("stablepay_user");
        const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
        if (!storedUser?.wallet_address) {
          throw new Error("Session wallet address is missing. Please sign in again.");
        }

        const company = await api.createCompany({
          name: companyName,
          vault_address: vaultAddress || undefined,
        });
        const refreshedSession = await api.login(storedUser.wallet_address);
        localStorage.setItem("stablepay_token", refreshedSession.token);
        localStorage.setItem("stablepay_user", JSON.stringify(refreshedSession.user));
        setCompanies([company]);
        toast.success("Company created and session refreshed!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage your company and vault configuration</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              {companies.length > 0
                ? "Update your company details"
                : "Set up your company to start using StablePay"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vault">PayrollVault Contract Address</Label>
              <Input
                id="vault"
                value={vaultAddress}
                onChange={(e) => setVaultAddress(e.target.value)}
                placeholder="0x... (deployed PayrollVault address)"
              />
              <p className="text-xs text-muted-foreground">
                Deploy the PayrollVault contract on Arc testnet and paste the address here
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving
            ? "Saving..."
            : companies.length > 0
            ? "Update Company"
            : "Create Company"}
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Arc Testnet Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">RPC URL</span>
            <span className="font-mono">https://rpc.testnet.arc.network</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Chain ID</span>
            <span className="font-mono">5042002</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Explorer</span>
            <a
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-mono"
            >
              testnet.arcscan.app
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Faucet</span>
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              faucet.circle.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
