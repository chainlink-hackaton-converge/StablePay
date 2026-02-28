import { BrowserWindow } from "electrobun/bun";

const appUrl = process.env.STABLEPAY_WEB_URL ?? "http://localhost:5173";

new BrowserWindow({
  title: "StablePay Desktop MVP",
  url: appUrl,
  frame: {
    width: 1360,
    height: 860,
    x: 100,
    y: 100,
  },
});

console.log(`StablePay desktop started at ${appUrl}`);
