import { PublicKey, Transaction } from '@solana/web3.js';

/**
 * Get Phantom wallet provider
 */
export function getPhantomProvider() {
  if (typeof window === 'undefined') {
    return null;
  }

  const provider = (window as any).solana;

  if (provider && provider.isPhantom) {
    return provider;
  }

  return null;
}

/**
 * Check if Phantom wallet is installed
 */
export function isPhantomInstalled(): boolean {
  return getPhantomProvider() !== null;
}

/**
 * Connect to Phantom wallet
 */
export async function connectWallet(): Promise<PublicKey | null> {
  try {
    const provider = getPhantomProvider();
    
    if (!provider) {
      console.error('[Wallet] Phantom wallet not found');
      return null;
    }

    const response = await provider.connect();
    return response.publicKey;
  } catch (error) {
    console.error('[Wallet] Error connecting wallet:', error);
    return null;
  }
}

/**
 * Disconnect from Phantom wallet
 */
export async function disconnectWallet(): Promise<void> {
  try {
    const provider = getPhantomProvider();
    
    if (!provider) {
      return;
    }

    await provider.disconnect();
  } catch (error) {
    console.error('[Wallet] Error disconnecting wallet:', error);
  }
}

/**
 * Get connected wallet address
 */
export async function getConnectedWallet(): Promise<PublicKey | null> {
  try {
    const provider = getPhantomProvider();
    
    if (!provider) {
      return null;
    }

    // Check if already connected
    if (provider.publicKey) {
      return provider.publicKey;
    }

    return null;
  } catch (error) {
    console.error('[Wallet] Error getting connected wallet:', error);
    return null;
  }
}

/**
 * Sign transaction with Phantom wallet
 */
export async function signTransaction(
  transaction: Transaction
): Promise<Transaction | null> {
  try {
    const provider = getPhantomProvider();
    
    if (!provider) {
      console.error('[Wallet] Phantom wallet not found');
      return null;
    }

    const signed = await provider.signTransaction(transaction);
    return signed;
  } catch (error) {
    console.error('[Wallet] Error signing transaction:', error);
    return null;
  }
}

/**
 * Sign multiple transactions
 */
export async function signAllTransactions(
  transactions: Transaction[]
): Promise<Transaction[] | null> {
  try {
    const provider = getPhantomProvider();
    
    if (!provider) {
      console.error('[Wallet] Phantom wallet not found');
      return null;
    }

    if (!provider.signAllTransactions) {
      console.error('[Wallet] signAllTransactions not supported');
      return null;
    }

    const signed = await provider.signAllTransactions(transactions);
    return signed;
  } catch (error) {
    console.error('[Wallet] Error signing transactions:', error);
    return null;
  }
}

/**
 * Sign message with Phantom wallet
 */
export async function signMessage(message: string): Promise<string | null> {
  try {
    const provider = getPhantomProvider();
    
    if (!provider) {
      console.error('[Wallet] Phantom wallet not found');
      return null;
    }

    const encodedMessage = new TextEncoder().encode(message);
    const signature = await provider.signMessage(encodedMessage);
    
    // Return signature as base64
    return Buffer.from(signature.signature).toString('base64');
  } catch (error) {
    console.error('[Wallet] Error signing message:', error);
    return null;
  }
}

/**
 * Listen to wallet connection changes
 */
export function onWalletConnected(callback: (publicKey: PublicKey) => void): void {
  try {
    const provider = getPhantomProvider();
    
    if (!provider) {
      console.warn('[Wallet] Phantom wallet not found');
      return;
    }

    provider.on('connect', (publicKey: PublicKey) => {
      callback(publicKey);
    });
  } catch (error) {
    console.error('[Wallet] Error setting up wallet listener:', error);
  }
}

/**
 * Listen to wallet disconnection
 */
export function onWalletDisconnected(callback: () => void): void {
  try {
    const provider = getPhantomProvider();
    
    if (!provider) {
      console.warn('[Wallet] Phantom wallet not found');
      return;
    }

    provider.on('disconnect', callback);
  } catch (error) {
    console.error('[Wallet] Error setting up disconnect listener:', error);
  }
}

/**
 * Listen to account changes
 */
export function onAccountChanged(callback: (publicKey: PublicKey | null) => void): void {
  try {
    const provider = getPhantomProvider();
    
    if (!provider) {
      console.warn('[Wallet] Phantom wallet not found');
      return;
    }

    provider.on('accountChanged', (publicKey: PublicKey | null) => {
      callback(publicKey);
    });
  } catch (error) {
    console.error('[Wallet] Error setting up account change listener:', error);
  }
}

/**
 * Format wallet address for display
 */
export function formatAddress(address: PublicKey | string, chars: number = 4): string {
  const addr = typeof address === 'string' ? address : address.toString();
  return `${addr.substring(0, chars)}...${addr.substring(addr.length - chars)}`;
}
