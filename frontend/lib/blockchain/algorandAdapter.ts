/**
 * Algorand TestNet adapter.
 *
 * Every operation is proxied through the backend — there is no client-side
 * wallet interaction (no MetaMask / PeraWallet).  The backend signs and
 * submits the Algorand transaction using the authenticated user's session.
 */

import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { BlockchainAdapter, TxResult } from './types'

function getToken(): string | null {
    return useAuthStore.getState().accessToken
}

export const algorandAdapter: BlockchainAdapter = {
    async mintNFT(_nftAddress, tokenURI): Promise<TxResult> {
        const data = await api.post('/blockchain/algorand/mint', { token_uri: tokenURI }, getToken())
        return { txHash: data.tx_hash, receipt: { status: 1 } }
    },

    async buyProperty(_marketplaceAddress, _nftAddress, tokenId, priceWei): Promise<TxResult> {
        const data = await api.post('/blockchain/algorand/buy', {
            token_id: tokenId,
            price_wei: priceWei.toString(),
        }, getToken())
        return { txHash: data.tx_hash, receipt: { status: 1 } }
    },

    async listProperty(_marketplaceAddress, _nftAddress, tokenId, priceWei): Promise<TxResult> {
        const data = await api.post('/blockchain/algorand/list', {
            token_id: tokenId,
            price_wei: priceWei.toString(),
        }, getToken())
        return { txHash: data.tx_hash, receipt: { status: 1 } }
    },

    async startAuction(_auctionAddress, _nftAddress, tokenId, reservePriceWei, duration): Promise<TxResult> {
        const data = await api.post('/blockchain/algorand/auction/create', {
            token_id: tokenId,
            reserve_price_wei: reservePriceWei.toString(),
            duration,
        }, getToken())
        return { txHash: data.tx_hash, receipt: { status: 1 } }
    },

    async approveTokens(_tokenAddress, _spenderAddress, amountWei): Promise<TxResult> {
        const data = await api.post('/blockchain/algorand/approve', {
            amount_wei: amountWei.toString(),
        }, getToken())
        return { txHash: data.tx_hash, receipt: { status: 1 } }
    },

    async placeBid(_auctionAddress, onChainId, amountWei): Promise<TxResult> {
        const data = await api.post('/blockchain/algorand/auction/bid', {
            on_chain_id: onChainId,
            amount_wei: amountWei.toString(),
        }, getToken())
        return { txHash: data.tx_hash, receipt: { status: 1 } }
    },

    async finalizeAuction(_auctionAddress, onChainId): Promise<TxResult> {
        const data = await api.post('/blockchain/algorand/auction/finalize', {
            on_chain_id: onChainId,
        }, getToken())
        return { txHash: data.tx_hash, receipt: { status: 1 } }
    },
}
