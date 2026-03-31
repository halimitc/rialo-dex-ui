# Rialo DEX Solana Devnet Deployment Guide

## Overview

This guide will walk you through deploying the Rialo DEX smart contracts to Solana Devnet and integrating them with your frontend.

## Prerequisites

- Node.js >= 16.0.0
- Rust >= 1.70.0
- Anchor CLI: `npm install -g @coral-xyz/anchor`
- Solana CLI: `npm install -g @solana/cli`
- A Solana wallet (Phantom recommended)

## Step 1: Setup Solana CLI

```bash
# Configure Solana CLI for Devnet
solana config set --url https://api.devnet.solana.com

# Create a keypair for deployment (if you don't have one)
solana-keygen new --outfile ~/.config/solana/id.json

# Fund your wallet with devnet SOL
solana airdrop 10 ~/.config/solana/id.json
```

## Step 2: Create RIAL Token

Before deploying the DEX, you need to create the RIAL SPL token:

```bash
# Install SPL CLI
npm install -g @solana/spl-token

# Create RIAL token (9 decimals)
spl-token create-token --decimals 6

# This will output your token mint address - save this!
# Example: RialTokenMintAddressHere

# Create a token account for yourself
spl-token create-account <YOUR_RIAL_MINT_ADDRESS>

# Mint initial supply (e.g., 1 billion RIAL)
spl-token mint <YOUR_RIAL_MINT_ADDRESS> 1000000000 <YOUR_TOKEN_ACCOUNT>
```

## Step 3: Update Program ID

1. Open `/programs/rialo_dex/src/lib.rs`
2. Replace the placeholder program ID with your actual ID:

```rust
declare_id!("YOUR_ACTUAL_PROGRAM_ID");
```

## Step 4: Build the Smart Contract

```bash
cd programs/rialo_dex

# Build the program
anchor build

# This generates IDL and type definitions
```

## Step 5: Deploy to Devnet

```bash
# From the project root
anchor deploy --provider.cluster devnet

# Save the output program ID (if different from declare_id)
```

## Step 6: Update Configuration

Update `/lib/solana/config.ts` with your deployed values:

```typescript
export const DEX_PROGRAM_ID = new PublicKey('YOUR_DEPLOYED_PROGRAM_ID');

export const TOKEN_MINTS = {
  RIAL: new PublicKey('YOUR_RIAL_MINT_ADDRESS'),
  // ... other tokens
};
```

## Step 7: Initialize DEX on Chain

Create a script to initialize the DEX:

```bash
# Create file: scripts/init-dex.ts
```

```typescript
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { createInitializeDexInstruction } from '../lib/solana';
import { IDL } from '../target/types/rialo_dex';

async function initializeDex() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const keypair = Keypair.fromSecretKey(
    Buffer.from(require(process.env.SOLANA_KEYPAIR_PATH || '~/.config/solana/id.json'))
  );
  
  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, {});
  const program = new Program(IDL, new PublicKey('YOUR_PROGRAM_ID'), provider);

  // Initialize DEX
  const tx = await program.methods
    .initializeDex(
      new BN(100_000_000), // 100 RIAL faucet amount
      new BN(86400) // 24 hour cooldown
    )
    .accounts({
      config: (await PublicKey.findProgramAddress([Buffer.from('dex_config')], program.programId))[0],
      admin: wallet.publicKey,
      rialMint: new PublicKey('YOUR_RIAL_MINT_ADDRESS'),
      feeRecipient: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log('DEX initialized:', tx);
}

initializeDex().catch(console.error);
```

Run it:
```bash
npx ts-node scripts/init-dex.ts
```

## Step 8: Create Initial Liquidity Pool (Optional)

```typescript
import { createInitializePoolInstruction } from '../lib/solana';

// Initialize a SOL/RIAL pool
const poolIx = await createInitializePoolInstruction(
  connection,
  SOL_MINT,
  RIAL_MINT,
  25 // 0.25% fee
);
```

## Step 9: Integration with Frontend

The TypeScript/JavaScript functions are ready to use. Update your components:

```typescript
// Example: Faucet component
import { Connection } from '@solana/web3.js';
import { createRequestFaucetInstruction, getFaucetStatus } from '@/lib/solana';

export async function handleFaucetClaim(userPublicKey: PublicKey) {
  const connection = new Connection(DEVNET_RPC);
  
  // Check status
  const status = await getFaucetStatus(connection, userPublicKey);
  
  if (!status.canClaimNow) {
    console.error(`Faucet on cooldown for ${status.cooldownRemaining}s`);
    return;
  }

  // Create instruction
  const instruction = await createRequestFaucetInstruction(connection, userPublicKey);
  
  // Build transaction and send
  // (handled by frontend wallet integration)
}
```

## Troubleshooting

### Account Not Found
- Make sure all PDAs are correctly derived
- Check that the account exists by: `solana account <ACCOUNT_ADDRESS> --url devnet`

### Insufficient Funds
- Airdrop more SOL: `solana airdrop 10 <WALLET_ADDRESS>`
- Check balance: `solana balance`

### Instruction Error
- Review transaction logs: `solana confirm -v <TRANSACTION_SIGNATURE>`
- Check account permissions and ownership

### Token Account Issues
- Create token accounts for pools: `spl-token create-account <MINT>`
- Use associated token addresses in your program

## Verification

Check your deployment:

```bash
# View program account
solana account <PROGRAM_ID> --url devnet

# View DEX config
solana account <DEX_CONFIG_PDA> --url devnet

# View faucet requests
solana account <FAUCET_REQUEST_PDA> --url devnet
```

## Testing Faucet

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { createRequestFaucetInstruction } from '@/lib/solana';

async function testFaucet() {
  const connection = new Connection('https://api.devnet.solana.com');
  const userKey = new PublicKey('YOUR_WALLET_ADDRESS');
  
  const instruction = await createRequestFaucetInstruction(connection, userKey);
  console.log('Faucet instruction ready');
}
```

## Testing Swap

```typescript
import { calculateSwapOutput, createSwapInstruction } from '@/lib/solana';

// Calculate output amount
const outputAmount = calculateSwapOutput(
  BigInt(100_000_000), // 100 tokens input
  BigInt(1_000_000_000), // Reserve A
  BigInt(500_000_000) // Reserve B
);

console.log('Output amount:', outputAmount.toString());

// Create swap instruction
const instruction = await createSwapInstruction(
  connection,
  userPublicKey,
  INPUT_MINT,
  OUTPUT_MINT,
  inputAmount,
  minOutputAmount,
  feeRecipient
);
```

## Testing Bridge

```typescript
import { generateNonce, createInitiateBridgeInstruction } from '@/lib/solana';

const nonce = generateNonce();
const instruction = await createInitiateBridgeInstruction(
  connection,
  userPublicKey,
  RIAL_MINT,
  BigInt(100_000_000),
  1, // ETHEREUM_GOERLI
  nonce
);
```

## Mainnet Deployment

When ready for mainnet:

1. Update RPC endpoint to mainnet
2. Change cluster config: `solana config set --url https://api.mainnet-beta.solana.com`
3. Redeploy with mainnet keypair
4. Update all mint addresses and configuration
5. Add security audits before mainnet launch

## Additional Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [SPL Token Documentation](https://spl.solana.com/token)
- [Phantom Wallet Documentation](https://docs.phantom.app/)
