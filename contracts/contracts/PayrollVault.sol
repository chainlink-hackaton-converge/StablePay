// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title PayrollVault
/// @notice Holds USDC deposits for employers and executes batch payroll payments
/// @dev Designed for Arc chain where USDC is the native gas token (18 decimals)
contract PayrollVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Errors ---
    error InsufficientBalance();
    error InvalidArrayLength();
    error ZeroAmount();
    error ZeroAddress();
    error UnauthorizedForwarder();
    error PayrollNotPending();
    error PayrollNotFound();

    // --- Events ---
    event Deposited(address indexed employer, uint256 amount);
    event Withdrawn(address indexed employer, uint256 amount);
    event PayrollCreated(
        uint256 indexed payrollId,
        address indexed employer,
        uint256 totalAmount,
        uint256 employeeCount
    );
    event PayrollExecuted(
        uint256 indexed payrollId,
        address indexed employer,
        uint256 totalAmount,
        uint256 timestamp
    );
    event ForwarderUpdated(address indexed oldForwarder, address indexed newForwarder);

    // --- Types ---
    enum PayrollStatus {
        Pending,
        Executed,
        Cancelled
    }

    struct PayrollRun {
        uint256 id;
        address employer;
        address[] recipients;
        uint256[] amounts;
        uint256 totalAmount;
        PayrollStatus status;
        uint256 createdAt;
        uint256 executedAt;
    }

    // --- State ---
    /// @notice USDC token contract (set to address(0) if using native USDC on Arc)
    IERC20 public immutable usdc;

    /// @notice Whether to use native currency (true on Arc where USDC is native gas)
    bool public immutable useNative;

    /// @notice Authorized CRE forwarder address
    address public creForwarder;

    /// @notice Employer vault balances
    mapping(address => uint256) public vaultBalances;

    /// @notice All payroll runs
    mapping(uint256 => PayrollRun) public payrollRuns;

    /// @notice Payroll IDs by employer
    mapping(address => uint256[]) public employerPayrolls;

    /// @notice Pending payroll IDs (for CRE to read)
    uint256[] public pendingPayrollIds;

    /// @notice Next payroll ID
    uint256 public nextPayrollId;

    // --- Modifiers ---
    modifier onlyForwarder() {
        if (msg.sender != creForwarder && msg.sender != owner()) {
            revert UnauthorizedForwarder();
        }
        _;
    }

    /// @notice Constructor
    /// @param _usdc USDC token address (address(0) for native USDC on Arc)
    /// @param _useNative Whether to use native currency transfers
    constructor(address _usdc, bool _useNative) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        useNative = _useNative;
        nextPayrollId = 1;
    }

    // --- Employer Functions ---

    /// @notice Deposit USDC into the vault
    function deposit(uint256 amount) external payable nonReentrant {
        if (amount == 0) revert ZeroAmount();

        if (useNative) {
            if (msg.value != amount) revert InsufficientBalance();
        } else {
            usdc.safeTransferFrom(msg.sender, address(this), amount);
        }

        vaultBalances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Withdraw USDC from the vault
    /// @param amount Amount to withdraw
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (vaultBalances[msg.sender] < amount) revert InsufficientBalance();

        vaultBalances[msg.sender] -= amount;

        if (useNative) {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            if (!success) revert InsufficientBalance();
        } else {
            usdc.safeTransfer(msg.sender, amount);
        }

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Create a payroll run (employer schedules payments)
    /// @param recipients Array of employee wallet addresses
    /// @param amounts Array of USDC amounts to pay each employee
    /// @return payrollId The ID of the created payroll run
    function createPayroll(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external returns (uint256 payrollId) {
        if (recipients.length == 0) revert InvalidArrayLength();
        if (recipients.length != amounts.length) revert InvalidArrayLength();

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();
            totalAmount += amounts[i];
        }

        if (vaultBalances[msg.sender] < totalAmount) revert InsufficientBalance();

        payrollId = nextPayrollId++;

        payrollRuns[payrollId] = PayrollRun({
            id: payrollId,
            employer: msg.sender,
            recipients: recipients,
            amounts: amounts,
            totalAmount: totalAmount,
            status: PayrollStatus.Pending,
            createdAt: block.timestamp,
            executedAt: 0
        });

        employerPayrolls[msg.sender].push(payrollId);
        pendingPayrollIds.push(payrollId);

        emit PayrollCreated(payrollId, msg.sender, totalAmount, recipients.length);
    }

    // --- CRE Forwarder Functions ---

    /// @notice Execute a batch payroll payment (called by CRE forwarder)
    /// @param payrollId The payroll run to execute
    function executeBatchPayroll(uint256 payrollId) external onlyForwarder nonReentrant {
        PayrollRun storage payroll = payrollRuns[payrollId];
        if (payroll.id == 0) revert PayrollNotFound();
        if (payroll.status != PayrollStatus.Pending) revert PayrollNotPending();

        address employer = payroll.employer;
        if (vaultBalances[employer] < payroll.totalAmount) revert InsufficientBalance();

        // Deduct from vault
        vaultBalances[employer] -= payroll.totalAmount;

        // Execute payments
        for (uint256 i = 0; i < payroll.recipients.length; i++) {
            if (useNative) {
                (bool success, ) = payable(payroll.recipients[i]).call{value: payroll.amounts[i]}("");
                if (!success) revert InsufficientBalance();
            } else {
                usdc.safeTransfer(payroll.recipients[i], payroll.amounts[i]);
            }
        }

        // Update status
        payroll.status = PayrollStatus.Executed;
        payroll.executedAt = block.timestamp;

        // Remove from pending
        _removePendingPayroll(payrollId);

        emit PayrollExecuted(payrollId, employer, payroll.totalAmount, block.timestamp);
    }

    // --- View Functions ---

    /// @notice Get vault balance for an employer
    /// @param employer The employer address
    /// @return balance The vault balance
    function getVaultBalance(address employer) external view returns (uint256 balance) {
        return vaultBalances[employer];
    }

    /// @notice Get all pending payroll IDs (for CRE to read)
    /// @return ids Array of pending payroll IDs
    function getPendingPayrolls() external view returns (uint256[] memory ids) {
        return pendingPayrollIds;
    }

    /// @notice Get payroll details
    /// @param payrollId The payroll ID
    function getPayrollDetails(uint256 payrollId)
        external
        view
        returns (
            address employer,
            address[] memory recipients,
            uint256[] memory amounts,
            uint256 totalAmount,
            PayrollStatus status,
            uint256 createdAt,
            uint256 executedAt
        )
    {
        PayrollRun storage payroll = payrollRuns[payrollId];
        return (
            payroll.employer,
            payroll.recipients,
            payroll.amounts,
            payroll.totalAmount,
            payroll.status,
            payroll.createdAt,
            payroll.executedAt
        );
    }

    /// @notice Get payroll IDs for an employer
    /// @param employer The employer address
    /// @return ids Array of payroll IDs
    function getEmployerPayrolls(address employer) external view returns (uint256[] memory ids) {
        return employerPayrolls[employer];
    }

    // --- Admin Functions ---

    /// @notice Update the CRE forwarder address
    /// @param _forwarder New forwarder address
    function setForwarder(address _forwarder) external onlyOwner {
        address old = creForwarder;
        creForwarder = _forwarder;
        emit ForwarderUpdated(old, _forwarder);
    }

    // --- Internal Functions ---

    function _removePendingPayroll(uint256 payrollId) internal {
        uint256 len = pendingPayrollIds.length;
        for (uint256 i = 0; i < len; i++) {
            if (pendingPayrollIds[i] == payrollId) {
                pendingPayrollIds[i] = pendingPayrollIds[len - 1];
                pendingPayrollIds.pop();
                break;
            }
        }
    }

    /// @notice Allow contract to receive native USDC
    receive() external payable {}
}
