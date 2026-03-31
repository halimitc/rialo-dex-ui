use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer, MintTo};
use crate::state::{LiquidityPool, DexConfig};
use crate::errors::DexError;

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(seeds = [b"dex_config"], bump = config.bump)]
    pub config: Account<'info, DexConfig>,
    
    #[account(
        init,
        payer = authority,
        space = LiquidityPool::SPACE,
        seeds = [b"pool", mint_a.key().as_ref(), mint_b.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, LiquidityPool>,
    
    pub mint_a: Account<'info, Mint>,
    pub mint_b: Account<'info, Mint>,
    
    #[account(init_if_needed, payer = authority, token::mint = mint_a, token::authority = pool)]
    pub vault_a: Account<'info, TokenAccount>,
    
    #[account(init_if_needed, payer = authority, token::mint = mint_b, token::authority = pool)]
    pub vault_b: Account<'info, TokenAccount>,
    
    #[account(init_if_needed, payer = authority, mint::decimals = 6, mint::authority = pool)]
    pub lp_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_pool(
    ctx: Context<InitializePool>,
    fee_bps: u16,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    
    pool.mint_a = ctx.accounts.mint_a.key();
    pool.mint_b = ctx.accounts.mint_b.key();
    pool.vault_a = ctx.accounts.vault_a.key();
    pool.vault_b = ctx.accounts.vault_b.key();
    pool.lp_mint = ctx.accounts.lp_mint.key();
    pool.reserve_a = 0;
    pool.reserve_b = 0;
    pool.lp_supply = 0;
    pool.fee_bps = fee_bps;
    pool.authority = ctx.accounts.authority.key();
    pool.bump = ctx.bumps.pool;
    
    Ok(())
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(seeds = [b"dex_config"], bump = config.bump)]
    pub config: Account<'info, DexConfig>,
    
    #[account(mut, seeds = [b"pool", pool.mint_a.as_ref(), pool.mint_b.as_ref()], bump = pool.bump)]
    pub pool: Account<'info, LiquidityPool>,
    
    #[account(mut, address = pool.vault_a)]
    pub vault_a: Account<'info, TokenAccount>,
    
    #[account(mut, address = pool.vault_b)]
    pub vault_b: Account<'info, TokenAccount>,
    
    #[account(mut, address = pool.lp_mint)]
    pub lp_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub user_a_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_b_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_lp_account: Account<'info, TokenAccount>,
    
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn add_liquidity(
    ctx: Context<AddLiquidity>,
    amount_a: u64,
    amount_b: u64,
    min_lp_tokens: u64,
) -> Result<()> {
    require!(amount_a > 0 && amount_b > 0, DexError::InvalidAmount);
    
    let pool = &mut ctx.accounts.pool;
    
    // Calculate LP tokens to mint
    let lp_tokens = if pool.lp_supply == 0 {
        // First liquidity provider
        (amount_a as u128)
            .checked_mul(amount_b as u128)
            .ok_or(DexError::MathOverflow)?
            .integer_sqrt() as u64
    } else {
        // Subsequent providers
        let lp_from_a = (amount_a as u128)
            .checked_mul(pool.lp_supply as u128)
            .ok_or(DexError::MathOverflow)?
            / pool.reserve_a as u128;
        
        let lp_from_b = (amount_b as u128)
            .checked_mul(pool.lp_supply as u128)
            .ok_or(DexError::MathOverflow)?
            / pool.reserve_b as u128;
        
        std::cmp::min(lp_from_a, lp_from_b) as u64
    };
    
    require!(lp_tokens >= min_lp_tokens, DexError::SlippageExceeded);
    
    // Transfer tokens from user to vault
    let transfer_a = Transfer {
        from: ctx.accounts.user_a_account.to_account_info(),
        to: ctx.accounts.vault_a.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    token::transfer(
        CpiCall::new(ctx.accounts.token_program.to_account_info(), transfer_a),
        amount_a,
    )?;
    
    let transfer_b = Transfer {
        from: ctx.accounts.user_b_account.to_account_info(),
        to: ctx.accounts.vault_b.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    token::transfer(
        CpiCall::new(ctx.accounts.token_program.to_account_info(), transfer_b),
        amount_b,
    )?;
    
    // Mint LP tokens
    let seeds = &[
        b"pool".as_ref(),
        pool.mint_a.as_ref(),
        pool.mint_b.as_ref(),
        &[pool.bump],
    ];
    let signer = [&seeds[..]];
    
    let mint_accounts = MintTo {
        mint: ctx.accounts.lp_mint.to_account_info(),
        to: ctx.accounts.user_lp_account.to_account_info(),
        authority: pool.to_account_info(),
    };
    token::mint_to(
        CpiCall::new(ctx.accounts.token_program.to_account_info(), mint_accounts)
            .with_signer(&signer),
        lp_tokens,
    )?;
    
    // Update pool state
    pool.reserve_a = pool.reserve_a.saturating_add(amount_a);
    pool.reserve_b = pool.reserve_b.saturating_add(amount_b);
    pool.lp_supply = pool.lp_supply.saturating_add(lp_tokens);
    
    emit!(LiquidityAdded {
        user: ctx.accounts.user.key(),
        amount_a,
        amount_b,
        lp_tokens,
    });
    
    Ok(())
}

#[event]
pub struct LiquidityAdded {
    pub user: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub lp_tokens: u64,
}
