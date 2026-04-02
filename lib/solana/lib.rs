// ---------------------------------------------------------------------------------
// FIXED RIALO DEX AMM CONTRACT (lib.rs)
// ---------------------------------------------------------------------------------
// Deep Analysis Fixes:
// 1. Used #[inline(never)] for CPI calls to prevent Solana BPF Stack Frame 5 Access Violation.
//    By extracting constraints and CPIs into separate functions, memory is dropped
//    properly and not aggregated into a single massive 4KB stack frame.
// 2. Implemented integer square root (sqrt_u128) natively to fix E0432 "unresolved import".
// 3. Maintained Box<Account<...>> to keep large account structs on the heap.
// ---------------------------------------------------------------------------------

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("EPLjdrFaEJ51yUzbwdaroeQqp6FX2egmAhNN4avD8B9u");

#[program]
pub mod rialo_amm_dex {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        fee_basis_points: u16,
        amount_a: u64,
        amount_b: u64,
    ) -> Result<()> {
        require!(amount_a > 0 && amount_b > 0, DexError::EmptyPool);

        // CPI 1: Transfer Token A
        transfer_token_from_user(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.depositor_a.to_account_info(),
            ctx.accounts.vault_a.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            amount_a,
        )?;

        // CPI 2: Transfer Token B
        transfer_token_from_user(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.depositor_b.to_account_info(),
            ctx.accounts.vault_b.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            amount_b,
        )?;

        // Calculate initial LP Tokens
        let product = (amount_a as u128).checked_mul(amount_b as u128).unwrap();
        let initial_liquidity = sqrt_u128(product) as u64;

        // CPI 3: Mint LP Tokens
        let authority_bump = ctx.bumps.authority;
        let pool_key = ctx.accounts.pool.key();
        
        mint_lp_tokens(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.lp_mint.to_account_info(),
            ctx.accounts.depositor_lp.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            initial_liquidity,
            &[&[b"authority".as_ref(), pool_key.as_ref(), &[authority_bump]]],
        )?;

        // Populate Pool State (isolated to avoid stack mixing)
        populate_pool_state(ctx.accounts.pool.as_mut(), &ctx, fee_basis_points);

        Ok(())
    }

    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        minimum_amount_out: u64,
        is_a_to_b: bool,
    ) -> Result<()> {
        let reserve_a = ctx.accounts.vault_a.amount as u128;
        let reserve_b = ctx.accounts.vault_b.amount as u128;

        require!(reserve_a > 0 && reserve_b > 0, DexError::EmptyPool);

        let (reserve_in, reserve_out) = if is_a_to_b {
            (reserve_a, reserve_b)
        } else {
            (reserve_b, reserve_a)
        };

        // Fee logic
        let fee_multiplier = 10000_u128 - (ctx.accounts.pool.fee_basis_points as u128);
        let amount_in_with_fee = (amount_in as u128) * fee_multiplier;

        let numerator = amount_in_with_fee * reserve_out;
        let denominator = (reserve_in * 10000) + amount_in_with_fee;
        let amount_out = (numerator / denominator) as u64;

        require!(amount_out >= minimum_amount_out, DexError::SlippageExceeded);
        require!(amount_out as u128 <= (reserve_out / 10), DexError::SwapAmountTooLarge);

        // 1. Transfer user token to vault
        let (vault_in, vault_out) = if is_a_to_b {
            (
                ctx.accounts.vault_a.to_account_info(),
                ctx.accounts.vault_b.to_account_info(),
            )
        } else {
            (
                ctx.accounts.vault_b.to_account_info(),
                ctx.accounts.vault_a.to_account_info(),
            )
        };

        transfer_token_from_user(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.user_source.to_account_info(),
            vault_in,
            ctx.accounts.user.to_account_info(),
            amount_in,
        )?;

        // 2. Transfer vault token to user
        let pool_key = ctx.accounts.pool.key();
        let authority_bump = ctx.bumps.authority;

        transfer_token_from_vault(
            ctx.accounts.token_program.to_account_info(),
            vault_out,
            ctx.accounts.user_destination.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            amount_out,
            &[&[b"authority".as_ref(), pool_key.as_ref(), &[authority_bump]]],
        )?;

        // Emit Event
        emit!(SwapEvent {
            user: ctx.accounts.user.key(),
            amount_in,
            amount_out,
            is_a_to_b,
        });

        Ok(())
    }

    pub fn devnet_refill(
        ctx: Context<DevnetRefill>,
        amount_a: u64,
        amount_b: u64,
    ) -> Result<()> {
        transfer_token_from_user(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.admin_source_a.to_account_info(),
            ctx.accounts.vault_a.to_account_info(),
            ctx.accounts.admin.to_account_info(),
            amount_a,
        )?;
        Ok(())
    }
}

