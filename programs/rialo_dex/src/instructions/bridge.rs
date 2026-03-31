use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Burn};
use crate::state::{DexConfig, BridgeTransaction, ChainType, BridgeStatus};
use crate::errors::DexError;

#[derive(Accounts)]
pub struct InitiateBridge<'info> {
    #[account(seeds = [b"dex_config"], bump = config.bump)]
    pub config: Account<'info, DexConfig>,
    
    #[account(
        init,
        payer = user,
        space = BridgeTransaction::SPACE,
        seeds = [b"bridge_tx", user.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub bridge_tx: Account<'info, BridgeTransaction>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn initiate_bridge(
    ctx: Context<InitiateBridge>,
    dest_chain: ChainType,
    amount: u64,
    nonce: u64,
) -> Result<()> {
    require!(amount > 0, DexError::InvalidAmount);
    
    // Validate destination chain
    match dest_chain {
        ChainType::SolanaDevnet => return Err(DexError::InvalidBridgeDestination.into()),
        ChainType::EthereumGoerli | ChainType::PolygonMumbai => {},
    }
    
    let bridge_tx = &mut ctx.accounts.bridge_tx;
    let now = Clock::get()?.unix_timestamp;
    
    bridge_tx.source_chain = ChainType::SolanaDevnet;
    bridge_tx.dest_chain = dest_chain;
    bridge_tx.user = ctx.accounts.user.key();
    bridge_tx.token_mint = ctx.accounts.user_token_account.mint;
    bridge_tx.amount = amount;
    bridge_tx.nonce = nonce;
    bridge_tx.status = BridgeStatus::Initiated;
    bridge_tx.created_at = now;
    bridge_tx.processed_at = 0;
    bridge_tx.bump = ctx.bumps.bridge_tx;
    
    // Burn tokens (lock in bridge)
    let burn_accounts = Burn {
        mint: ctx.accounts.user_token_account.mint.to_account_info(),
        from: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    
    token::burn(
        CpiCall::new(ctx.accounts.token_program.to_account_info(), burn_accounts),
        amount,
    )?;
    
    emit!(BridgeInitiated {
        user: ctx.accounts.user.key(),
        source_chain: ChainType::SolanaDevnet,
        dest_chain,
        amount,
        nonce,
        timestamp: now,
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct CompleteBridge<'info> {
    #[account(
        mut,
        seeds = [b"bridge_tx", bridge_tx.user.as_ref(), &bridge_tx.nonce.to_le_bytes()],
        bump = bridge_tx.bump
    )]
    pub bridge_tx: Account<'info, BridgeTransaction>,
    
    #[account(address = crate::ID)]
    pub program: UncheckedAccount<'info>,
}

pub fn complete_bridge(ctx: Context<CompleteBridge>) -> Result<()> {
    let bridge_tx = &mut ctx.accounts.bridge_tx;
    
    require!(
        bridge_tx.status == BridgeStatus::Initiated,
        DexError::BridgeAlreadyProcessed
    );
    
    let now = Clock::get()?.unix_timestamp;
    bridge_tx.status = BridgeStatus::Completed;
    bridge_tx.processed_at = now;
    
    emit!(BridgeCompleted {
        user: bridge_tx.user,
        nonce: bridge_tx.nonce,
        timestamp: now,
    });
    
    Ok(())
}

#[event]
pub struct BridgeInitiated {
    pub user: Pubkey,
    pub source_chain: ChainType,
    pub dest_chain: ChainType,
    pub amount: u64,
    pub nonce: u64,
    pub timestamp: i64,
}

#[event]
pub struct BridgeCompleted {
    pub user: Pubkey,
    pub nonce: u64,
    pub timestamp: i64,
}
