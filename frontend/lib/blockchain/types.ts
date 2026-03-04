/**
 * Shared types for the hybrid blockchain layer.
 * This file contains NO UI logic.
 */

/** Supported blockchain networks */
export type ChainId = 'polygon' | 'algorand' | 'mock'

/** Standardised result returned by every adapter method */
export interface TxResult {
    txHash: string
    receipt: any
}

/**
 * Every chain adapter must implement this interface.
 * Method signatures intentionally mirror the existing blockchainProvider API
 * so callers don't need to change their consumption pattern.
 */
export interface BlockchainAdapter {
    mintNFT(nftAddress: string, tokenURI: string): Promise<TxResult>

    buyProperty(
        marketplaceAddress: string,
        nftAddress: string,
        tokenId: number,
        priceWei: bigint,
    ): Promise<TxResult>

    listProperty(
        marketplaceAddress: string,
        nftAddress: string,
        tokenId: number,
        priceWei: bigint,
    ): Promise<TxResult>

    startAuction(
        auctionAddress: string,
        nftAddress: string,
        tokenId: number,
        reservePriceWei: bigint,
        duration: number,
    ): Promise<TxResult>

    approveTokens(
        tokenAddress: string,
        spenderAddress: string,
        amountWei: bigint,
    ): Promise<TxResult>

    placeBid(
        auctionAddress: string,
        onChainId: number,
        amountWei: bigint,
    ): Promise<TxResult>

    finalizeAuction(
        auctionAddress: string,
        onChainId: number,
    ): Promise<TxResult>
}
