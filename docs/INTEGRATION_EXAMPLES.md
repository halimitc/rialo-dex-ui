# Rialo DEX Frontend Integration Examples

## Quick Start

Import the Solana utilities in your components:

```typescript
import {
  connectWallet,
  requestFaucet,
  calculateSwapOutput,
  getTokenBalance,
} from '@/lib/solana';
```

## 1. Wallet Connection

### Connect Wallet (Phantom)

```typescript
import { connectWallet, getPhantomProvider, isPhantomInstalled } from '@/lib/solana';

export async function handleConnectWallet() {
  // Check if Phantom is installed
  if (!isPhantomInstalled()) {
    window.open('https://phantom.app/', '_blank');
    return;
  }

  // Connect wallet
  const publicKey = await connectWallet();
  
  if (publicKey) {
    console.log('Connected:', publicKey.toString());
    // Update UI with connected wallet
    setWalletAddress(publicKey);
  } else {
    console.error('Failed to connect wallet');
  }
}
```

### Listen to Wallet Events

```typescript
import { onWalletConnected, onWalletDisconnected, onAccountChanged } from '@/lib/solana';

useEffect(() => {
  // Listen for connection
  onWalletConnected((publicKey) => {
    console.log('Wallet connected:', publicKey.toString());
    setWalletAddress(publicKey);
  });

  // Listen for disconnection
  onWalletDisconnected(() => {
    console.log('Wallet disconnected');
    setWalletAddress(null);
  });

  // Listen for account changes
  onAccountChanged((publicKey) => {
    if (publicKey) {
      console.log('Account changed:', publicKey.toString());
    }
  });
}, []);
```

## 2. Faucet Integration

### Check Faucet Status

```typescript
import { 
  getFaucetStatus, 
  formatCooldown, 
  FAUCET_CONFIG 
} from '@/lib/solana';
import { Connection } from '@solana/web3.js';

async function checkFaucetStatus() {
  const connection = new Connection('https://api.devnet.solana.com');
  const userPublicKey = new PublicKey('user_wallet_address');

  const status = await getFaucetStatus(connection, userPublicKey);

  console.log('Claimed:', status.claimed);
  console.log('Can claim now:', status.canClaimNow);
  console.log('Cooldown remaining:', formatCooldown(status.cooldownRemaining));
  console.log('Total claimed:', status.totalClaimed.toString());

  return status;
}
```

### Request Faucet (Build Transaction)

```typescript
import { 
  createRequestFaucetInstruction,
  getConnectedWallet,
  signTransaction,
} from '@/lib/solana';
import { 
  Connection, 
  Transaction, 
  sendAndConfirmTransaction,
  PublicKey,
} from '@solana/web3.js';

async function requestFaucet() {
  const connection = new Connection('https://api.devnet.solana.com');
  const userPublicKey = await getConnectedWallet();

  if (!userPublicKey) {
    console.error('Wallet not connected');
    return;
  }

  try {
    // Create faucet instruction
    const instruction = await createRequestFaucetInstruction(
      connection,
      userPublicKey
    );

    // Build transaction
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = userPublicKey;
    
    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // Sign transaction with Phantom
    const signedTransaction = await signTransaction(transaction);
    
    if (!signedTransaction) {
      throw new Error('Failed to sign transaction');
    }

    // Send transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      signedTransaction,
      [userPublicKey]
    );

    console.log('Faucet claimed! Tx:', signature);
    return signature;
  } catch (error) {
    console.error('Faucet request failed:', error);
    throw error;
  }
}
```

### Complete Example with UI (React Hook)

```typescript
import { useCallback, useState, useEffect } from 'react';
import { PublicKey, Connection } from '@solana/web3.js';
import { 
  getFaucetStatus, 
  formatCooldown,
  createRequestFaucetInstruction,
  getConnectedWallet,
  signTransaction,
} from '@/lib/solana';

export function useFaucet() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connection = new Connection('https://api.devnet.solana.com');

  const checkStatus = useCallback(async () => {
    try {
      const wallet = await getConnectedWallet();
      if (!wallet) return;

      const faucetStatus = await getFaucetStatus(connection, wallet);
      setStatus(faucetStatus);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const claim = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const wallet = await getConnectedWallet();
      if (!wallet) throw new Error('Wallet not connected');

      const instruction = await createRequestFaucetInstruction(connection, wallet);
      const { Transaction, sendAndConfirmTransaction } = await import('@solana/web3.js');
      
      const tx = new Transaction().add(instruction);
      tx.feePayer = wallet;
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      const signed = await signTransaction(tx);
      if (!signed) throw new Error('Failed to sign');

      const signature = await sendAndConfirmTransaction(connection, signed, [wallet]);
      console.log('Claimed! Signature:', signature);

      // Refresh status
      await checkStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, []);

  return { status, loading, error, claim, checkStatus };
}
```

