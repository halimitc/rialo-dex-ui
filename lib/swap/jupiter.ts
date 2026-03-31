// lib/swap/jupiter.ts

export async function getQuote(inputMint: string, outputMint: string, amount: string, slippageBps: number) {
  try {
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Jupiter Quote API error: ${response.statusText}`)
    }

    const quote = await response.json()
    
    if (quote.error) {
       throw new Error(`Jupiter Quote error: ${quote.error}`)
    }

    return quote
  } catch (error) {
    throw error
  }
}

export async function getSwapTransaction(quoteResponse: any, walletAddress: string) {
  try {
    const response = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: walletAddress,
        wrapAndUnwrapSol: true,
        // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
      })
    });

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Jupiter Swap API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`Jupiter Swap error: ${data.error}`)
    }

    // Return the base64 encoded transaction string
    return data.swapTransaction
  } catch (error) {
    throw error
  }
}