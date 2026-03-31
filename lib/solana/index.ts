// Configuration
export * from './config';

// Faucet functions
export {
  getFaucetRequestPDA,
  getDexConfigPDA,
  createRequestFaucetInstruction,
  getFaucetStatus,
  formatCooldown,
} from './faucet';

// Swap functions
export {
  getPoolPDA,
  calculateSwapOutput,
  calculateMinOutputWithSlippage,
  getPoolState,
  createSwapInstruction,
  estimateSwapPrice,
  calculatePriceImpact,
} from './swap';

// Bridge functions
export {
  getBridgeTxPDA,
  createInitiateBridgeInstruction,
  createCompleteBridgeInstruction,
  getBridgeStatus,
  getChainName,
  getBridgeStatusName,
  generateNonce,
  isValidBridgeChain,
  type DestChain,
} from './bridge';

// Token functions
export {
  getTokenBalance,
  getSolBalance,
  tokenAccountExists,
  formatTokenAmount,
  parseTokenAmount,
  getTokenAccountInfo,
  compareTokens,
  lamportsToSol,
  solToLamports,
} from './token';

// Wallet functions
export {
  getPhantomProvider,
  isPhantomInstalled,
  connectWallet,
  disconnectWallet,
  getConnectedWallet,
  signTransaction,
  signAllTransactions,
  signMessage,
  onWalletConnected,
  onWalletDisconnected,
  onAccountChanged,
  formatAddress,
} from './wallet';
