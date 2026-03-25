export type MapCommandLayer = 'thermal' | 'pulse' | 'heatmap' | 'wards'

export const parseCommandToRoute = (userText: string, modelText: string): string | null => {
    // Rely on LLM specific tags for direct navigation
    const navMatch = modelText.match(/\[NAVIGATE:\s*(\/[-a-zA-Z0-9_/]+)\]/i);
    if (navMatch && navMatch[1]) {
        return navMatch[1];
    }

    // Fallback logic
    const lower = (userText + " " + modelText).toLowerCase()
    if (lower.includes('marketplace') || lower.includes('market')) return '/marketplace'
    if (lower.includes('dashboard') || lower.includes('home') || lower.includes('center')) return '/dashboard'
    if (lower.includes('portfolio') || lower.includes('assets') || lower.includes('holdings')) return '/portfolio'
    if (lower.includes('properties') || lower.includes('hub') || lower.includes('registry')) return '/properties'
    if (lower.includes('map') || lower.includes('intelligence map')) return '/map'
    if (lower.includes('forecast') || lower.includes('predict') || lower.includes('future')) return '/prediction'
    if (lower.includes('auction') || lower.includes('bid')) return '/marketplace'
    if (lower.includes('ecosystem')) return '/ecosystem'
    if (lower.includes('settings')) return '/settings'

    return null
}

export const parseMapLayerCommand = (command: string): MapCommandLayer | null => {
    const lower = command.toLowerCase()

    if (lower.includes('thermal')) return 'thermal'
    if (lower.includes('pulse') || lower.includes('infrastructure')) return 'pulse'
    if (lower.includes('ward') || lower.includes('boundary')) return 'wards'
    if (lower.includes('predict') || lower.includes('heatmap') || lower.includes('ai layer')) return 'heatmap'

    return null
}

export interface PropertyFilters {
    query?: string
    priceMax?: number
    priceMin?: number
}

// Very basic local NLP for finding property metrics in a natural language string.
export const parsePropertyFilters = (command: string): PropertyFilters | null => {
    const lower = command.toLowerCase()
    
    // Only attempt to parse if it's somewhat related to properties/search
    if (!lower.includes('propert') && !lower.includes('find') && !lower.includes('show') && !lower.includes('search')) {
        return null;
    }

    const filters: PropertyFilters = {}
    let hasFilters = false;

    // Price under X
    const underMatch = lower.match(/(under|below|less than|max)\s*(\d+)/i)
    if (underMatch && underMatch[2]) {
        let val = parseInt(underMatch[2], 10)
        // Handle "lakh", "lb", "k" roughly
        if (lower.includes('lakh') || lower.includes('lac')) val = val * 100000;
        else if (lower.includes('million') || lower.includes('m')) val = val * 1000000;
        else if (lower.includes('k ')) val = val * 1000;

        filters.priceMax = val
        hasFilters = true
    }

    // Price over X
    const overMatch = lower.match(/(over|above|more than|min)\s*(\d+)/i)
    if (overMatch && overMatch[2]) {
        let val = parseInt(overMatch[2], 10)
        if (lower.includes('lakh') || lower.includes('lac')) val = val * 100000;
        else if (lower.includes('million') || lower.includes('m')) val = val * 1000000;
        else if (lower.includes('k ')) val = val * 1000;

        filters.priceMin = val
        hasFilters = true
    }

    // Keyword extraction (anything following "in", "at", "near")
    const locMatch = lower.match(/(?:in|at|near|around)\s+([a-zA-Z\s]+)/i)
    if (locMatch && locMatch[1]) {
        // clean up trailing words that might be other commands
        let loc = locMatch[1].trim()
        const stopWords = ['under', 'over', 'below', 'above', 'with', 'for']
        for (const stop of stopWords) {
            const idx = loc.indexOf(` ${stop} `)
            if (idx > -1) {
                loc = loc.substring(0, idx).trim()
            }
        }
        if (loc.length > 2) {
             filters.query = loc
             hasFilters = true
        }
    }

    return hasFilters ? filters : null
}
