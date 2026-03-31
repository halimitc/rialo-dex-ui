use anchor_lang::prelude::*;

#[error_code]
pub enum DexError {
    #[msg("Insufficient balance")]
    InsufficientBalance,
    
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    
    #[msg("Invalid pool state")]
    InvalidPoolState,
    
    #[msg("Faucet cooldown not expired")]
    FaucetCooldownActive,
    
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
    
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Bridge timeout")]
    BridgeTimeout,
    
    #[msg("Bridge already processed")]
    BridgeAlreadyProcessed,
    
    #[msg("Invalid bridge destination")]
    InvalidBridgeDestination,
    
    #[msg("Math overflow")]
    MathOverflow,
    
    #[msg("Invalid authority")]
    InvalidAuthority,
}
