import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", network.name);

  // On Arc testnet, USDC is the native gas token
  // Deploy with native mode = true, usdc address = zero address
  const useNative = true;
  const usdcAddress = ethers.ZeroAddress;

  // Deploy PayrollVault
  console.log("\nDeploying PayrollVault...");
  const PayrollVault = await ethers.getContractFactory("PayrollVault");
  const vault = await PayrollVault.deploy(usdcAddress, useNative);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("PayrollVault deployed to:", vaultAddress);

  // Deploy InvoiceEscrow
  console.log("\nDeploying InvoiceEscrow...");
  const InvoiceEscrow = await ethers.getContractFactory("InvoiceEscrow");
  const escrow = await InvoiceEscrow.deploy(usdcAddress, useNative);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("InvoiceEscrow deployed to:", escrowAddress);

  console.log("\n--- Deployment Summary ---");
  console.log("PayrollVault:", vaultAddress);
  console.log("InvoiceEscrow:", escrowAddress);
  console.log("\nUpdate your .env file:");
  console.log(`PAYROLL_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`INVOICE_ESCROW_ADDRESS=${escrowAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