## 3. Token Balance

### Get RIAL Balance

```typescript
import { getTokenBalance, formatTokenAmount, TOKEN_MINTS } from '@/lib/solana';
import { Connection, PublicKey } from '@solana/web3.js';

async function getRialBalance() {
  const connection = new Connection('https://api.devnet.solana.com');
  const userPublicKey = new PublicKey('user_wallet_address');

  const balance = await getTokenBalance(
    connection,
    TOKEN_MINTS.RIAL,
    userPublicKey
  );

  console.log('RIAL balance:', formatTokenAmount(balance, 6));
  return balance;
}
```

### Get SOL Balance

```typescript
import { getSolBalance, lamportsToSol } from '@/lib/solana';
import { Connection, PublicKey } from '@solana/web3.js';

async function getSolBalance() {
  const connection = new Connection('https://api.devnet.solana.com');
  const userPublicKey = new PublicKey('user_wallet_address');

  const balanceLamports = await getSolBalance(connection, userPublicKey);
  const balanceSol = lamportsToSol(balanceLamports);

  console.log('SOL balance:', balanceSol);
  return balanceSol;
}
```

## 4. Swap Integration

### Calculate Swap Output

```typescript
import { 
  calculateSwapOutput, 
  calculateMinOutputWithSlippage,
  estimateSwapPrice,
  calculatePriceImpact,
} from '@/lib/solana';

function calculateSwap() {
  // Reserves in the pool
  const reserveA = BigInt(1_000_000_000); // 1B RIAL
  const reserveB = BigInt(500_000_000);   // 500M SOL

  // User input
  const inputAmount = BigInt(100_000_000); // 100M tokens

  // Calculate output
  const output = calculateSwapOutput(inputAmount, reserveA, reserveB);
  console.log('Output:', output.toString());

  // Calculate with slippage protection (0.5% default)
  const minOutput = calculateMinOutputWithSlippage(output, 50); // 50 bps = 0.5%
  console.log('Min output (0.5% slippage):', minOutput.toString());

  // Price estimation
  const price = estimateSwapPrice(inputAmount, output);
  console.log('Execution price:', price);

  // Spot price (no fee)
  const spotOutput = calculateSwapOutput(
    inputAmount,
    reserveA,
    reserveB
  );
  const spotPrice = Number(inputAmount) / Number(spotOutput);
  
  // Price impact
  const impact = calculatePriceImpact(spotPrice, price);
  console.log('Price impact:', impact.toFixed(2) + '%');
}
```

### Execute Swap

```typescript
import {
  createSwapInstruction,
  calculateSwapOutput,
  calculateMinOutputWithSlippage,
  TOKEN_MINTS,
  getConnectedWallet,
  signTransaction,
} from '@/lib/solana';
import { 
  Connection, 
  PublicKey, 
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

async function executeSwap(inputAmount: bigint, slippageBps: number = 50) {
  const connection = new Connection('https://api.devnet.solana.com');
  const wallet = await getConnectedWallet();

  if (!wallet) throw new Error('Wallet not connected');

  try {
    // Create swap instruction
    const instruction = await createSwapInstruction(
      connection,
      wallet,
      TOKEN_MINTS.RIAL,          // Input token
      TOKEN_MINTS.SOL,           // Output token (example, use actual mint)
      inputAmount,
      calculateMinOutputWithSlippage(
        BigInt(100), // Estimate, recalculate with actual reserves
        slippageBps
      ),
      wallet  // Fee recipient (or use DAO wallet)
    );

    // Build and sign transaction
    const tx = new Transaction().add(instruction);
    tx.feePayer = wallet;
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const signed = await signTransaction(tx);
    if (!signed) throw new Error('Failed to sign');

    // Send
    const signature = await sendAndConfirmTransaction(
      connection,
      signed,
      [wallet]
    );

    console.log('Swap successful! Signature:', signature);
    return signature;
  } catch (error) {
    console.error('Swap failed:', error);
    throw error;
  }
}
```

## 5. Bridge Integration

### Initiate Bridge Transfer

