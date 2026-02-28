import { useMemo, useState } from "react";
import { useAccount, useBalance, useBlockNumber, useReadContract, useSignMessage } from "wagmi";
import { formatUnits, isAddress, zeroAddress } from "viem";
import { DemoGuide } from "~/components/demo-guide";
import { QuickNavMenu } from "~/components/quick-nav-menu";
import { WalletConnect } from "~/components/wallet-connect";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { arcTestnet } from "~/lib/chains";
import { CONTRACT_ADDRESSES, PAYROLL_VAULT_ABI } from "~/lib/contracts";

const ZERO_ADDRESS = zeroAddress;

const SANDBOX_MENU_ITEMS = [
  {
    label: "Home",
    path: "/",
    description: "Return to landing and high-level product overview.",
  },
  {
    label: "Employer Dashboard",
    path: "/employer",
    description: "Open payroll, invoices, and CRE decision logs.",
  },
  {
    label: "Payroll Runs",
    path: "/employer/payroll",
    description: "Show pending payrolls and decision history.",
  },
] as const;

export default function SandboxRoute() {
  const [message, setMessage] = useState("StablePay hackathon wallet proof");
  const { address, isConnected } = useAccount();
  const { data: blockNumber, refetch: refetchBlock } = useBlockNumber({
    chainId: arcTestnet.id,
    watch: true,
  });
  const { data: walletBalance } = useBalance({
    address,
    chainId: arcTestnet.id,
    query: { enabled: Boolean(address) },
  });
  const { signMessageAsync, data: signature, isPending } = useSignMessage();

  const payrollVaultAddress = useMemo(
    () => CONTRACT_ADDRESSES.payrollVault as `0x${string}`,
    []
  );
  const hasContractAddress = payrollVaultAddress !== ZERO_ADDRESS;
  const canReadVault = Boolean(address) && hasContractAddress;

  const { data: vaultBalance, refetch: refetchVault } = useReadContract({
    abi: PAYROLL_VAULT_ABI,
    address: payrollVaultAddress,
    functionName: "getVaultBalance",
    args: [address ?? ZERO_ADDRESS],
    query: { enabled: canReadVault },
  });

  async function handleSignMessage() {
    if (!isConnected) return;
    await signMessageAsync({ message });
  }

  const shortAddress =
    address && isAddress(address)
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : "Not connected";

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-3">
          <Badge variant="secondary">Issue #8: Electrobun + viem + Rainbow Sandbox</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Web3 Sandbox</h1>
          <p className="text-muted-foreground">
            Live integration with RainbowKit wallet UX and viem/wagmi on Arc testnet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <QuickNavMenu
            title="Sandbox Navigation"
            subtitle="Fast links for your demo storyline."
            items={[...SANDBOX_MENU_ITEMS]}
          />
          <DemoGuide mode="public" />
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>1. Connect Wallet</CardTitle>
          <CardDescription>
            Connect Rainbow, MetaMask, or any WalletConnect-compatible wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <WalletConnect />
          <div className="text-sm text-muted-foreground">
            Wallet: <span className="font-mono">{shortAddress}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>2. Network State (viem)</CardTitle>
            <CardDescription>Arc testnet reads from the frontend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm text-muted-foreground">Expected Chain ID</span>
              <span className="font-mono text-sm">{arcTestnet.id}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm text-muted-foreground">Latest Block</span>
              <span className="font-mono text-sm">{blockNumber?.toString() ?? "..."}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm text-muted-foreground">Wallet Balance (USDC gas)</span>
              <span className="font-mono text-sm">
                {walletBalance
                  ? `${formatUnits(walletBalance.value, walletBalance.decimals)} ${walletBalance.symbol}`
                  : "..."}
              </span>
            </div>
            <Button variant="outline" onClick={() => refetchBlock()}>
              Refresh Block
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Message Signature</CardTitle>
            <CardDescription>
              Local cryptographic verification without exposing private keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Input
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message to sign"
              />
            </div>
            <Button onClick={handleSignMessage} disabled={!isConnected || isPending}>
              {isPending ? "Signing..." : "Sign Message"}
            </Button>
            {signature && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <p className="mb-1 text-muted-foreground">Signature:</p>
                <p className="break-all font-mono">{signature}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>4. Contract Read (PayrollVault)</CardTitle>
          <CardDescription>
            Typed viem ABI hook (`getVaultBalance`) against deployed contract state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border p-3 text-sm">
            <p className="text-muted-foreground">Configured Contract</p>
            <p className="font-mono">{payrollVaultAddress}</p>
          </div>
          {canReadVault ? (
            <div className="rounded-md border p-3 text-sm">
              <p className="text-muted-foreground">Connected employer vault balance</p>
              <p className="font-mono">
                {vaultBalance ? `${formatUnits(vaultBalance, 18)} USDC` : "No data yet"}
              </p>
            </div>
          ) : !address ? (
            <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">
              Connect a wallet to read `getVaultBalance`.
            </div>
          ) : (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              Configure `VITE_PAYROLL_VAULT_ADDRESS` in frontend env to enable contract reads.
            </div>
          )}
          <Button variant="outline" onClick={() => refetchVault()}>
            Refresh Contract Read
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

