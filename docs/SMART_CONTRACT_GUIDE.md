# Rialo DEX Smart Contract Architecture

## Overview

The Rialo DEX is built with Anchor, a Rust framework for Solana smart contracts. It provides a complete decentralized exchange with faucet, swap, and bridge functionality.

## Program Structure

```
programs/rialo_dex/
├── src/
│   ├── lib.rs              # Main program entry point
│   ├── errors.rs           # Custom error types
│   ├── state.rs            # Account state structures
│   └── instructions/
│       ├── mod.rs          # Module exports
│       ├── initialize.rs    # Initialize DEX
│       ├── faucet.rs        # Faucet functionality
│       ├── swap.rs          # Token swap logic
│       ├── bridge.rs        # Cross-chain bridge
│       └── liquidity.rs     # Liquidity pool management
└── Cargo.toml             # Dependencies
```

## Account Structures

### DexConfig
Global configuration account for the DEX.

```rust
pub struct DexConfig {
    pub admin: Pubkey,              // Admin wallet
    pub rial_mint: Pubkey,          // RIAL token mint
    pub fee_recipient: Pubkey,      // Fee receiving wallet
    pub faucet_amount: u64,         // Amount per faucet claim
    pub faucet_cooldown: i64,       // Cooldown in seconds
    pub bump: u8,                   // PDA bump seed
}
```

**PDA Seed**: `["dex_config"]`

### FaucetRequest
Tracks faucet claims per user to enforce cooldown.

```rust
pub struct FaucetRequest {
    pub user: Pubkey,               // User wallet
    pub last_claim_time: i64,       // Last claim timestamp
    pub total_claimed: u64,         // Total RIAL claimed
    pub bump: u8,                   // PDA bump seed
}
```

**PDA Seed**: `["faucet_request", user_pubkey]`

### LiquidityPool
Manages AMM liquidity and reserves.

```rust
pub struct LiquidityPool {
    pub mint_a: Pubkey,             // First token mint
    pub mint_b: Pubkey,             // Second token mint
    pub vault_a: Pubkey,            // Vault for token A
    pub vault_b: Pubkey,            // Vault for token B
    pub lp_mint: Pubkey,            // LP token mint
    pub reserve_a: u64,             // Token A reserves
    pub reserve_b: u64,             // Token B reserves
    pub lp_supply: u64,             // LP token supply
    pub fee_bps: u16,               // Fee in basis points
    pub authority: Pubkey,          // Pool authority
    pub bump: u8,                   // PDA bump seed
}
```

**PDA Seed**: `["pool", mint_a_pubkey, mint_b_pubkey]`

### BridgeTransaction
Tracks cross-chain bridge transfers.

```rust
pub struct BridgeTransaction {
    pub source_chain: ChainType,    // Source blockchain
    pub dest_chain: ChainType,      // Destination blockchain
    pub user: Pubkey,               // User wallet
    pub token_mint: Pubkey,         // Token being bridged
    pub amount: u64,                // Amount being bridged
    pub nonce: u64,                 // Unique transaction ID
    pub status: BridgeStatus,       // Transfer status
    pub created_at: i64,            // Creation timestamp
    pub processed_at: i64,          // Processing timestamp
    pub bump: u8,                   // PDA bump seed
}
```

**PDA Seed**: `["bridge_tx", user_pubkey, nonce_bytes]`

## Instructions

### 1. Initialize DEX

Initializes the DEX configuration and sets up parameters.

```rust
pub fn initialize_dex(
    ctx: Context<InitializeDex>,
    faucet_amount: u64,
    faucet_cooldown: i64,
) -> Result<()>
```

**Accounts**:
- `config` - DEX config account (PDA, writable)
- `admin` - Admin wallet (signer, writable)
- `rial_mint` - RIAL token mint
- `fee_recipient` - Fee recipient wallet
- `system_program` - System program
- `token_program` - SPL Token program

### 2. Request Faucet

Users claim free RIAL tokens with cooldown protection.

```rust
pub fn request_faucet(ctx: Context<RequestFaucet>) -> Result<()>
```

**Accounts**:
- `config` - DEX config (PDA)
- `faucet_request` - User's faucet request state (PDA)
- `faucet_vault` - Vault holding faucet RIAL
- `user_token_account` - User's RIAL token account
- `user` - User wallet (signer)
- `token_program` - SPL Token program

**Emits**: `FaucetClaimed` event

**Security**:
- Checks cooldown expiration
- Validates user account initialization
- Uses CPI to transfer tokens securely

### 3. Swap Tokens

Execute AMM swap with constant product formula.

```rust
pub fn swap(
    ctx: Context<Swap>,
    input_amount: u64,
    min_output_amount: u64,
) -> Result<()>
```

**Formula**: `output = (reserve_b * input * (10000 - fee)) / (10000 * (reserve_a + input))`

**Accounts**:
- `pool` - Liquidity pool (PDA)
- `vault_a` - Pool's token A vault
- `vault_b` - Pool's token B vault
- `user_input_account` - User's input token account
- `user_output_account` - User's output token account
- `fee_recipient_account` - Fee recipient's account
- `user` - User wallet (signer)
- `token_program` - SPL Token program

**Emits**: `SwapExecuted` event

**Security**:
- Slippage protection via `min_output_amount`
- Checked arithmetic to prevent overflow
- Fee calculation and deduction
- PDA authority validation for vault transfers

