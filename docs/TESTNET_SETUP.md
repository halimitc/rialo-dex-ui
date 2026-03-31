# Rialo DEX - Solana Testnet Setup Guide

## Overview

Rialo DEX is now fully configured to run on **Solana Testnet** with real blockchain interactions via Phantom Wallet. This guide covers everything needed to get the DEX operational.

## Prerequisites

1. **Phantom Wallet** - Install from [phantom.app](https://phantom.app/)
2. **Solana CLI** (optional, for token creation) - [Download](https://docs.solana.com/cli/install-solana-cli-tools)
3. **Node.js 16+** - For running the frontend

## Step 1: Configure Environment Variables

Create a `.env.local` file in the project root with these variables:

```env
# Solana Testnet Configuration
NEXT_PUBLIC_SOLANA_RPC=https://api.testnet.solana.com
NEXT_PUBLIC_NETWORK=testnet

# Smart Contract IDs (update after deployment)
NEXT_PUBLIC_DEX_PROGRAM_ID=YourDeployedProgramIDHere
NEXT_PUBLIC_RIAL_MINT=YourRIALMintAddressHere
```

## Step 2: Create RIAL Token on Testnet

### Option A: Using Solana CLI

```bash
# Set to testnet
solana config set --url testnet

# Get testnet SOL (for fees)
solana airdrop 2

# Create SPL token
spl-token create-token

# Create token account and mint
spl-token create-account <TOKEN_MINT>
spl-token mint <TOKEN_MINT> 1000000 <YOUR_ACCOUNT>
```

### Option B: Using Online Tools

1. Visit [Solana Token Creator](https://www.solflare.com/tokens)
2. Connect Phantom Wallet set to Testnet
3. Create RIAL token with these specs:
   - Name: "Rialo Token"
   - Symbol: "RIAL"
   - Decimals: 6
   - Initial Supply: 1,000,000

## Step 3: Deploy Smart Contract (if using custom contracts)

```bash
# Configure for testnet
solana config set --url testnet

# Build Anchor program
anchor build

# Deploy
anchor deploy

# Note the program ID and update .env.local
```

## Step 4: Run the Frontend

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start using the DEX!

## Features

### Swap (RIAL ↔ USDC)

1. Connect Phantom Wallet to Solana Testnet
2. Enter amount to swap
3. Review price impact and slippage
4. Confirm transaction in Phantom
5. View transaction on [Solscan Testnet](https://solscan.io/?cluster=testnet)

### Faucet

1. Connect wallet
2. Click "Request RIAL Tokens"
3. Receive 100 RIAL per request
4. Cooldown: 24 hours per wallet

### Bridge

1. Select source network (Solana Testnet)
2. Select destination network (Ethereum Sepolia, Polygon Mumbai)
3. Enter amount and token
4. Confirm in Phantom
5. Track bridge status on Solscan

### Markets

- View real-time RIAL price and volume
- Monitor wallet balance
- Auto-refresh every 5 seconds

## Testnet Faucets

Get free testnet tokens:

- **SOL**: `solana airdrop 2` (CLI) or [Solana Faucet](https://faucet.solana.com)
- **USDC-Dev**: [Token Faucet](https://spl-token-faucet.com)
- **RIAL**: Built-in faucet in the DEX

## Explorer Links

- **Solscan Testnet**: https://solscan.io/?cluster=testnet
- **Devnet (if needed)**: https://solscan.io/?cluster=devnet

## Troubleshooting

### Phantom Not Connecting

- Ensure Phantom is set to "Testnet" (not Mainnet/Devnet)
- Check browser console for errors
- Try disconnecting and reconnecting

### Transaction Failed

- Check wallet has enough SOL for gas fees (~0.00025 SOL)
- Verify token mints are correct in config
- Check program has valid liquidity pools initialized

### Wrong Network Warning

- Open Phantom settings
- Switch from Devnet/Mainnet to **Testnet**
- Refresh the page

### Token Balance Not Showing

- Ensure Phantom is connected
- Check token mint address is correct
- Token account may need to be created first

## Configuration Reference

```typescript
// Current config in lib/solana/config.ts
export const TESTNET_RPC = 'https://api.testnet.solana.com'
export const NETWORK = 'testnet'
export const RIAL_MINT = new PublicKey('...')
export const DEX_PROGRAM_ID = new PublicKey('...')

// Available functions
getSolscanUrl(txHash)        // Generate Solscan link
getSolscanAddressUrl(address) // View address on Solscan
```

## Next Steps

1. Deploy smart contracts to Testnet
2. Initialize liquidity pools in the contracts
3. Update `.env.local` with deployed addresses
4. Test all features with real testnet SOL
5. Deploy to production mainnet

## Support

For issues or questions:
- Check Solana docs: https://docs.solana.com
- Phantom support: https://help.phantom.app
- Solscan: https://solscan.io