```typescript
import {
  createInitiateBridgeInstruction,
  generateNonce,
  isValidBridgeChain,
  BRIDGE_CHAINS,
  getConnectedWallet,
  signTransaction,
} from '@/lib/solana';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

async function bridgeTokens(
  tokenMint: PublicKey,
  amount: bigint,
  destChain: number // Use BRIDGE_CHAINS.ETHEREUM_GOERLI or POLYGON_MUMBAI
) {
  const connection = new Connection('https://api.devnet.solana.com');
  const wallet = await getConnectedWallet();

  if (!wallet) throw new Error('Wallet not connected');

  // Validate chain
  if (!isValidBridgeChain(destChain)) {
    throw new Error('Invalid destination chain');
  }

  try {
    const nonce = generateNonce();

    // Create bridge instruction
    const instruction = await createInitiateBridgeInstruction(
      connection,
      wallet,
      tokenMint,
      amount,
      destChain,
      nonce
    );

    // Build and send transaction
    const tx = new Transaction().add(instruction);
    tx.feePayer = wallet;
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const signed = await signTransaction(tx);
    if (!signed) throw new Error('Failed to sign');

    const signature = await sendAndConfirmTransaction(
      connection,
      signed,
      [wallet]
    );

    console.log('Bridge initiated! Signature:', signature);
    console.log('Nonce:', nonce.toString());
    
    return { signature, nonce };
  } catch (error) {
    console.error('Bridge failed:', error);
    throw error;
  }
}
```

### Track Bridge Status

```typescript
import {
  getBridgeStatus,
  getChainName,
  getBridgeStatusName,
} from '@/lib/solana';
import { Connection, PublicKey } from '@solana/web3.js';

async function trackBridge(userPublicKey: PublicKey, nonce: bigint) {
  const connection = new Connection('https://api.devnet.solana.com');

  const status = await getBridgeStatus(connection, userPublicKey, nonce);

  if (status) {
    console.log('Bridge Status:');
    console.log('  From:', getChainName(status.sourceChain));
    console.log('  To:', getChainName(status.destChain));
    console.log('  Status:', getBridgeStatusName(status.status));
    console.log('  Created:', status.createdAt.toISOString());
  }

  return status;
}
```

## 6. Complete Example Component

```typescript
import { useState, useEffect, useCallback } from 'react';
import {
  connectWallet,
  getConnectedWallet,
  createRequestFaucetInstruction,
  getFaucetStatus,
  formatCooldown,
  getTokenBalance,
  formatTokenAmount,
  TOKEN_MINTS,
  DEVNET_RPC,
} from '@/lib/solana';
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

export function DexDashboard() {
  const [wallet, setWallet] = useState<PublicKey | null>(null);
  const [rialBalance, setRialBalance] = useState<bigint>(0n);
  const [faucetStatus, setFaucetStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const connection = new Connection(DEVNET_RPC);

  // Connect wallet
  const handleConnectWallet = useCallback(async () => {
    const publicKey = await connectWallet();
    if (publicKey) {
      setWallet(publicKey);
    }
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    if (!wallet) return;

    try {
      // Get balance
      const balance = await getTokenBalance(connection, TOKEN_MINTS.RIAL, wallet);
      setRialBalance(balance);

      // Get faucet status
      const status = await getFaucetStatus(connection, wallet);
      setFaucetStatus(status);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [wallet]);

  // Request faucet
  const handleFaucet = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);

    try {
      const instruction = await createRequestFaucetInstruction(connection, wallet);
      const tx = new Transaction().add(instruction);
      tx.feePayer = wallet;
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      // Note: In real app, use Phantom signing
      // const signed = await signTransaction(tx);
      // const sig = await sendAndConfirmTransaction(connection, signed, [wallet]);

      console.log('Faucet request ready');
      await refreshData();
    } catch (error) {
      console.error('Faucet failed:', error);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [wallet]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Rialo DEX</h1>

      {!wallet ? (
        <button
          onClick={handleConnectWallet}
          className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Wallet</p>
            <p className="font-mono">{wallet.toString().slice(0, 20)}...</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">RIAL Balance</p>
            <p className="text-2xl font-bold">
              {formatTokenAmount(rialBalance, 6)}
            </p>
          </div>

          {faucetStatus && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Faucet Status</p>
              <p className={faucetStatus.canClaimNow ? 'text-green-600' : 'text-red-600'}>
                {formatCooldown(faucetStatus.cooldownRemaining)}
              </p>
              <button
                onClick={handleFaucet}
                disabled={!faucetStatus.canClaimNow || loading}
                className="mt-2 bg-teal-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Claim RIAL'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## 7. Error Handling

```typescript
import { PublicKey } from '@solana/web3.js';

async function handleDexOperation() {
  try {
    // Perform DEX operation
  } catch (error: any) {
    if (error.code === 'WALLET_NOT_CONNECTED') {
      console.error('Please connect your wallet first');
    } else if (error.message.includes('FaucetCooldownActive')) {
      console.error('Faucet is on cooldown');
    } else if (error.message.includes('SlippageExceeded')) {
      console.error('Price impact too high, reduce slippage tolerance');
    } else if (error.message.includes('InsufficientLiquidity')) {
      console.error('Not enough liquidity in the pool');
    } else {
      console.error('Unknown error:', error.message);
    }
  }
}
```

These examples cover the main DEX functionality. Adapt them to your UI components and requirements!
