import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletConnect() {
  return <ConnectButton chainStatus="icon" accountStatus="address" />;
}

