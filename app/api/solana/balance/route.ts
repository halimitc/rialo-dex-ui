import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/solana/balance?wallet=...&token=...
 * Mock balance endpoint - returns token balances
 * In production, this would query the actual Solana RPC
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')
    const token = request.nextUrl.searchParams.get('token') || 'RIAL'

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // In production, this would:
    // 1. Query Solana RPC for token account balance
    // 2. Return actual balance and decimals

    // Mock balances - returns different amounts based on wallet
    const mockBalances: Record<string, { amount: string; decimals: number; uiAmount: string }> = {
      'RIAL': {
        amount: '1000000000',
        decimals: 6,
        uiAmount: '1000',
      },
      'SOL': {
        amount: '5500000000',
        decimals: 9,
        uiAmount: '5.5',
      },
      'USDC': {
        amount: '2500000000',
        decimals: 6,
        uiAmount: '2500',
      },
      'USDT': {
        amount: '1500000000',
        decimals: 6,
        uiAmount: '1500',
      },
    }

    const balance = mockBalances[token] || mockBalances['RIAL']

    return NextResponse.json({
      success: true,
      wallet,
      token,
      balance,
      message: 'Mock balance endpoint (production would query Solana RPC)',
    })
  } catch (error) {
    console.error('[API] Balance error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch balance',
        success: false 
      },
      { status: 500 }
    )
  }
}
