use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint};
use crate::state::DexConfig;

#[derive(Accounts)]
pub struct InitializeDex<'info> {
    #[account(init, payer = admin, space = DexConfig::SPACE, seeds = [b"dex_config"], bump)]
    pub config: Account<'info, DexConfig>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub rial_mint: Account<'info, Mint>,
    
    pub fee_recipient: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn initialize_dex(
    ctx: Context<InitializeDex>,
    faucet_amount: u64,
    faucet_cooldown: i64,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.rial_mint = ctx.accounts.rial_mint.key();
    config.fee_recipient = ctx.accounts.fee_recipient.key();
    config.faucet_amount = faucet_amount;
    config.faucet_cooldown = faucet_cooldown;
    config.bump = ctx.bumps.config;
    
    Ok(())
}