### 4. Initiate Bridge

Start a cross-chain token transfer.

```rust
pub fn initiate_bridge(
    ctx: Context<InitiateBridge>,
    dest_chain: ChainType,
    amount: u64,
    nonce: u64,
) -> Result<()>
```

**Chains**: Ethereum Goerli, Polygon Mumbai

**Process**:
1. Validates destination chain
2. Burns tokens from user's account
3. Records bridge transaction state

**Accounts**:
- `config` - DEX config (PDA)
- `bridge_tx` - Bridge transaction record (PDA)
- `user_token_account` - User's token account (writable)
- `user` - User wallet (signer)
- `token_program` - SPL Token program

**Emits**: `BridgeInitiated` event

### 5. Complete Bridge

Mark bridge transaction as completed (oracle-triggered).

```rust
pub fn complete_bridge(ctx: Context<CompleteBridge>) -> Result<()>
```

**Accounts**:
- `bridge_tx` - Bridge transaction record (PDA)
- `program` - DEX program

**Emits**: `BridgeCompleted` event

### 6. Initialize Pool

Create a new liquidity pool pair.

```rust
pub fn initialize_pool(
    ctx: Context<InitializePool>,
    fee_bps: u16,
) -> Result<()>
```

**Accounts**:
- `pool` - Pool account (PDA)
- `mint_a` - First token mint
- `mint_b` - Second token mint
- `vault_a` - Vault for token A
- `vault_b` - Vault for token B
- `lp_mint` - LP token mint
- `authority` - Pool authority (signer)

### 7. Add Liquidity

Deposit tokens and receive LP tokens.

```rust
pub fn add_liquidity(
    ctx: Context<AddLiquidity>,
    amount_a: u64,
    amount_b: u64,
    min_lp_tokens: u64,
) -> Result<()>
```

**LP Calculation**:
- First deposit: `sqrt(amount_a * amount_b)`
- Subsequent: `min(lp_from_a, lp_from_b)`

**Emits**: `LiquidityAdded` event

## Events

### FaucetClaimed
```rust
pub struct FaucetClaimed {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
```

### SwapExecuted
```rust
pub struct SwapExecuted {
    pub user: Pubkey,
    pub input_amount: u64,
    pub output_amount: u64,
    pub fee_amount: u64,
}
```

### BridgeInitiated
```rust
pub struct BridgeInitiated {
    pub user: Pubkey,
    pub source_chain: ChainType,
    pub dest_chain: ChainType,
    pub amount: u64,
    pub nonce: u64,
    pub timestamp: i64,
}
```

### BridgeCompleted
```rust
pub struct BridgeCompleted {
    pub user: Pubkey,
    pub nonce: u64,
    pub timestamp: i64,
}
```

### LiquidityAdded
```rust
pub struct LiquidityAdded {
    pub user: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub lp_tokens: u64,
}
```

## Security Considerations

### Checked Arithmetic
All arithmetic operations use checked versions to prevent overflow/underflow:
- `checked_add()`, `checked_sub()`, `checked_mul()`, `checked_div()`
- Returns `MathOverflow` error on overflow

### PDA Validation
All PDAs are derived and validated to ensure proper authorization:
- Config PDA: `["dex_config"]`
- Faucet PDA: `["faucet_request", user_pubkey]`
- Pool PDA: `["pool", mint_a, mint_b]`
- Bridge PDA: `["bridge_tx", user_pubkey, nonce]`

### CPI Security
All token transfers use Solana Program Invocation (CPI):
- Proper signer derivation for PDAs
- Token program validation
- Account ownership checks

### Cooldown Protection
Faucet requests include timestamp validation:
- Prevents rapid multiple claims
- Configurable cooldown period (default 24 hours)
- Last claim time stored per user

### Slippage Protection
Swap instruction enforces minimum output:
- User specifies `min_output_amount`
- Transaction fails if output below minimum
- Protects against price manipulation

## Error Handling

```rust
pub enum DexError {
    InsufficientBalance,         // Caller doesn't have enough tokens
    SlippageExceeded,           // Output below minimum
    InvalidPoolState,           // Pool not properly initialized
    FaucetCooldownActive,       // Faucet cooldown not expired
    InsufficientLiquidity,      // Not enough reserves for swap
    InvalidAmount,              // Zero or invalid amount
    BridgeTimeout,              // Bridge request expired
    BridgeAlreadyProcessed,     // Bridge already completed
    InvalidBridgeDestination,   // Unsupported chain
    MathOverflow,               // Arithmetic overflow
    InvalidAuthority,           // Unauthorized signer
}
```

## Gas Optimization

1. **PDA Derivation**: Cached where possible
2. **Checked Math**: Minimal overhead compared to unchecked
3. **Event Logging**: Used for indexing instead of storing all data
4. **Account Reuse**: Vaults reused across operations

## Testing

Run tests with:
```bash
anchor test
```

Test coverage includes:
- Faucet claim with cooldown
- Swap with slippage protection
- Pool initialization and liquidity provision
- Bridge initiation and completion
- Error conditions and edge cases

## Upgradability

The program uses Anchor's default upgrade authority. To upgrade:

```bash
anchor upgrade --provider.cluster devnet --program-id <PROGRAM_ID>
```

Ensure backward compatibility when upgrading account structures.
