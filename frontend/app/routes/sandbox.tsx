import { useMemo, useState } from "react";
import { useAccount, useBalance, useBlockNumber, useReadContract, useSignMessage } from "wagmi";
import { formatUnits, isAddress, zeroAddress } from "viem";
import { WalletConnect } from "~/components/wallet-connect";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { arcTestnet } from "~/lib/chains";
import { CONTRACT_ADDRESSES, PAYROLL_VAULT_ABI } from "~/lib/contracts";

const ZERO_ADDRESS = zeroAddress;

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
  const canReadVault = Boolean(address) && payrollVaultAddress !== ZERO_ADDRESS;

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
      <div className="space-y-3">
        <Badge variant="secondary">Issue #8: electrobun + viem + rainbow sandbox</Badge>
        <h1 className="text-3xl font-bold tracking-tight">Web3 Sandbox</h1>
        <p className="text-muted-foreground">
          Prueba de integracion con RainbowKit (wallet UX) y viem/wagmi sobre Arc testnet.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>1. Conectar Wallet</CardTitle>
          <CardDescription>
            Usa Rainbow, MetaMask u otra wallet compatible via WalletConnect.
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
            <CardTitle>2. Estado de red (viem)</CardTitle>
            <CardDescription>Lecturas en Arc testnet desde el frontend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm text-muted-foreground">Chain ID esperado</span>
              <span className="font-mono text-sm">{arcTestnet.id}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm text-muted-foreground">Ultimo bloque</span>
              <span className="font-mono text-sm">{blockNumber?.toString() ?? "..."}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm text-muted-foreground">Balance wallet (USDC gas)</span>
              <span className="font-mono text-sm">
                {walletBalance
                  ? `${formatUnits(walletBalance.value, walletBalance.decimals)} ${walletBalance.symbol}`
                  : "..."}
              </span>
            </div>
            <Button variant="outline" onClick={() => refetchBlock()}>
              Refrescar bloque
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Firma de mensaje</CardTitle>
            <CardDescription>
              Verificacion criptografica local sin exponer la llave privada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="message">Mensaje</Label>
              <Input
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Mensaje para firmar"
              />
            </div>
            <Button onClick={handleSignMessage} disabled={!isConnected || isPending}>
              {isPending ? "Firmando..." : "Firmar mensaje"}
            </Button>
            {signature && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <p className="mb-1 text-muted-foreground">Firma:</p>
                <p className="break-all font-mono">{signature}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>4. Lectura de contrato (PayrollVault)</CardTitle>
          <CardDescription>
            Hook tipado con viem ABI (`getVaultBalance`) desde el contrato principal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border p-3 text-sm">
            <p className="text-muted-foreground">Contrato configurado</p>
            <p className="font-mono">{payrollVaultAddress}</p>
          </div>
          {canReadVault ? (
            <div className="rounded-md border p-3 text-sm">
              <p className="text-muted-foreground">Balance vault del empleador conectado</p>
              <p className="font-mono">
                {vaultBalance ? `${formatUnits(vaultBalance, 18)} USDC` : "Sin datos aun"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              Define `PAYROLL_VAULT_ADDRESS` real en frontend para habilitar lectura de contrato.
            </div>
          )}
          <Button variant="outline" onClick={() => refetchVault()}>
            Refrescar lectura de contrato
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

