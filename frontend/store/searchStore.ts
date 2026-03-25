import { create } from 'zustand'

export interface PropertyMatch {
    id: string
    title: string
    address: string
    price: number
    is_nft: boolean
}

interface SearchState {
    query: string
    suggestions: PropertyMatch[]
    isSearching: boolean
    
    setQuery: (q: string, allProperties: any[]) => void
    clearQuery: () => void
}

let debounceTimer: NodeJS.Timeout

export const useSearchStore = create<SearchState>((set, get) => ({
    query: '',
    suggestions: [],
    isSearching: false,

    setQuery: (q: string, allProperties: any[]) => {
        set({ query: q, isSearching: true })

        clearTimeout(debounceTimer)

        if (!q.trim()) {
            set({ suggestions: [], isSearching: false })
            return
        }

        // Debounce actual search by 300ms
        debounceTimer = setTimeout(() => {
            const term = q.toLowerCase()
            
            // Simple multi-field search: title, address, type
            const matches = allProperties.filter((p: any) => 
                (p.title || p.property_title || '').toLowerCase().includes(term) ||
                (p.address || '').toLowerCase().includes(term) ||
                (p.ward?.toString() || '').includes(term)
            )

            // Map and limit to top 5 suggestions
            const suggestions = matches.slice(0, 5).map((p: any) => ({
                id: p.id,
                title: p.title || p.property_title || 'Property',
                address: p.address || 'Unknown Location',
                price: p.price || 0,
                is_nft: p.is_nft || false
            }))

            set({ suggestions, isSearching: false })
        }, 300)
    },

    clearQuery: () => {
        clearTimeout(debounceTimer)
        set({ query: '', suggestions: [], isSearching: false })
    }
}))
