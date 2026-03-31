# Rialo DEX - Setup & Deployment Scripts

Scripts untuk setup dan deploy Rialo DEX di Solana Devnet dengan mudah.

## Quick Setup (Recommended Path)

```bash
# 1. Create RIAL token
chmod +x create-rial-token.sh
./create-rial-token.sh

# 2. Copy the RIAL mint address and update /lib/solana/config.ts

# 3. Deploy smart contract
anchor deploy

# 4. Copy the program ID and update /lib/solana/config.ts

# 5. Test integration
npx ts-node test-integration.ts

# 6. Start frontend
cd ..
npm run dev
```

## Available Scripts

### `create-rial-token.sh`

Creates the RIAL SPL token on Solana Devnet with initial supply.

**Requirements:**
- Solana CLI installed
- Connected to Devnet
- Sufficient SOL balance (≥0.1 SOL)

**Usage:**
```bash
chmod +x scripts/create-rial-token.sh
./scripts/create-rial-token.sh
```

**Output:**
```
RIAL Token Mint Address: 7qf9m6B7KRZsKAJzKfZfJCjTjGtZnWTYLvkqkquaMMgd
RIAL ATA: 5yNPvwB6K7F8H9J2M4L5N6P7R8S9T0U1V2W3X4Y5Z6A
```

**Next:**
- Update `RIAL_MINT` in `/lib/solana/config.ts`

---

### `deploy-devnet.sh`

Builds and deploys the Anchor smart contract to Devnet.

**Requirements:**
- Anchor Framework installed
- Solana CLI configured for Devnet
- Sufficient SOL balance (≥1 SOL)

**Usage:**
```bash
chmod +x scripts/deploy-devnet.sh
./scripts/deploy-devnet.sh
```

**Output:**
```
Program ID: RialoNhvRjHfvEk9bxZcvejRmJjZhvhh7nJVnQ7kV5m
```

**What it does:**
1. Checks system requirements
2. Builds Anchor program with optimizations
3. Generates program keypair
4. Deploys to Devnet
5. Displays program ID

**Next:**
- Update `DEX_PROGRAM_ID` in `/lib/solana/config.ts`

---

### `setup-devnet.ts`

Node.js script to automate the entire token creation process.

**Requirements:**
- Node.js 16+
- npm dependencies installed
- Solana keypair at `~/.config/solana/id.json`
- Sufficient SOL balance

**Usage:**
```bash
# Install dependencies first
npm install @solana/web3.js @solana/spl-token

# Run setup
npx ts-node scripts/setup-devnet.ts
```

**What it does:**
1. Loads your Solana keypair
2. Creates RIAL SPL token
3. Creates associated token account
4. Mints 1,000,000 RIAL
5. Updates `/lib/solana/config.ts` automatically

**Advantages:**
- No shell script required
- Automatic config updates
- Better error messages
- Cross-platform compatible

---

### `test-integration.ts`

Comprehensive test script to verify DEX deployment and functionality.

**Requirements:**
- Node.js 16+
- RIAL token created
- Smart contract deployed
- Config.ts updated with addresses

**Usage:**
```bash
npx ts-node scripts/test-integration.ts
```

**What it tests:**
1. ✓ RIAL token exists on Devnet
2. ✓ DEX program is deployed and executable
3. ✓ Wallet has sufficient SOL balance
4. ✓ Token account can be created
5. ✓ Network connectivity
6. ✓ Solana version compatibility

**Output Example:**
```
========================================
Rialo DEX - Integration Test
========================================

Payer: 9B5X...YxfK
RIAL Mint: 7qf9m...MMgd
Program ID: RialoN...V5m

Test 1: Checking RIAL token... ✓
Test 2: Checking DEX program... ✓
Test 3: Checking wallet balance... ✓ 1.5234 SOL
Test 4: Checking RIAL token account... ✓ 1000000 RIAL
Test 5: Checking network connectivity... ✓

✓ All Tests Passed!
```

---

## Configuration File Updates

After running scripts, you need to update `/lib/solana/config.ts`:

