#!/bin/bash

# Script to create RIAL SPL token on Solana Devnet
# This script creates the RIAL token with 6 decimals and sets up initial state

set -e

echo "=========================================="
echo "Creating RIAL Token on Solana Devnet"
echo "=========================================="

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "Error: Solana CLI is not installed. Please install it first."
    echo "Visit: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "Error: Anchor is not installed. Please install it first."
    echo "Visit: https://www.anchor-lang.com/docs/installation"
    exit 1
fi

# Check if spl-token is available
if ! command -v spl-token &> /dev/null; then
    echo "Warning: spl-token CLI not found. Installing..."
    cargo install spl-token-cli
fi

# Ensure connected to Devnet
echo "Checking Solana cluster..."
CURRENT_CLUSTER=$(solana config get | grep 'RPC URL' | awk '{print $3}')
echo "Current RPC: $CURRENT_CLUSTER"

if [[ ! "$CURRENT_CLUSTER" == *"devnet"* ]]; then
    echo "Switching to Devnet..."
    solana config set --url devnet
fi

# Get current payer
PAYER=$(solana config get | grep 'Keypair Path' | awk '{print $3}' | sed 's/~.*\/\(.*\)/\1/')
echo "Using keypair: $PAYER"

# Fund the account if needed (request airdrop)
BALANCE=$(solana balance)
BALANCE_NUM=$(echo $BALANCE | awk '{print $1}')

if (( $(echo "$BALANCE_NUM < 0.1" | bc -l) )); then
    echo "Requesting airdrop to fund wallet..."
    solana airdrop 2
fi

# Create RIAL token
echo ""
echo "Creating RIAL token with 6 decimals..."
RIAL_MINT=$(spl-token create-token --decimals 6 | grep 'Creating token' | awk '{print $3}' | sed 's/\x1b\[[0-9;]*m//g')

if [ -z "$RIAL_MINT" ]; then
    echo "Error: Failed to create token. Please check your setup."
    exit 1
fi

echo "✓ RIAL Token Mint Address: $RIAL_MINT"

# Create associated token account for RIAL
echo ""
echo "Creating associated token account for RIAL..."
RIAL_ATA=$(spl-token create-account $RIAL_MINT | grep 'Creating account' | awk '{print $3}' | sed 's/\x1b\[[0-9;]*m//g')
echo "✓ RIAL ATA: $RIAL_ATA"

# Mint initial supply (e.g., 1,000,000 RIAL)
echo ""
echo "Minting 1,000,000 RIAL tokens..."
spl-token mint $RIAL_MINT 1000000 $RIAL_ATA

# Check balance
echo ""
echo "Verifying token balance..."
spl-token balance $RIAL_MINT --address $RIAL_ATA

echo ""
echo "=========================================="
echo "✓ RIAL Token Successfully Created!"
echo "=========================================="
echo ""
echo "Token Configuration:"
echo "  Mint Address: $RIAL_MINT"
echo "  Decimals: 6"
echo "  Initial Supply: 1,000,000 RIAL"
echo "  Associated Account: $RIAL_ATA"
echo ""
echo "Next steps:"
echo "1. Update the RIAL_MINT in your config with: $RIAL_MINT"
echo "2. Deploy the Anchor program: anchor deploy"
echo "3. Update /lib/solana/config.ts with the RIAL_MINT address"
echo ""
