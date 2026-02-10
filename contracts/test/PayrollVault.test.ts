import { expect } from "chai";
import { ethers } from "hardhat";
import { PayrollVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PayrollVault", function () {
  let vault: PayrollVault;
  let owner: SignerWithAddress;
  let employer: SignerWithAddress;
  let employee1: SignerWithAddress;
  let employee2: SignerWithAddress;
  let forwarder: SignerWithAddress;

  beforeEach(async function () {
    [owner, employer, employee1, employee2, forwarder] = await ethers.getSigners();

    const PayrollVault = await ethers.getContractFactory("PayrollVault");
    // Deploy with native USDC mode (Arc chain style)
    vault = await PayrollVault.deploy(ethers.ZeroAddress, true);
    await vault.waitForDeployment();

    // Set CRE forwarder
    await vault.setForwarder(forwarder.address);
  });

  describe("Deposits", function () {
    it("should accept native USDC deposits", async function () {
      const amount = ethers.parseEther("1000");
      await vault.connect(employer).deposit(amount, { value: amount });

      expect(await vault.getVaultBalance(employer.address)).to.equal(amount);
    });

    it("should emit Deposited event", async function () {
      const amount = ethers.parseEther("500");
      await expect(vault.connect(employer).deposit(amount, { value: amount }))
        .to.emit(vault, "Deposited")
        .withArgs(employer.address, amount);
    });

    it("should revert on zero amount", async function () {
      await expect(vault.connect(employer).deposit(0))
        .to.be.revertedWithCustomError(vault, "ZeroAmount");
    });
  });

  describe("Withdrawals", function () {
    it("should allow withdrawal of deposited funds", async function () {
      const amount = ethers.parseEther("1000");
      await vault.connect(employer).deposit(amount, { value: amount });
      await vault.connect(employer).withdraw(amount);

      expect(await vault.getVaultBalance(employer.address)).to.equal(0);
    });

    it("should revert when insufficient balance", async function () {
      await expect(vault.connect(employer).withdraw(ethers.parseEther("100")))
        .to.be.revertedWithCustomError(vault, "InsufficientBalance");
    });
  });

  describe("Payroll Creation", function () {
    it("should create a payroll run", async function () {
      const deposit = ethers.parseEther("1000");
      await vault.connect(employer).deposit(deposit, { value: deposit });

      const recipients = [employee1.address, employee2.address];
      const amounts = [ethers.parseEther("300"), ethers.parseEther("400")];

      await expect(vault.connect(employer).createPayroll(recipients, amounts))
        .to.emit(vault, "PayrollCreated");

      const pending = await vault.getPendingPayrolls();
      expect(pending.length).to.equal(1);
    });

    it("should revert if vault balance insufficient", async function () {
      const recipients = [employee1.address];
      const amounts = [ethers.parseEther("1000")];

      await expect(vault.connect(employer).createPayroll(recipients, amounts))
        .to.be.revertedWithCustomError(vault, "InsufficientBalance");
    });
  });

  describe("Payroll Execution", function () {
    it("should execute batch payroll via forwarder", async function () {
      const deposit = ethers.parseEther("1000");
      await vault.connect(employer).deposit(deposit, { value: deposit });

      const recipients = [employee1.address, employee2.address];
      const amounts = [ethers.parseEther("300"), ethers.parseEther("400")];

      await vault.connect(employer).createPayroll(recipients, amounts);

      const balanceBefore1 = await ethers.provider.getBalance(employee1.address);
      const balanceBefore2 = await ethers.provider.getBalance(employee2.address);

      await expect(vault.connect(forwarder).executeBatchPayroll(1))
        .to.emit(vault, "PayrollExecuted");

      const balanceAfter1 = await ethers.provider.getBalance(employee1.address);
      const balanceAfter2 = await ethers.provider.getBalance(employee2.address);

      expect(balanceAfter1 - balanceBefore1).to.equal(ethers.parseEther("300"));
      expect(balanceAfter2 - balanceBefore2).to.equal(ethers.parseEther("400"));

      // Vault balance should be reduced
      expect(await vault.getVaultBalance(employer.address)).to.equal(ethers.parseEther("300"));

      // No more pending payrolls
      const pending = await vault.getPendingPayrolls();
      expect(pending.length).to.equal(0);
    });

    it("should revert if called by non-forwarder", async function () {
      const deposit = ethers.parseEther("1000");
      await vault.connect(employer).deposit(deposit, { value: deposit });

      const recipients = [employee1.address];
      const amounts = [ethers.parseEther("300")];
      await vault.connect(employer).createPayroll(recipients, amounts);

      await expect(vault.connect(employer).executeBatchPayroll(1))
        .to.be.revertedWithCustomError(vault, "UnauthorizedForwarder");
    });
  });
});
