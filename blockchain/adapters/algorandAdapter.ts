// Note: Copied conceptually from existing frontend endpoints
// since algorand tests simulate API requests in this Architecture wrapper

import { api } from '../../frontend/lib/api';
import { useAuthStore } from '../../frontend/store/authStore';

function getToken(): string | null {
    return useAuthStore.getState().accessToken;
}

export const algorandAdapter = {
    async mintNFT(nftAddress: string, tokenURI: string) {
        const data = await api.post('/blockchain/algorand/mint', { token_uri: tokenURI }, getToken());
        return { txHash: data.tx_hash, receipt: { status: 1 } };
    },

    async transferNFT(nftAddress: string, toAddress: string, tokenId: number) {
        const data = await api.post('/blockchain/algorand/transfer', {
            to_address: toAddress,
            token_id: tokenId
        }, getToken());
        return { txHash: data.tx_hash, receipt: { status: 1 } };
    },

    async buyProperty(marketplaceAddress: string, nftAddress: string, tokenId: number, priceWei: bigint) {
        const data = await api.post('/blockchain/algorand/buy', {
            token_id: tokenId,
            price_wei: priceWei.toString(),
        }, getToken());
        return { txHash: data.tx_hash, receipt: { status: 1 } };
    },

    async listProperty(marketplaceAddress: string, nftAddress: string, tokenId: number, priceWei: bigint) {
        const data = await api.post('/blockchain/algorand/list', {
            token_id: tokenId,
            price_wei: priceWei.toString(),
        }, getToken());
        return { txHash: data.tx_hash, receipt: { status: 1 } };
    },

    async createAuction(auctionAddress: string, nftAddress: string, tokenId: number, reservePriceWei: bigint, duration: number) {
        const data = await api.post('/blockchain/algorand/auction/create', {
            token_id: tokenId,
            reserve_price_wei: reservePriceWei.toString(),
            duration,
        }, getToken());
        return { txHash: data.tx_hash, receipt: { status: 1 } };
    },

    // Maintaining identical signatures per requirements: original had startAuction, approveTokens, finalizeAuction
    async startAuction(auctionAddress: string, nftAddress: string, tokenId: number, reservePriceWei: bigint, duration: number) {
        return this.createAuction(auctionAddress, nftAddress, tokenId, reservePriceWei, duration);
    },

    async approveTokens(tokenAddress: string, spenderAddress: string, amountWei: bigint) {
        const data = await api.post('/blockchain/algorand/approve', {
            amount_wei: amountWei.toString(),
        }, getToken());
        return { txHash: data.tx_hash, receipt: { status: 1 } };
    },

    async placeBid(auctionAddress: string, onChainId: number, amountWei: bigint) {
        const data = await api.post('/blockchain/algorand/auction/bid', {
            on_chain_id: onChainId,
            amount_wei: amountWei.toString(),
        }, getToken());
        return { txHash: data.tx_hash, receipt: { status: 1 } };
    },

    async finalizeAuction(auctionAddress: string, onChainId: number) {
        const data = await api.post('/blockchain/algorand/auction/finalize', {
            on_chain_id: onChainId,
        }, getToken());
        return { txHash: data.tx_hash, receipt: { status: 1 } };
    }
}
