// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title InvoiceEscrow
/// @notice Manages B2B invoice escrow with milestone-based payments
/// @dev Supports both ERC20 USDC and native USDC (Arc chain)
contract InvoiceEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Errors ---
    error ZeroAmount();
    error ZeroAddress();
    error InvalidMilestones();
    error InvoiceNotFound();
    error UnauthorizedPayer();
    error UnauthorizedPayee();
    error MilestoneAlreadyReleased();
    error MilestoneIndexOutOfBounds();
    error InvoiceNotActive();
    error InvoiceAlreadyDisputed();
    error InsufficientFunds();

    // --- Events ---
    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed payer,
        address indexed payee,
        uint256 totalAmount,
        uint256 milestoneCount
    );
    event InvoiceFunded(uint256 indexed invoiceId, uint256 amount);
    event MilestoneApproved(
        uint256 indexed invoiceId,
        uint256 indexed milestoneIndex,
        uint256 amount
    );
    event MilestoneReleased(
        uint256 indexed invoiceId,
        uint256 indexed milestoneIndex,
        uint256 amount
    );
    event InvoiceDisputed(uint256 indexed invoiceId, address indexed disputedBy);
    event InvoiceCompleted(uint256 indexed invoiceId);
    event InvoiceCancelled(uint256 indexed invoiceId);

    // --- Types ---
    enum InvoiceStatus {
        Draft,
        Funded,
        Active,
        Disputed,
        Completed,
        Cancelled
    }

    enum MilestoneStatus {
        Pending,
        Approved,
        Released
    }

    struct Milestone {
        uint256 amount;
        string description;
        MilestoneStatus status;
    }

    struct Invoice {
        uint256 id;
        address payer;
        address payee;
        uint256 totalAmount;
        uint256 releasedAmount;
        string description;
        InvoiceStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }

    // --- State ---
    IERC20 public immutable usdc;
    bool public immutable useNative;

    mapping(uint256 => Invoice) public invoices;
    mapping(uint256 => Milestone[]) public invoiceMilestones;
    mapping(address => uint256[]) public payerInvoices;
    mapping(address => uint256[]) public payeeInvoices;

    uint256 public nextInvoiceId;

    constructor(address _usdc, bool _useNative) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        useNative = _useNative;
        nextInvoiceId = 1;
    }

    // --- Invoice Lifecycle ---

    /// @notice Create a new invoice with milestones
    /// @param payer Address that will fund the invoice
    /// @param milestoneAmounts Amount for each milestone
    /// @param milestoneDescriptions Description for each milestone
    /// @param description Overall invoice description
    /// @return invoiceId The created invoice ID
    function createInvoice(
        address payer,
        uint256[] calldata milestoneAmounts,
        string[] calldata milestoneDescriptions,
        string calldata description
    ) external returns (uint256 invoiceId) {
        if (payer == address(0)) revert ZeroAddress();
        if (milestoneAmounts.length == 0) revert InvalidMilestones();
        if (milestoneAmounts.length != milestoneDescriptions.length) revert InvalidMilestones();

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            if (milestoneAmounts[i] == 0) revert ZeroAmount();
            totalAmount += milestoneAmounts[i];
        }

        invoiceId = nextInvoiceId++;

        invoices[invoiceId] = Invoice({
            id: invoiceId,
            payer: payer,
            payee: msg.sender,
            totalAmount: totalAmount,
            releasedAmount: 0,
            description: description,
            status: InvoiceStatus.Draft,
            createdAt: block.timestamp,
            completedAt: 0
        });

        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            invoiceMilestones[invoiceId].push(
                Milestone({
                    amount: milestoneAmounts[i],
                    description: milestoneDescriptions[i],
                    status: MilestoneStatus.Pending
                })
            );
        }

        payerInvoices[payer].push(invoiceId);
        payeeInvoices[msg.sender].push(invoiceId);

        emit InvoiceCreated(invoiceId, payer, msg.sender, totalAmount, milestoneAmounts.length);
    }

    /// @notice Fund an invoice (payer deposits USDC into escrow)
    /// @param invoiceId The invoice to fund
    function fundInvoice(uint256 invoiceId) external payable nonReentrant {
        Invoice storage inv = invoices[invoiceId];
        if (inv.id == 0) revert InvoiceNotFound();
        if (msg.sender != inv.payer) revert UnauthorizedPayer();
        if (inv.status != InvoiceStatus.Draft) revert InvoiceNotActive();

        uint256 amount = inv.totalAmount;

        if (useNative) {
            if (msg.value != amount) revert InsufficientFunds();
        } else {
            usdc.safeTransferFrom(msg.sender, address(this), amount);
        }

        inv.status = InvoiceStatus.Active;
        emit InvoiceFunded(invoiceId, amount);
    }

    /// @notice Approve a milestone (payer acknowledges work is done)
    /// @param invoiceId The invoice ID
    /// @param milestoneIndex The milestone index to approve
    function approveMilestone(uint256 invoiceId, uint256 milestoneIndex) external {
        Invoice storage inv = invoices[invoiceId];
        if (inv.id == 0) revert InvoiceNotFound();
        if (msg.sender != inv.payer) revert UnauthorizedPayer();
        if (inv.status != InvoiceStatus.Active) revert InvoiceNotActive();

        Milestone[] storage milestones = invoiceMilestones[invoiceId];
        if (milestoneIndex >= milestones.length) revert MilestoneIndexOutOfBounds();
        if (milestones[milestoneIndex].status != MilestoneStatus.Pending) {
            revert MilestoneAlreadyReleased();
        }

        milestones[milestoneIndex].status = MilestoneStatus.Approved;
        emit MilestoneApproved(invoiceId, milestoneIndex, milestones[milestoneIndex].amount);
    }

    /// @notice Release an approved milestone payment to the payee
    /// @param invoiceId The invoice ID
    /// @param milestoneIndex The milestone index to release
    function releaseMilestone(uint256 invoiceId, uint256 milestoneIndex) external nonReentrant {
        Invoice storage inv = invoices[invoiceId];
        if (inv.id == 0) revert InvoiceNotFound();
        if (inv.status != InvoiceStatus.Active) revert InvoiceNotActive();

        // Either payer or payee can trigger release of an approved milestone
        if (msg.sender != inv.payer && msg.sender != inv.payee) revert UnauthorizedPayer();

        Milestone[] storage milestones = invoiceMilestones[invoiceId];
        if (milestoneIndex >= milestones.length) revert MilestoneIndexOutOfBounds();
        if (milestones[milestoneIndex].status != MilestoneStatus.Approved) {
            revert MilestoneAlreadyReleased();
        }

        uint256 amount = milestones[milestoneIndex].amount;
        milestones[milestoneIndex].status = MilestoneStatus.Released;
        inv.releasedAmount += amount;

        if (useNative) {
            (bool success, ) = payable(inv.payee).call{value: amount}("");
            if (!success) revert InsufficientFunds();
        } else {
            usdc.safeTransfer(inv.payee, amount);
        }

        emit MilestoneReleased(invoiceId, milestoneIndex, amount);

        // Check if all milestones are released
        if (inv.releasedAmount == inv.totalAmount) {
            inv.status = InvoiceStatus.Completed;
            inv.completedAt = block.timestamp;
            emit InvoiceCompleted(invoiceId);
        }
    }

    /// @notice Dispute an invoice (freezes milestone releases)
    /// @param invoiceId The invoice to dispute
    function disputeInvoice(uint256 invoiceId) external {
        Invoice storage inv = invoices[invoiceId];
        if (inv.id == 0) revert InvoiceNotFound();
        if (inv.status != InvoiceStatus.Active) revert InvoiceNotActive();
        if (msg.sender != inv.payer && msg.sender != inv.payee) revert UnauthorizedPayer();

        inv.status = InvoiceStatus.Disputed;
        emit InvoiceDisputed(invoiceId, msg.sender);
    }

    // --- View Functions ---

    /// @notice Get invoice details
    function getInvoice(uint256 invoiceId)
        external
        view
        returns (Invoice memory)
    {
        return invoices[invoiceId];
    }

    /// @notice Get milestones for an invoice
    function getMilestones(uint256 invoiceId)
        external
        view
        returns (Milestone[] memory)
    {
        return invoiceMilestones[invoiceId];
    }

    /// @notice Get invoices where address is payer
    function getPayerInvoices(address payer)
        external
        view
        returns (uint256[] memory)
    {
        return payerInvoices[payer];
    }

    /// @notice Get invoices where address is payee
    function getPayeeInvoices(address payee)
        external
        view
        returns (uint256[] memory)
    {
        return payeeInvoices[payee];
    }

    /// @notice Allow contract to receive native USDC
    receive() external payable {}
}
