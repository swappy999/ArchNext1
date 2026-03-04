import { polygonAdapter } from './adapters/polygonAdapter';
import { algorandAdapter } from './adapters/algorandAdapter';
import { mockAdapter } from './adapters/mockAdapter';

export type BlockchainAdapter = typeof polygonAdapter;

export const provider = {
    getMode() {
        // Defaults to polygon, reads from env natively in NEXT JS environment if used there
        return process.env.NEXT_PUBLIC_BLOCKCHAIN_MODE || 'polygon';
    },

    isMock() {
        return this.getMode() === 'mock';
    },

    getAdapter(): BlockchainAdapter {
        const mode = this.getMode();
        switch (mode) {
            case 'polygon':
                return polygonAdapter as any;
            case 'algorand':
                return algorandAdapter as any;
            case 'mock':
                return mockAdapter as any;
            default:
                console.warn(`Unknown mode '${mode}'. Defaulting to polygon.`);
                return polygonAdapter as any;
        }
    },

    async mintNFT(nftAddress: string, tokenURI: string): Promise<{ txHash: string; receipt: any }> {
        return this.getAdapter().mintNFT(nftAddress, tokenURI);
    },

    async buyProperty(marketplaceAddress: string, nftAddress: string, tokenId: number, priceWei: bigint): Promise<{ txHash: string; receipt: any }> {
        return this.getAdapter().buyProperty(marketplaceAddress, nftAddress, tokenId, priceWei);
    },

    async listProperty(marketplaceAddress: string, nftAddress: string, tokenId: number, priceWei: bigint): Promise<{ txHash: string; receipt: any }> {
        return this.getAdapter().listProperty(marketplaceAddress, nftAddress, tokenId, priceWei);
    },

    async startAuction(auctionAddress: string, nftAddress: string, tokenId: number, reservePriceWei: bigint, duration: number): Promise<{ txHash: string; receipt: any }> {
        return this.getAdapter().startAuction(auctionAddress, nftAddress, tokenId, reservePriceWei, duration);
    },

    async approveTokens(tokenAddress: string, spenderAddress: string, amountWei: bigint): Promise<{ txHash: string; receipt: any }> {
        return this.getAdapter().approveTokens(tokenAddress, spenderAddress, amountWei);
    },

    async placeBid(auctionAddress: string, onChainId: number, amountWei: bigint): Promise<{ txHash: string; receipt: any }> {
        return this.getAdapter().placeBid(auctionAddress, onChainId, amountWei);
    },

    async finalizeAuction(auctionAddress: string, onChainId: number): Promise<{ txHash: string; receipt: any }> {
        return this.getAdapter().finalizeAuction(auctionAddress, onChainId);
    }
}
