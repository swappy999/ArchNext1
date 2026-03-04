/**
 * Chain selector — returns the correct BlockchainAdapter for the given chain.
 *
 * This module contains NO UI logic; it is a pure routing layer.
 */

import type { ChainId, BlockchainAdapter } from './types'
import { algorandAdapter } from './algorandAdapter'
import { blockchainProvider } from '@/lib/blockchainProvider'

/**
 * Select the appropriate blockchain adapter based on chain identifier.
 *
 * - `"polygon"` → existing MetaMask / ethers.js flow (blockchainProvider)
 * - `"algorand"` → backend-proxy adapter (no wallet required on client)
 * - `"mock"` → blockchainProvider in mock mode (already handled internally)
 *
 * Falls back to the existing blockchainProvider for unknown values,
 * preserving backward compatibility.
 */
export function selectChain(chain?: ChainId): BlockchainAdapter {
    if (chain === 'algorand') return algorandAdapter

    // For "polygon", "mock", or undefined → use the existing provider.
    // blockchainProvider already handles the mock / polygon distinction
    // via the NEXT_PUBLIC_BLOCKCHAIN_MODE env var.
    return blockchainProvider as unknown as BlockchainAdapter
}

/**
 * Returns a human-readable network label for toast messages etc.
 */
export function chainLabel(chain?: ChainId): string {
    switch (chain) {
        case 'algorand':
            return 'Algorand TestNet'
        case 'mock':
            return 'Mock Network'
        case 'polygon':
        default:
            return 'Polygon Amoy'
    }
}
