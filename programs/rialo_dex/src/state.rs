use anchor_lang::prelude::*;
use std::fmt;

#[account]
#[derive(Default)]
pub struct FaucetRequest {
    pub user: Pubkey,
    pub last_claim_time: i64,
    pub total_claimed: u64,
    pub bump: u8,
}

impl FaucetRequest {
    pub const SPACE: usize = 32 + 8 + 8 + 1 + 8; // pubkey + i64 + u64 + u8 + discriminator
}

#[account]
#[derive(Default)]
pub struct LiquidityPool {
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub vault_a: Pubkey,
    pub vault_b: Pubkey,
    pub lp_mint: Pubkey,
    pub reserve_a: u64,
    pub reserve_b: u64,
    pub lp_supply: u64,
    pub fee_bps: u16, // basis points (e.g., 25 = 0.25%)
    pub authority: Pubkey,
    pub bump: u8,
}

impl LiquidityPool {
    pub const SPACE: usize = 32 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 2 + 32 + 1 + 8; // pubkeys + u64s + u16 + u8 + discriminator
}

#[account]
pub struct BridgeTransaction {
    pub source_chain: ChainType,
    pub dest_chain: ChainType,
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub nonce: u64,
    pub status: BridgeStatus,
    pub created_at: i64,
    pub processed_at: i64,
    pub bump: u8,
}

impl BridgeTransaction {
    pub const SPACE: usize = 1 + 1 + 32 + 32 + 8 + 8 + 1 + 8 + 8 + 1 + 8; // types + pubkeys + u64s + i64s + u8s + discriminator
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ChainType {
    SolanaDevnet = 0,
    EthereumGoerli = 1,
    PolygonMumbai = 2,
}

impl fmt::Display for ChainType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ChainType::SolanaDevnet => write!(f, "Solana Devnet"),
            ChainType::EthereumGoerli => write!(f, "Ethereum Goerli"),
            ChainType::PolygonMumbai => write!(f, "Polygon Mumbai"),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BridgeStatus {
    Initiated = 0,
    Processing = 1,
    Completed = 2,
    Failed = 3,
}

impl fmt::Display for BridgeStatus {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            BridgeStatus::Initiated => write!(f, "Initiated"),
            BridgeStatus::Processing => write!(f, "Processing"),
            BridgeStatus::Completed => write!(f, "Completed"),
            BridgeStatus::Failed => write!(f, "Failed"),
        }
    }
}

#[account]
#[derive(Default)]
pub struct DexConfig {
    pub admin: Pubkey,
    pub rial_mint: Pubkey,
    pub fee_recipient: Pubkey,
    pub faucet_amount: u64,
    pub faucet_cooldown: i64, // seconds
    pub bump: u8,
}

impl DexConfig {
    pub const SPACE: usize = 32 + 32 + 32 + 8 + 8 + 1 + 8; // pubkeys + u64s + i64 + u8 + discriminator
}
