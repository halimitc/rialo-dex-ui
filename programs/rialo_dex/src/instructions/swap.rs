use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{LiquidityPool, DexConfig};
use crate::errors::DexError;

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(seeds = [b"dex_config"], bump = config.bump)]
    pub config: Account<'info, DexConfig>,
    
    #[account(mut, seeds = [b"pool", pool.mint_a.as_ref(), pool.mint_b.as_ref()], bump = pool.bump)]
    pub pool: Account<'info, LiquidityPool>,
    
    #[account(mut, address = pool.vault_a)]
    pub vault_a: Account<'info, TokenAccount>,
    
    #[account(mut, address = pool.vault_b)]
    pub vault_b: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_input_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_output_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub fee_recipient_account: Account<'info, TokenAccount>,
    
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn swap(
    ctx: Context<Swap>,
    input_amount: u64,
    min_output_amount: u64,
) -> Result<()> {
    require!(input_amount > 0, DexError::InvalidAmount);
    
    let pool = &mut ctx.accounts.pool;
    let reserve_a = pool.reserve_a;
    let reserve_b = pool.reserve_b;
    
    require!(reserve_a > 0 && reserve_b > 0, DexError::InvalidPoolState);
    
    // Calculate output with constant product formula: x * y = k
    // output = (reserve_b * input) / (reserve_a + input)
    let input_with_fee = input_amount
        .checked_mul(10000u64 - pool.fee_bps as u64)
        .ok_or(DexError::MathOverflow)?
        / 10000;
    
    let numerator = input_with_fee
        .checked_mul(reserve_b)
        .ok_or(DexError::MathOverflow)?;
    
    let denominator = reserve_a
        .checked_add(input_with_fee)
        .ok_or(DexError::MathOverflow)?;
    
    let output_amount = numerator / denominator;
    
    require!(output_amount > 0, DexError::InsufficientLiquidity);
    require!(output_amount >= min_output_amount, DexError::SlippageExceeded);
    
    // Calculate fee
    let fee_amount = input_amount
        .checked_mul(pool.fee_bps as u64)
        .ok_or(DexError::MathOverflow)?
        / 10000;
    
    // Transfer input token from user to vault
    let user_transfer = Transfer {
        from: ctx.accounts.user_input_account.to_account_info(),
        to: ctx.accounts.vault_a.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    token::transfer(
        CpiCall::new(ctx.accounts.token_program.to_account_info(), user_transfer),
        input_amount,
    )?;
    
    // Transfer output token from vault to user
    let seeds = &[
        b"pool".as_ref(),
        pool.mint_a.as_ref(),
        pool.mint_b.as_ref(),
        &[pool.bump],
    ];
    let signer = [&seeds[..]];
    
    let output_transfer = Transfer {
        from: ctx.accounts.vault_b.to_account_info(),
        to: ctx.accounts.user_output_account.to_account_info(),
        authority: pool.to_account_info(),
    };
    token::transfer(
        CpiCall::new(ctx.accounts.token_program.to_account_info(), output_transfer)
            .with_signer(&signer),
        output_amount,
    )?;
    
    // Transfer fee to fee recipient
    if fee_amount > 0 {
        let fee_transfer = Transfer {
            from: ctx.accounts.vault_a.to_account_info(),
            to: ctx.accounts.fee_recipient_account.to_account_info(),
            authority: pool.to_account_info(),
        };
        token::transfer(
            CpiCall::new(ctx.accounts.token_program.to_account_info(), fee_transfer)
                .with_signer(&signer),
            fee_amount,
        )?;
    }
    
    // Update pool reserves
    pool.reserve_a = pool.reserve_a.saturating_add(input_amount);
    pool.reserve_b = pool.reserve_b.saturating_sub(output_amount);
    
    emit!(SwapExecuted {
        user: ctx.accounts.user.key(),
        input_amount,
        output_amount,
        fee_amount,
    });
    
    Ok(())
}

#[event]
pub struct SwapExecuted {
    pub user: Pubkey,
    pub input_amount: u64,
    pub output_amount: u64,
    pub fee_amount: u64,
}
