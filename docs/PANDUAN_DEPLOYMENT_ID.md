# Panduan Deployment Rialo DEX ke Solana Devnet

Panduan lengkap dalam bahasa Indonesia untuk deployment smart contracts dan token testnet RIAL.

## 📋 Daftar Isi

1. [Requirements](#requirements)
2. [Setup Awal](#setup-awal)
3. [Membuat Token RIAL](#membuat-token-rial)
4. [Deploy Smart Contract](#deploy-smart-contract)
5. [Testing & Verification](#testing--verification)
6. [Troubleshooting](#troubleshooting)

## 📦 Requirements

Pastikan yang berikut sudah ter-install:

- **Solana CLI** - Command line tool untuk Solana
- **Anchor Framework** - Framework untuk Solana smart contracts
- **Node.js 16+** - Runtime JavaScript
- **Rust** - Required untuk Anchor
- **Git** - Untuk clone repository

### Instalasi Tools

#### 1. Solana CLI

**macOS/Linux:**
```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# Verify
source $HOME/.local/share/solana/env.sh
solana --version
# Output: solana-cli 1.18.0 (src:14c3f58e; feat:4200000000)
```

**Windows:**
1. Download dari: https://github.com/solana-labs/solana/releases
2. Jalankan installer
3. Restart terminal

**Verify installation:**
```bash
solana --version
solana config get
```

#### 2. Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify
rustc --version
cargo --version
```

#### 3. Anchor Framework

```bash
# Install avm (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm --locked

# Install Anchor
avm install latest
avm use latest

# Verify
anchor --version
```

#### 4. Node.js

Download dari: https://nodejs.org/ (LTS recommended)

```bash
# Verify
node --version  # Should be v16+
npm --version
```

## 🔑 Setup Awal

### Step 1: Buat Solana Wallet

Jika belum punya:

```bash
solana-keygen new

# Output:
# Wrote new keypair to /Users/you/.config/solana/id.json
# pubkey: 9B5XcvejRmJjZhvhh7nJVnQ7kV5mAbcDefGhijk12345
# Save this seed phrase somewhere secure!
```

Simpan seed phrase di tempat yang aman!

### Step 2: Set Devnet sebagai Default

```bash
solana config set --url devnet

# Verify
solana config get
# RPC URL: https://api.devnet.solana.com
```

### Step 3: Request Airdrop (Testnet SOL)

```bash
solana airdrop 2

# Check balance
solana balance

# Output: 2 SOL
```

Jika airdrop gagal, coba beberapa kali dengan jeda 5 menit.

### Step 4: Clone Repository & Install Dependencies

```bash
# Clone repo (atau copy files)
cd your-project-directory

# Install npm dependencies
npm install

# Install Solana npm packages
npm install @solana/web3.js @solana/spl-token
```

## 💰 Membuat Token RIAL

Sekarang kita buat token SPL bernama RIAL di Devnet.

### Opsi A: Automated Setup (Direkomendasikan)

Paling mudah dan cepat:

```bash
npm run setup:devnet
```

Script ini akan:
1. ✅ Membuat token RIAL
2. ✅ Create associated token account
3. ✅ Mint 1,000,000 RIAL tokens
4. ✅ Update config.ts otomatis

Output:
```
========================================
Rialo DEX - Devnet Setup
========================================

Payer: 9B5X...YxfK
Creating RIAL token...
✓ RIAL Mint: 7qf9m6B7KRZsKAJzKfZfJCjTjGtZnWTYLvkqkquaMMgd

Creating token account...
✓ Token Account: 5yNPvwB6K7F8H9J2M4L5N6P7R8S9T0U1V2W3X4Y5Z6A

Minting initial supply...
✓ Minted 1,000,000 RIAL tokens

✓ Setup Complete!
Token Configuration:
  Mint Address: 7qf9m6B7KRZsKAJzKfZfJCjTjGtZnWTYLvkqkquaMMgd
  Initial Supply: 1,000,000 RIAL
```

### Opsi B: Bash Script

Jika Anda familiar dengan shell script:

```bash
chmod +x scripts/create-rial-token.sh
./scripts/create-rial-token.sh
```

Ikuti instruksi di output. Catat mint address Anda.

### Opsi C: Manual dengan CLI

Jika ingin kontrol penuh:

```bash
# Install spl-token CLI
cargo install spl-token-cli

# Create token dengan 6 decimals
spl-token create-token --decimals 6

# Output:
# Creating token 7qf9m6B7KRZsKAJzKfZfJCjTjGtZnWTYLvkqkquaMMgd
# Initialized mint 7qf9m6B7KRZsKAJzKfZfJCjTjGtZnWTYLvkqkquaMMgd

# Set RIAL_MINT env var
export RIAL_MINT="7qf9m6B7KRZsKAJzKfZfJCjTjGtZnWTYLvkqkquaMMgd"

# Create associated token account
spl-token create-account $RIAL_MINT

# Output:
# Creating account 5yNPvwB6K7F8H9J2M4L5N6P7R8S9T0U1V2W3X4Y5Z6A

# Mint tokens (1,000,000 dengan 6 decimals)
spl-token mint $RIAL_MINT 1000000

# Verify
spl-token balance $RIAL_MINT
# Output: 1000000
```

### Update Config File

Setelah membuat token, update `/lib/solana/config.ts`:

```typescript
export const RIAL_MINT = new PublicKey(
  '7qf9m6B7KRZsKAJzKfZfJCjTjGtZnWTYLvkqkquaMMgd'
);
```

Atau gunakan environment variable di `.env.local`:

```env
NEXT_PUBLIC_RIAL_MINT=7qf9m6B7KRZsKAJzKfZfJCjTjGtZnWTYLvkqkquaMMgd
```

## 🚀 Deploy Smart Contract

Sekarang deploy Anchor program ke Devnet.

### Step 1: Build Program

```bash
anchor build

# Output:
# Compiling rialo_dex v0.1.0
# ...
# Finished release [optimized] target(s) in 45.32s
# Built successfully!
```

### Step 2: Deploy ke Devnet

```bash
# Pastikan Devnet sudah set
solana config set --url devnet

# Deploy
anchor deploy

# Output:
# Deploying cluster: https://api.devnet.solana.com
# Upgrade authority: 9B5X...
# Deploying program "rialo_dex"...
# Program deployed to: RialoNhvRjHfvEk9bxZcvejRmJjZhvhh7nJVnQ7kV5m
```

**Simpan Program ID Anda!**

```bash
# Get program ID dari keypair
solana address -k target/deploy/rialo_dex-keypair.json
# Output: RialoNhvRjHfvEk9bxZcvejRmJjZhvhh7nJVnQ7kV5m
```

### Step 3: Verify Deployment

```bash
solana program show RialoNhvRjHfvEk9bxZcvejRmJjZhvhh7nJVnQ7kV5m

# Output:
# Program Id: RialoNhvRjHfvEk9bxZcvejRmJjZhvhh7nJVnQ7kV5m
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# ProgramData Address: ...
# Executable: true
# Rent Epoch: 12345
```

Jika `Executable: true`, berarti deployment berhasil! ✅

### Step 4: Update Config

Update `/lib/solana/config.ts` dengan Program ID:

```typescript
export const DEX_PROGRAM_ID = new PublicKey(
  'RialoNhvRjHfvEk9bxZcvejRmJjZhvhh7nJVnQ7kV5m'
);
```

Atau gunakan `.env.local`:

```env
NEXT_PUBLIC_DEX_PROGRAM_ID=RialoNhvRjHfvEk9bxZcvejRmJjZhvhh7nJVnQ7kV5m
```

## 🧪 Testing & Verification

### Test 1: Jalankan Integration Test

```bash
npm run test:integration

# Output:
# ========================================
# Rialo DEX - Integration Test
# ========================================
#
# Test 1: Checking RIAL token... ✓
# Test 2: Checking DEX program... ✓
# Test 3: Checking wallet balance... ✓ 1.5234 SOL
# Test 4: Checking RIAL token account... ✓ 1000000 RIAL
# Test 5: Checking network connectivity... ✓
#
# ✓ All Tests Passed!
```

### Test 2: Verify Addresses

```bash
# Check RIAL token exists
spl-token supply <RIAL_MINT_ADDRESS>

# Check DEX program exists
solana program show <PROGRAM_ID>

# Check wallet balance
solana balance
```

### Test 3: Mulai Frontend

```bash
npm run dev

# Output:
# > next dev
# ▲ Next.js 16.0.0
# - Local: http://localhost:3000
```

Buka http://localhost:3000 di browser.

### Test 4: Test dengan Phantom Wallet

1. Install Phantom Wallet extension
2. Create new wallet atau import existing
3. Switch network ke **Devnet**
4. Buka aplikasi Rialo DEX
5. Click "Connect Wallet"
6. Test features:
   - ✅ Faucet claim (dapatkan 100 RIAL)
   - ✅ Check balance (lihat RIAL Anda)
   - ✅ Swap token
   - ✅ Bridge transfer

## 🔍 Verification Commands

```bash
# Check Solana cluster
solana config get

# Check wallet address
solana address

# Check balance
solana balance

# Check RIAL token
spl-token supply <RIAL_MINT>
spl-token balance <RIAL_MINT>

# Check program
solana program show <PROGRAM_ID>

# Check recent transactions
solana confirm <TRANSACTION_SIGNATURE>

# Check account details
solana account <ACCOUNT_ADDRESS>
```

## 🐛 Troubleshooting

### Problem: "Command not found: solana"

**Solusi:**
```bash
# Add Solana to PATH
source $HOME/.local/share/solana/env.sh

# Or add permanently to .bashrc / .zshrc
echo "export PATH=\"$HOME/.local/share/solana/env.sh:$PATH\"" >> ~/.bashrc
source ~/.bashrc
```

### Problem: "Not enough balance for transaction"

**Solusi:**
```bash
solana airdrop 2

# Tunggu beberapa detik
solana balance
```

Jika masih gagal, coba:
```bash
# Tunggu 30 detik, coba lagi
sleep 30
solana airdrop 2
```

### Problem: "Program is not executable"

**Solusi:**
Program belum di-deploy dengan benar.

```bash
# Cek status
solana program show <PROGRAM_ID>

# Jika Executable: false, deploy ulang
anchor deploy
```

### Problem: "RIAL token not found"

**Solusi:**
Token belum dibuat.

```bash
npm run setup:devnet
# atau
./scripts/create-rial-token.sh
```

### Problem: "Config.ts addresses not updated"

**Solusi:**
Manually update `/lib/solana/config.ts`:

```typescript
export const RIAL_MINT = new PublicKey('YOUR_ADDRESS');
export const DEX_PROGRAM_ID = new PublicKey('YOUR_ADDRESS');
```

Atau gunakan `.env.local`:
```
NEXT_PUBLIC_RIAL_MINT=YOUR_ADDRESS
NEXT_PUBLIC_DEX_PROGRAM_ID=YOUR_ADDRESS
```

### Problem: "Transaction failed: Invalid instruction"

**Solusi:**
Program ID mungkin salah. Verify:

```bash
# Cek config.ts
cat lib/solana/config.ts | grep DEX_PROGRAM_ID

# Bandingkan dengan actual
solana address -k target/deploy/rialo_dex-keypair.json
```

Harus sama!

### Problem: "Phantom wallet not connected"

**Solusi:**
1. Install extension: https://phantom.app/
2. Create wallet
3. Switch network ke **Devnet**
4. Refresh aplikasi
5. Click "Connect Wallet"

## 📊 Checklist Deployment

Pastikan semua sudah done:

- [ ] Solana CLI installed dan v1.18+
- [ ] Anchor Framework installed
- [ ] Node.js v16+ installed
- [ ] Solana wallet created
- [ ] Devnet set sebagai default
- [ ] Got 2+ SOL via airdrop
- [ ] RIAL token created
- [ ] Token mint address dicatat
- [ ] Smart contract di-build
- [ ] Smart contract di-deploy
- [ ] Program ID dicatat
- [ ] Config.ts updated
- [ ] npm run test:integration passed
- [ ] Frontend berjalan (npm run dev)
- [ ] Phantom wallet installed & connected
- [ ] Dapat claim faucet dari UI
- [ ] Balance tertampil dengan benar

## 📚 Useful Links

- Solana Devnet RPC: https://api.devnet.solana.com
- Solana Status: https://status.solana.com
- Solscan Explorer: https://solscan.io/?cluster=devnet
- Phantom Wallet: https://phantom.app/
- Anchor Docs: https://www.anchor-lang.com/
- Solana Docs: https://docs.solana.com/

## 🎓 Learn More

- [Smart Contract Architecture](/docs/SMART_CONTRACT_GUIDE.md)
- [Code Examples](/docs/INTEGRATION_EXAMPLES.md)
- [Deployment Guide](/docs/SOLANA_DEPLOYMENT.md)
- [Implementation Summary](/docs/IMPLEMENTATION_SUMMARY.md)

## 💬 Need Help?

- Check `/scripts/README.md` untuk script documentation
- Review `/docs/QUICKSTART.md` untuk English version
- Visit Solana Discord: https://discord.gg/solana
- Check Anchor Discord: https://discord.gg/cJYcSf9RS6

---

**Status: Ready untuk Devnet Deployment** ✅
**Versi: 1.0.0**
**Bahasa: Indonesian (Bahasa Indonesia)**
