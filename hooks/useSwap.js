
import { getQuote, executeSwap } from "@/lib/jupiter/swap";

export const useSwap = () => {

  const swap = async ({ wallet, inputMint, outputMint, amount }) => {
    try {
      const quote = await getQuote(inputMint, outputMint, amount);

      if (!quote?.data?.length) throw new Error("No route found");

      const route = quote.data[0];

      const txid = await executeSwap(wallet, route);

      return { success: true, txid };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  return { swap };
};
