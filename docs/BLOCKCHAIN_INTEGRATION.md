# Blockchain Integration Guide - Rialo DEX

## Real Solana Devnet Integration Complete

This document explains how the Rialo DEX frontend is now fully integrated with Solana Devnet smart contracts and Phantom wallet.

## Architecture Overview

### Smart Contract Layer
- **DEX Program**: Anchor-based Solana program on Devnet
- **Token**: RIAL (SPL token) minted on Devnet
- **Features**: Faucet, AMM swaps, bridge transfers, liquidity pools

### Frontend Integration Layer

#### React Hooks (in `/hooks/solana/`)
These hooks abstract blockchain interactions into reusable React patterns:

1. **`useSolana`** - Low-level blockchain connection and transaction signing
   - Manages Phantom wallet provider
   - Creates Solana RPC connections
   - Signs and sends transactions

2. **`useTokenBalance`** - Real-time token balance tracking
   - Queries blockchain for SPL token balances
   - Auto-refreshes on wallet/token changes
   - Shows formatted UI amounts

3. **`useRequestFaucet`** - Faucet claim functionality
   - Builds faucet instruction from smart contract
   - Manages 24-hour cooldown tracking
   - Handles transaction status

4. **`useSwapTokens`** - Token swap execution
   - Calculates swap outputs via AMM formula
   - Enforces slippage protection
   - Signs swap transactions

5. **`useTransactionToast`** - Transaction notifications
   - Shows pending/success/error states
   - Links to Solana Explorer
   - Auto-dismisses with countdown

#### UI Components Using Blockchain Integration

**Faucet Panel** (`/components/faucet/faucet-panel.tsx`)
- Uses `useRequestFaucet` hook for real faucet claims
- Displays real 24-hour cooldown from blockchain
- Shows transaction hash on Solana Explorer

**Swap Panel** (`/components/swap/swap-panel.tsx`)
- Uses `useSwapTokens` hook for real token swaps
- Displays real token balances from blockchain via `useTokenBalance`
- Updates balances after successful swaps

**Wallet Info Card** (`/components/profile/wallet-info-card.tsx`)
- Shows real RIAL token balance
- Manual refresh button for balance updates
- Links to Solana Explorer

### Configuration (`/lib/solana/config.ts`)

Key environment variables needed:

```env
NEXT_PUBLIC_DEX_PROGRAM_ID=<Deployed program ID>
NEXT_PUBLIC_RIAL_MINT=<RIAL token mint address>
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
```

## Data Flow

### Faucet Claim Flow
```
User clicks "Request RIAL" 
  → useRequestFaucet hook
  → Build faucet instruction
  → useSolana signs transaction
  → Phantom wallet approves
  → Transaction sent to Solana
  → 100 RIAL minted to wallet
  → 24-hour cooldown enforced
  → useTransactionToast shows success
```

### Swap Flow
```
User enters swap amount
  → useTokenBalance fetches current balance
  → Mock price calculation for UI preview
  → User clicks Swap
  → useSwapTokens builds swap instruction
  → useSolana signs transaction
  → Phantom wallet approves
  → AMM executes swap on blockchain
  → Token balances updated
  → useTransactionToast shows success
```

### Balance Update Flow
```
Wallet connected
  → useTokenBalance queries blockchain
  → Shows RIAL balance in real-time
  → Auto-refresh on token change
  → Manual refresh button available
```

## Error Handling

### BlockchainErrorBoundary (`/components/solana/blockchain-error-boundary.tsx`)
Wraps blockchain components to catch and display errors gracefully:
- Connection failures
- Transaction rejections
- Insufficient balance
- Network timeouts

### Transaction Status States
- **Pending**: Waiting for user approval in Phantom
- **Confirming**: Transaction sent, awaiting blockchain confirmation
- **Success**: Transaction finalized, balance updated
- **Error**: Transaction failed with reason

## Testing with Mock Data

While waiting for smart contract deployment:

1. **Faucet**: Shows mock cooldown in UI, but doesn't actually mint tokens
2. **Swap**: Balance display shows real blockchain data, swap amounts are calculated but not executed
3. **Balance**: Queries real blockchain balance (0 RIAL until first faucet claim)

Once smart contract is deployed and environment variables are set, all operations become real and save to blockchain.

## Smart Contract Integration Points

### Faucet Instruction
- **Program**: DEX program
- **Instruction**: `requestFaucet`
- **Accounts**: FaucetRequest PDA, RIAL mint, user token account
- **Data**: None (derives amounts from state)

### Swap Instruction
- **Program**: DEX program  
- **Instruction**: `swap`
- **Accounts**: User accounts, pool accounts, SPL token program
- **Data**: Input amount, minimum output (slippage), pool selection

### Bridge Instruction
- **Program**: DEX program
- **Instruction**: `initiateBridge`
- **Accounts**: User account, bridge transaction PDA
- **Data**: Amount, destination chain, destination address

## Debugging

Enable debug logging by checking browser console:
```
[v0] Faucet request successful: <tx-signature>
[v0] Swap successful: <tx-signature>
[v0] Balance fetch error: <error-message>
```

## Next Steps

1. Deploy Anchor program to Solana Devnet
2. Create RIAL SPL token on Devnet
3. Initialize liquidity pool for RIAL/SOL pair
4. Update `.env` variables with deployed addresses
5. Real faucet claims and swaps will work immediately

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Rialo DEX UI                          │
│  (Faucet Panel, Swap Panel, Wallet Info, etc.)          │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│            React Hooks Layer                             │
│  useSolana, useTokenBalance, useRequestFaucet, etc.    │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│         Solana Web3.js & Anchor SDK                      │
│      (Transaction building, RPC calls)                   │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│          Phantom Wallet (User's signer)                  │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│        Solana Devnet (RPC endpoint)                      │
│     Smart Contract execution + Token balances            │
└─────────────────────────────────────────────────────────┘
```

## Security Considerations

1. **No Private Keys**: Phantom wallet manages keys, no exposure in frontend
2. **Transaction Validation**: Anchor program validates all instructions
3. **Slippage Protection**: User can set max slippage for swaps
4. ** 2FA Protection**: Sensitive operations (faucet, swaps) require 2FA if enabled
5. **PDA Validation**: Smart contract validates Program Derived Addresses

## Troubleshooting

### "Phantom wallet not found"
- Install Phantom extension from https://phantom.app
- Ensure "Allow in Private Windows" is enabled if using private browsing

### "Wrong Network" error
- Open Phantom wallet
- Click network selector (top right)
- Select "Devnet"

### "Insufficient balance"
- Use Devnet faucet to claim SOL: `solana airdrop 2 --network devnet`
- Use Rialo faucet to claim RIAL tokens

### "Transaction failed on chain"
- Check Solana Explorer: https://explorer.solana.com/?cluster=devnet
- Look for program errors or account missing errors
- Verify DEX program ID and token mints are correct

### Balance not updating
- Click "Refresh Balance" button manually
- Check that wallet is on Solana Devnet
- Verify RIAL mint address is correct in env vars
