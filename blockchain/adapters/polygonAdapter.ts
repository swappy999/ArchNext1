import { ethers } from 'ethers'

// Note: In an idealized backend/adapter environment, these imports might be provided by a different context,
// but preserving existing backend logic parity as requested.
import { getEthersSigner, parseBlockchainError } from '../../frontend/store/walletStore'

export const polygonAdapter = {
    async mintNFT(nftAddress: string, tokenURI: string): Promise<{ txHash: string; receipt: any }> {
        const signer = await getEthersSigner()
        const abiData = await import('../../frontend/contracts/PropertyNFT.json')
        const contract = new ethers.Contract(nftAddress, abiData.abi, signer)
        const tx = await contract.mintPropertyNFT(tokenURI)
        const receipt = await tx.wait()
        if (receipt?.status !== 1) throw new Error('Transaction failed on-chain')
        return { txHash: tx.hash, receipt }
    },

    async buyProperty(marketplaceAddress: string, nftAddress: string, tokenId: number, priceWei: bigint): Promise<{ txHash: string; receipt: any }> {
        try {
            const signer = await getEthersSigner()
            const abiData = await import('../../frontend/contracts/PropertyMarketplace.json')
            const contract = new ethers.Contract(marketplaceAddress, abiData.abi, signer)
            const tx = await contract.buyProperty(nftAddress, tokenId, { value: priceWei })
            const receipt = await tx.wait()
            if (receipt?.status !== 1) throw new Error('Transaction failed on-chain')
            return { txHash: tx.hash, receipt }
        } catch (error: any) {
            console.warn("Blockchain error encountered:", error)
            throw error;
        }
    },

    async listProperty(marketplaceAddress: string, nftAddress: string, tokenId: number, priceWei: bigint): Promise<{ txHash: string; receipt: any }> {
        try {
            const signer = await getEthersSigner()
            const abiData = await import('../../frontend/contracts/PropertyMarketplace.json')
            const contract = new ethers.Contract(marketplaceAddress, abiData.abi, signer)
            const tx = await contract.listProperty(nftAddress, tokenId, priceWei)
            const receipt = await tx.wait()
            if (receipt?.status !== 1) throw new Error('Transaction failed on-chain')
            return { txHash: tx.hash, receipt }
        } catch (error: any) {
            console.warn("Blockchain error encountered:", error)
            throw error;
        }
    },

    async startAuction(auctionAddress: string, nftAddress: string, tokenId: number, reservePriceWei: bigint, duration: number): Promise<{ txHash: string; receipt: any }> {
        try {
            const signer = await getEthersSigner()
            const abiData = await import('../../frontend/contracts/PropertyAuction.json')
            const contract = new ethers.Contract(auctionAddress, abiData.abi, signer)
            const minBidIncrement = reservePriceWei / BigInt(20); // 5% minimum bid increment
            const tx = await contract.createAuction(nftAddress, tokenId, reservePriceWei, duration, minBidIncrement)
            const receipt = await tx.wait()
            if (receipt?.status !== 1) throw new Error('Transaction failed on-chain')
            return { txHash: tx.hash, receipt }
        } catch (error: any) {
            console.warn("Blockchain error encountered:", error)
            throw error;
        }
    },

    async approveTokens(tokenAddress: string, spenderAddress: string, amountWei: bigint): Promise<{ txHash: string; receipt: any }> {
        try {
            const signer = await getEthersSigner()
            const abiData = await import('../../frontend/contracts/PropertyBiddingToken.json')
            const contract = new ethers.Contract(tokenAddress, abiData.abi, signer)
            const tx = await contract.approve(spenderAddress, amountWei)
            const receipt = await tx.wait()
            return { txHash: tx.hash, receipt }
        } catch (error: any) {
            console.warn("Blockchain error encountered:", error)
            throw error;
        }
    },

    async placeBid(auctionAddress: string, onChainId: number, amountWei: bigint): Promise<{ txHash: string; receipt: any }> {
        try {
            const signer = await getEthersSigner()
            const abiData = await import('../../frontend/contracts/PropertyAuction.json')
            const contract = new ethers.Contract(auctionAddress, abiData.abi, signer)
            const tx = await contract.placeBid(onChainId, amountWei)
            const receipt = await tx.wait()
            if (receipt?.status !== 1) throw new Error('Transaction failed on-chain')
            return { txHash: tx.hash, receipt }
        } catch (error: any) {
            console.warn("Blockchain error encountered:", error)
            throw error;
        }
    },

    async finalizeAuction(auctionAddress: string, onChainId: number): Promise<{ txHash: string; receipt: any }> {
        try {
            const signer = await getEthersSigner()
            const abiData = await import('../../frontend/contracts/PropertyAuction.json')
            const contract = new ethers.Contract(auctionAddress, abiData.abi, signer)
            const tx = await contract.finalizeAuction(onChainId)
            const receipt = await tx.wait()
            if (receipt?.status !== 1) throw new Error('Transaction failed on-chain')
            return { txHash: tx.hash, receipt }
        } catch (error: any) {
            console.warn("Blockchain error encountered:", error)
            throw error;
        }
    }
}