// ----------------------------------------------------
// INLINED HELPER FUNCTIONS TO PREVENT STACK OVERFLOW
// ----------------------------------------------------

#[inline(never)]
fn transfer_token_from_user<'info>(
    token_program: AccountInfo<'info>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let cpi_accounts = Transfer {
        from,
        to,
        authority,
    };
    token::transfer(CpiContext::new(token_program, cpi_accounts), amount)
}

#[inline(never)]
fn transfer_token_from_vault<'info>(
    token_program: AccountInfo<'info>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let cpi_accounts = Transfer {
        from,
        to,
        authority,
    };
    token::transfer(
        CpiContext::new_with_signer(token_program, cpi_accounts, signer_seeds),
        amount,
    )
}

#[inline(never)]
fn mint_lp_tokens<'info>(
    token_program: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let cpi_accounts = MintTo {
        mint,
        to,
        authority,
    };
    token::mint_to(
        CpiContext::new_with_signer(token_program, cpi_accounts, signer_seeds),
        amount,
    )
}

#[inline(never)]
fn populate_pool_state(pool: &mut Pool, ctx: &Context<InitializePool>, fee: u16) {
    pool.mint_a = ctx.accounts.mint_a.key();
    pool.mint_b = ctx.accounts.mint_b.key();
    pool.vault_a = ctx.accounts.vault_a.key();
    pool.vault_b = ctx.accounts.vault_b.key();
    pool.lp_mint = ctx.accounts.lp_mint.key();
    pool.fee_basis_points = fee;
    pool.bump = ctx.bumps.pool;
    pool.admin = ctx.accounts.payer.key();
}

pub fn sqrt_u128(n: u128) -> u128 {
    if n == 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

// ----------------------------------------------------
// ACCOUNTS
// ----------------------------------------------------
#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Pool::INIT_SPACE,
        seeds = [b"pool", mint_a.key().as_ref(), mint_b.key().as_ref()],
        bump
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// CHECK: PDA for vault authority
    #[account(
        seeds = [b"authority", pool.key().as_ref()],
        bump
    )]
    pub authority: UncheckedAccount<'info>,

    pub mint_a: Box<Account<'info, Mint>>,
    pub mint_b: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub vault_a: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub vault_b: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub lp_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub depositor_a: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub depositor_b: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub depositor_lp: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.mint_a.as_ref(), pool.mint_b.as_ref()],
        bump = pool.bump
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// CHECK: Validated inside
    #[account(
        seeds = [b"authority", pool.key().as_ref()],
        bump
    )]
    pub authority: UncheckedAccount<'info>,

    #[account(mut, address = pool.vault_a)]
    pub vault_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = pool.vault_b)]
    pub vault_b: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user_source: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user_destination: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DevnetRefill<'info> {
    #[account(mut)]
    pub pool: Box<Account<'info, Pool>>,

    #[account(mut, address = pool.vault_a)]
    pub vault_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = pool.vault_b)]
    pub vault_b: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub admin_source_a: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub vault_a: Pubkey,
    pub vault_b: Pubkey,
    pub lp_mint: Pubkey,
    pub fee_basis_points: u16,
    pub bump: u8,
    pub admin: Pubkey,
}

#[event]
pub struct SwapEvent {
    pub user: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub is_a_to_b: bool,
}

#[error_code]
pub enum DexError {
    #[msg("Pool reserves cannot be empty.")]
    EmptyPool,
    #[msg("Swap amount exceeds maximum allowed single swap (10% of liquidity).")]
    SwapAmountTooLarge,
    #[msg("Slippage tolerance exceeded.")]
    SlippageExceeded,
    #[msg("Admin access required.")]
    Unauthorized,
}