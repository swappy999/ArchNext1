import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/** Full Indian Rupee format: ₹45,00,000 */
export function formatCurrency(amount: number, _currency = 'INR') {
    if (amount == null || isNaN(amount)) return '₹0'
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

/** Compact Indian format: ₹45L, ₹1.25Cr, ₹8.5K */
export function formatCurrencyCompact(value: number) {
    if (value == null || isNaN(value)) return '₹0'
    const num = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    if (num >= 1_00_00_000) {
        const cr = num / 1_00_00_000
        return `${sign}₹${cr >= 100 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, '')} Cr`
    }
    if (num >= 1_00_000) {
        const lakh = num / 1_00_000
        return `${sign}₹${lakh >= 100 ? lakh.toFixed(0) : lakh.toFixed(1).replace(/\.0$/, '')} L`
    }
    if (num >= 1000) {
        return `${sign}₹${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`
    }
    return `${sign}₹${num.toFixed(0)}`
}

export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)}m`
    }
    return `${(meters / 1000).toFixed(1)}km`
}

/**
 * Formats an address into "Street/Area | Ward X | City" format
 */
export function formatAddress(address: string, ward?: number | string): string {
    if (!address) return 'Unknown Location'
    const parts = address.split(',').map(p => p.trim())
    
    // Attempt to extract meaningful parts (often 0 is street, last is city/state)
    const street = parts[0] || ''
    const defaultCity = parts.length > 1 ? parts[parts.length - 1].split(' ')[0] : 'Kolkata' // simplified logic for demo
    
    let result = street
    if (ward) result += ` | Ward ${ward}`
    if (street.toLowerCase() !== defaultCity.toLowerCase()) {
        result += ` | ${defaultCity.replace(/\d+/g, '').trim()}` // Remove zip codes
    }
    
    return result
}


export function shortAddress(address: string) {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/** Compact Indian number (no ₹): 45L, 1.25Cr */
export function formatNumber(n: number) {
    if (n == null || isNaN(n)) return '0'
    const abs = Math.abs(n)
    if (abs >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1).replace(/\.0$/, '')} Cr`
    if (abs >= 1_00_000) return `${(n / 1_00_000).toFixed(1).replace(/\.0$/, '')} L`
    if (abs >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
    return n.toFixed(0)
}

