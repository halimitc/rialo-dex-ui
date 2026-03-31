#!/bin/bash

# Deployment script for Rialo DEX on Solana Devnet
# This script builds and deploys the Anchor program

set -e

echo "=========================================="
echo "Deploying Rialo DEX to Solana Devnet"
echo "=========================================="

# Check requirements
if ! command -v anchor &> /dev/null; then
    echo "Error: Anchor is not installed. Please install it first."
    exit 1
fi

if ! command -v solana &> /dev/null; then
    echo "Error: Solana CLI is not installed."
    exit 1
fi

# Check cluster
CURRENT_CLUSTER=$(solana config get | grep 'RPC URL')
echo "Current cluster: $CURRENT_CLUSTER"

if [[ ! "$CURRENT_CLUSTER" == *"devnet"* ]]; then
    echo "Switching to Devnet..."
    solana config set --url devnet
fi

# Check balance
echo ""
echo "Checking wallet balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "Wallet balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo "Warning: Low balance. Requesting airdrop..."
    solana airdrop 2
fi

# Build the program
echo ""
echo "Building Anchor program..."
anchor build

echo "Build successful!"
echo ""

# Get program ID from keypair
PROGRAM_KEYPAIR="target/deploy/rialo_dex-keypair.json"
if [ ! -f "$PROGRAM_KEYPAIR" ]; then
    echo "Generating new program keypair..."
    solana-keygen grind-validator --starts-with RialoD:1
fi

PROGRAM_ID=$(solana address -k $PROGRAM_KEYPAIR)
echo "Program ID: $PROGRAM_ID"

# Deploy
echo ""
echo "Deploying program to Devnet..."
anchor deploy

echo ""
echo "=========================================="
echo "✓ Deployment Complete!"
echo "=========================================="
echo ""
echo "Program ID: $PROGRAM_ID"
echo ""
echo "Update your config files with:"
echo "  1. Update Anchor.toml: $PROGRAM_ID"
echo "  2. Update /lib/solana/config.ts with the PROGRAM_ID"
echo ""
echo "Verify deployment:"
echo "  solana program show $PROGRAM_ID"
echo ""
