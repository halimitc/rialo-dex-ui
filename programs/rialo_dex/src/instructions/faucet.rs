use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{DexConfig, FaucetRequest};
use crate::errors::DexError;

#[derive(Accounts)]
pub struct RequestFaucet<'info> {
    #[account(seeds = [b"dex_config"], bump = config.bump)]
    pub config: Account<'info, DexConfig>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = FaucetRequest::SPACE,
        seeds = [b"faucet_request", user.key().as_ref()],
        bump
    )]
    pub faucet_request: Account<'info, FaucetRequest>,
    
    #[account(mut, token::mint = config.rial_mint, token::authority = config)]
    pub faucet_vault: Account<'info, TokenAccount>,
    
    #[account(mut, token::mint = config.rial_mint)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn request_faucet(ctx: Context<RequestFaucet>) -> Result<()> {
    let config = &ctx.accounts.config;
    let faucet_request = &mut ctx.accounts.faucet_request;
    let now = Clock::get()?.unix_timestamp;
    
    // Check cooldown
    if faucet_request.user != Pubkey::default() {
        let time_elapsed = now.saturating_sub(faucet_request.last_claim_time);
        require!(
            time_elapsed >= config.faucet_cooldown,
            DexError::FaucetCooldownActive
        );
    }
    
    // Initialize if first claim
    if faucet_request.user == Pubkey::default() {
        faucet_request.user = ctx.accounts.user.key();
        faucet_request.bump = ctx.bumps.faucet_request;
    }
    
    // Update claim time and total claimed
    faucet_request.last_claim_time = now;
    faucet_request.total_claimed = faucet_request.total_claimed.saturating_add(config.faucet_amount);
    
    // Transfer tokens from vault to user
    let seeds = &[
        b"dex_config".as_ref(),
        &[config.bump],
    ];
    let signer = [&seeds[..]];
    
    let transfer_accounts = Transfer {
        from: ctx.accounts.faucet_vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: config.to_account_info(),
    };
    
    token::transfer(
        CpiCall::new(ctx.accounts.token_program.to_account_info(), transfer_accounts)
            .with_signer(&signer),
        config.faucet_amount,
    )?;
    
    emit!(FaucetClaimed {
        user: ctx.accounts.user.key(),
        amount: config.faucet_amount,
        timestamp: now,
    });
    
    Ok(())
}

#[event]
pub struct FaucetClaimed {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
