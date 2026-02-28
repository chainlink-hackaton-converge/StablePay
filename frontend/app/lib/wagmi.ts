import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./chains";
import { appEnv } from "./env";

export const wagmiConfig = getDefaultConfig({
  appName: "StablePay",
  projectId: appEnv.walletConnectProjectId,
  chains: [arcTestnet],
  ssr: true,
});
