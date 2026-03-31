## Rialo DEX - Solana Devnet Quick Start

Panduan lengkap untuk setup dan deploy Rialo DEX di Solana Devnet.

### Prerequisites

```bash
# Install Solana CLI
curl https://release.solana.com/v1.18.0/install

# Install Anchor Framework
npm install -g @coral-xyz/anchor-cli

# Install Node.js (v16+)
# Install Rust (for Anchor)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify installations
solana --version
anchor --version
rustc --version
```

### Step 1: Setup Solana Wallet

```bash
# Create a new keypair for Devnet (or use existing)
solana-keygen new

# Set Devnet as default cluster
solana config set --url devnet

# Check configuration
solana config get

# Fund your wallet (request airdrop)
solana airdrop 2
solana balance

# You should see ~2 SOL in your account
```

### Step 2: Create RIAL Token

Choose one of the following methods:

#### Option A: Using Bash Script (Recommended)

```bash
cd your-project-directory
chmod +x scripts/create-rial-token.sh
./scripts/create-rial-token.sh
```

This script will:
- Create RIAL SPL token with 6 decimals
- Create associated token account
- Mint 1,000,000 RIAL tokens
- Display your token mint address

#### Option B: Using Node.js Script

```bash
# Install dependencies
npm install @solana/web3.js @solana/spl-token

# Run setup script
npx ts-node scripts/setup-devnet.ts
```

#### Option C: Manual Creation

```bash
# Install spl-token CLI
cargo install spl-token-cli

# Create token
spl-token create-token --decimals 6

# Output example:
# Creating token 7qf9m6B7KRZsKAJzKfZfJCjTjGtZnWTYLvkqkquaMMgd

# Save this address! It's your RIAL_MINT

# Create token account
spl-token create-account <TOKEN_MINT>

# Mint tokens
spl-token mint <TOKEN_MINT> 1000000 <TOKEN_ACCOUNT>

# Verify
spl-token balance <TOKEN_MINT>
```

### Step 3: Update Configuration

After creating RIAL token, update the configuration file with your addresses:

**File: `/lib/solana/config.ts`**

```typescript
export const RIAL_MINT = new PublicKey('YOUR_RIAL_MINT_ADDRESS_HERE');
```

Or set environment variables in `.env.local`:

```env
NEXT_PUBLIC_RIAL_MINT=YOUR_RIAL_MINT_ADDRESS_HERE
NEXT_PUBLIC_DEX_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
```

### Step 4: Deploy Smart Contract

```bash
# Build the Anchor program
anchor build

# This creates the IDL and compiled binaries in target/

# Check your program ID (generated from keypair)
solana address -k target/deploy/rialo_dex-keypair.json

# Deploy to Devnet
anchor deploy

# Output will show:
# Deployed program 'rialo_dex' to [PROGRAM_ID]
```

**Save your Program ID!**

```bash
# Verify deployment
solana program show <YOUR_PROGRAM_ID>

# Should show program details including:
# - Executable: true
# - Owner: BPFLoaderUpgradeab1e11111111111111111111111
```

### Step 5: Initialize DEX

After deployment, initialize the DEX state:

```typescript
// Example using the SDK
import { initializeDex } from '@/lib/solana';
import { useWallet } from '@solana/wallet-adapter-react';

const { wallet, connection } = useWallet();

await initializeDex({
  connection,
  wallet,
  rialMint: new PublicKey('YOUR_RIAL_MINT'),
  // Config parameters
});
```

### Step 6: Update Frontend Config

Update `/lib/solana/config.ts` with deployed addresses:

```typescript
export const DEX_PROGRAM_ID = new PublicKey(
  'YOUR_DEPLOYED_PROGRAM_ID'
);

export const RIAL_MINT = new PublicKey(
  'YOUR_RIAL_MINT_ADDRESS'
);
```

### Step 7: Run Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Verification

Test the deployed system:

```bash
# 1. Check token balance
solana token-accounts YOUR_RIAL_MINT

# 2. Check program state
solana program show YOUR_PROGRAM_ID

# 3. Test faucet claim
# Use the web UI or:
# npx ts-node scripts/test-faucet.ts

# 4. Check transaction
solana confirm <TRANSACTION_SIGNATURE>
```

## Common Issues

### Issue: "Not enough balance for transaction"
```bash
solana airdrop 2
```

### Issue: "Token account not found"
```bash
# Create associated token account
spl-token create-account <TOKEN_MINT>
```

### Issue: "Program not executable"
Make sure you deployed correctly:
```bash
anchor deploy --provider.cluster devnet
```

### Issue: "Module not found errors"
```bash
# Update config.ts with correct addresses
# Restart development server
npm run dev
```

## Useful Commands

```bash
# View transactions
solana confirm <SIGNATURE>

# View account info
solana account <ACCOUNT_ADDRESS>

# View token supply
spl-token supply <TOKEN_MINT>

# View token accounts
spl-token accounts <TOKEN_MINT>

# Get recent blockheight
solana block-height

# View rent exemption amount
solana rent 0
```

## Next Steps

1. ✅ Deploy RIAL token to Devnet
2. ✅ Deploy DEX smart contract to Devnet
3. ✅ Test faucet functionality
4. ✅ Test swap functionality
5. ✅ Test bridge functionality
6. ✅ Connect to frontend via Phantom wallet
7. Deploy to production when ready

## Documentation

- [Smart Contract Guide](/docs/SMART_CONTRACT_GUIDE.md) - Architecture overview
- [Integration Examples](/docs/INTEGRATION_EXAMPLES.md) - Code examples
- [Deployment Guide](/docs/SOLANA_DEPLOYMENT.md) - Detailed deployment steps
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Web3.js API](https://solana-labs.github.io/solana-web3.js/)

## Support

- Solana Devnet Status: https://status.solana.com
- Solana Discord: https://discord.gg/solana
- Anchor Discord: https://discord.gg/cJYcSf9RS6

## Security Warnings

⚠️ **This is a testnet implementation**

For production:
- Audit the smart contracts
- Use proper key management
- Implement additional security measures
- Test extensively on testnet first
- Use production RPC providers
- Implement proper error handling
