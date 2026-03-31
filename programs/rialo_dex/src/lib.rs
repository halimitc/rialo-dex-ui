use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("RialoNhvRjHfvEk9bxZcvejRmJjZhvhh7nJVnQ7kV5m"); // Replace with your actual program ID

#[program]
pub mod rialo_dex {
    use super::*;

    pub fn initialize_dex(
        ctx: Context<InitializeDex>,
        faucet_amount: u64,
        faucet_cooldown: i64,
    ) -> Result<()> {
        instructions::initialize::initialize_dex(ctx, faucet_amount, faucet_cooldown)
    }

    pub fn request_faucet(ctx: Context<RequestFaucet>) -> Result<()> {
        instructions::faucet::request_faucet(ctx)
    }

    pub fn swap(
        ctx: Context<Swap>,
        input_amount: u64,
        min_output_amount: u64,
    ) -> Result<()> {
        instructions::swap::swap(ctx, input_amount, min_output_amount)
    }

    pub fn initiate_bridge(
        ctx: Context<InitiateBridge>,
        dest_chain: state::ChainType,
        amount: u64,
        nonce: u64,
    ) -> Result<()> {
        instructions::bridge::initiate_bridge(ctx, dest_chain, amount, nonce)
    }

    pub fn complete_bridge(ctx: Context<CompleteBridge>) -> Result<()> {
        instructions::bridge::complete_bridge(ctx)
    }

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        fee_bps: u16,
    ) -> Result<()> {
        instructions::liquidity::initialize_pool(ctx, fee_bps)
    }

    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        amount_a: u64,
        amount_b: u64,
        min_lp_tokens: u64,
    ) -> Result<()> {
        instructions::liquidity::add_liquidity(ctx, amount_a, amount_b, min_lp_tokens)
    }
}
