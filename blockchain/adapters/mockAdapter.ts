// Generate a random mock hex string matching Ethereum formats
const generateMockHash = (length: number = 64) => {
    const chars = '0123456789abcdef'
    let hash = '0xMOCK'
    for (let i = 0; i < length - 6; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)]
    }
    return hash
}

// Delayer to simulate block confirmation
const simulateDelay = (ms: number = 2000) => new Promise(resolve => setTimeout(resolve, ms))

export const mockAdapter = {
    async mintNFT(nftAddress: string, tokenURI: string): Promise<{ txHash: string; receipt: any }> {
        await simulateDelay(2000)
        return { txHash: generateMockHash(), receipt: { status: 1 } }
    },

    async buyProperty(marketplaceAddress: string, nftAddress: string, tokenId: number, priceWei: bigint): Promise<{ txHash: string; receipt: any }> {
        await simulateDelay(2500)
        return { txHash: generateMockHash(), receipt: { status: 1 } }
    },

    async listProperty(marketplaceAddress: string, nftAddress: string, tokenId: number, priceWei: bigint): Promise<{ txHash: string; receipt: any }> {
        await simulateDelay(2000)
        return { txHash: generateMockHash(), receipt: { status: 1 } }
    },

    async startAuction(auctionAddress: string, nftAddress: string, tokenId: number, reservePriceWei: bigint, duration: number): Promise<{ txHash: string; receipt: any }> {
        await simulateDelay(2500)
        return { txHash: generateMockHash(), receipt: { status: 1 } }
    },

    async approveTokens(tokenAddress: string, spenderAddress: string, amountWei: bigint): Promise<{ txHash: string; receipt: any }> {
        await simulateDelay(1500)
        return { txHash: generateMockHash(), receipt: { status: 1 } }
    },

    async placeBid(auctionAddress: string, onChainId: number, amountWei: bigint): Promise<{ txHash: string; receipt: any }> {
        await simulateDelay(2000)
        return { txHash: generateMockHash(), receipt: { status: 1 } }
    },

    async finalizeAuction(auctionAddress: string, onChainId: number): Promise<{ txHash: string; receipt: any }> {
        await simulateDelay(2500)
        return { txHash: generateMockHash(), receipt: { status: 1 } }
    }
}