### After `create-rial-token.sh`:
```typescript
export const RIAL_MINT = new PublicKey('7qf9m6B7KRZsKAJzKfZfJCjTjGtZnWTYLvkqkquaMMgd');
```

### After `anchor deploy`:
```typescript
export const DEX_PROGRAM_ID = new PublicKey('RialoNhvRjHfvEk9bxZcvejRmJjZhvhh7nJVnQ7kV5m');
```

### Using Environment Variables (Alternative):
```bash
# .env.local
NEXT_PUBLIC_RIAL_MINT=7qf9m6B7KRZsKAJzKfZfJCjTjGtZnWTYLvkqkquaMMgd
NEXT_PUBLIC_DEX_PROGRAM_ID=RialoNhvRjHfvEk9bxZcvejRmJjZhvhh7nJVnQ7kV5m
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
```

---

## Troubleshooting

### Issue: "Command not found: solana"
```bash
# Install Solana CLI
curl https://release.solana.com/v1.18.0/install
source $HOME/.local/share/solana/env.sh
```

### Issue: "Command not found: anchor"
```bash
# Install Anchor
npm install -g @coral-xyz/anchor-cli
```

### Issue: "Not enough balance for transaction"
```bash
# Request airdrop on Devnet
solana config set --url devnet
solana airdrop 2
```

### Issue: "Error: Account does not exist"
Make sure:
1. You're connected to **Devnet**: `solana config get`
2. Token was created: Run `create-rial-token.sh` again
3. Program was deployed: Run `deploy-devnet.sh` again

### Issue: "Invalid token mint"
Make sure the mint address in `config.ts` is correct:
```bash
# Verify token exists
spl-token supply <RIAL_MINT>
```

### Issue: "Program is not executable"
The program deployment might have failed:
```bash
# Try deploying again
anchor deploy

# Or check deployment status
solana program show <PROGRAM_ID>
```

---

## Environment Setup

### Complete Setup from Scratch

```bash
# 1. Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# 2. Install Rust (required for Anchor)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 3. Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest
avm use latest

# 4. Install Node.js dependencies
npm install
npm install -D @solana/web3.js @solana/spl-token

# 5. Create Solana wallet (if you don't have one)
solana-keygen new

# 6. Set Devnet as default
solana config set --url devnet

# 7. Request airdrop
solana airdrop 2

# 8. Run scripts
./scripts/create-rial-token.sh
anchor deploy
npx ts-node scripts/test-integration.ts
```

---

## Script Dependencies

| Script | Dependencies | Platform |
|--------|-------------|----------|
| `create-rial-token.sh` | solana-cli, spl-token-cli | Unix/Linux/Mac |
| `deploy-devnet.sh` | anchor, solana-cli | Unix/Linux/Mac |
| `setup-devnet.ts` | Node.js 16+, npm packages | All |
| `test-integration.ts` | Node.js 16+, npm packages | All |

**Pro Tip:** Use `setup-devnet.ts` and `test-integration.ts` for cross-platform compatibility.

---

## Verification Steps

After running scripts, verify everything is set up correctly:

```bash
# 1. Check Solana cluster
solana config get
# Should show: RPC URL: https://api.devnet.solana.com

# 2. Check wallet
solana address
solana balance

# 3. Verify RIAL token
spl-token supply <RIAL_MINT>

# 4. Verify DEX program
solana program show <PROGRAM_ID>

# 5. Run integration test
npx ts-node scripts/test-integration.ts
```

---

## Next Steps

1. ✅ Create RIAL token
2. ✅ Deploy DEX program
3. ✅ Test integration
4. ✅ Update config.ts
5. 🚀 Start frontend: `npm run dev`
6. 🔗 Connect Phantom wallet to Devnet
7. 💰 Test faucet, swap, and bridge

---

## Support & Documentation

- [Quick Start Guide](/docs/QUICKSTART.md)
- [Smart Contract Guide](/docs/SMART_CONTRACT_GUIDE.md)
- [Integration Examples](/docs/INTEGRATION_EXAMPLES.md)
- [Solana Docs](https://docs.solana.com/)
- [Anchor Docs](https://www.anchor-lang.com/docs/installation)
