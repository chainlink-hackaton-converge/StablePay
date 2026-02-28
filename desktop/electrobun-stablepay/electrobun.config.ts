import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "StablePay Desktop",
    identifier: "dev.stablepay.desktop",
    version: "0.1.0",
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    mac: {
      bundleCEF: false,
    },
    linux: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
    },
  },
} satisfies ElectrobunConfig;

