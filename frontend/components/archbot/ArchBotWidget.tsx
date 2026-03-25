'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send } from 'lucide-react'
import { api } from '@/lib/api'
import { ArchBotAvatar, AvatarState } from './ArchBotAvatar'
import { parseCommandToRoute, parseMapLayerCommand, parsePropertyFilters } from './CommandInterpreter'
import { useSearchStore } from '@/store/searchStore'
import { usePropertyStore } from '@/store/propertyStore'

interface Message {
    id: string
    role: 'user' | 'model'
    content: string
}

const SMART_SUGGESTIONS = [
    "Find properties under 50 lakh",
    "Explore Thermal Map",
    "Predict Property Value",
    "Analyze Ward"
]

export default function ArchBotWidget() {
    const router = useRouter()
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'model',
            content: 'Hello, I am ArchBot — your city intelligence copilot. How can I assist you today?'
        }
    ])
    const [inputMessage, setInputMessage] = useState('')
    const [isThinking, setIsThinking] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isThinking])

    const handleSend = async (text: string) => {
        if (!text.trim()) return

        setIsOpen(true)

        const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text }
        setMessages(prev => [...prev, userMessage])
        setInputMessage('')
        setIsThinking(true)

        const payloadMessages = messages.map(m => ({ role: m.role, content: m.content })).concat({ role: 'user', content: text })
        const currentContext = { url: pathname }

        try {
            const res = await api.post('/chat', { messages: payloadMessages, context: currentContext })
            const modelMessage: Message = { id: (Date.now() + 1).toString(), role: 'model', content: res.response }
            setMessages(prev => [...prev, modelMessage])

            handleSmartTriggers(text, res.response)

        } catch (err) {
            console.error('ArchBot connection error:', err)
            const backupMsg = "I'm having trouble connecting to the intelligence core right now."
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: backupMsg }])
        } finally {
            setIsThinking(false)
        }
    }

    const handleSmartTriggers = (userText: string, modelText: string) => {
        const lowerCombined = (userText + " " + modelText).toLowerCase()
        
        // 1. Natural Language Filtering for Properties
        const filters = parsePropertyFilters(userText)
        if (filters) {
             const searchState = useSearchStore.getState()
             // apply search query if found
             if (filters.query) {
                 searchState.setQuery(filters.query, usePropertyStore.getState().properties)
             }
             
             // Construct a URL to pass to the properties page
             const params = new URLSearchParams()
             if (filters.query) params.set('q', filters.query)
             if (filters.priceMin) params.set('min', filters.priceMin.toString())
             if (filters.priceMax) params.set('max', filters.priceMax.toString())

             if (pathname !== '/properties') {
                 router.push(`/properties?${params.toString()}`)
             } else {
                 // Trigger a custom event that properties/page.tsx can listen to if already there
                 window.dispatchEvent(new CustomEvent('archbot:applyFilters', { 
                     detail: filters 
                 }))
             }
             return; // Stop here if we applied filters
        }

        // 2. Direct Navigation
        const route = parseCommandToRoute(userText, modelText)
        if (route && pathname !== route) {
            router.push(route)
            return
        }

        // 3. Map Layers
        const layer = parseMapLayerCommand(lowerCombined)
        if (layer) {
            window.dispatchEvent(new CustomEvent('map:activateLayer', { detail: { layer: layer } }))
            if (layer === 'heatmap') {
                window.dispatchEvent(new CustomEvent('map:activatePredictionTool'))
            }
        }
    }

    let avatarState: AvatarState = 'IDLE'
    if (isThinking) avatarState = 'THINKING'

    return (
        <>
            <motion.div
                className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
            >
                <ArchBotAvatar state={avatarState} className="w-16 h-16 cursor-pointer" />
            </motion.div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                        className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] max-h-[80vh] flex flex-col rounded-2xl bg-[#070b14]/90 backdrop-blur-2xl border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                            <div className="flex items-center gap-3">
                                <ArchBotAvatar state={avatarState} className="w-10 h-10" />
                                <div>
                                    <h3 className="font-semibold text-white/90 text-sm">ArchBot</h3>
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-widest">
                                        <span className={`w-1.5 h-1.5 rounded-full ${avatarState === 'THINKING' ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                                        {avatarState === 'THINKING' ? 'Analyzing' : 'Online'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-zinc-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-cyan-500/20 text-cyan-50 border border-cyan-500/30'
                                            : 'bg-white/5 text-zinc-300 border border-white/10'
                                            }`}
                                    >
                                        {/* Remove navigation tags from displaying if present */}
                                        {msg.content.replace(/\[NAVIGATE:\s*\/[-a-zA-Z0-9_/]+\]/gi, '').trim()}
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {messages.length === 1 && (
                            <div className="px-4 pb-2">
                                <div className="flex flex-wrap gap-2">
                                    {SMART_SUGGESTIONS.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => handleSend(suggestion)}
                                            className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="p-4 border-t border-white/5 bg-black/40">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    handleSend(inputMessage)
                                }}
                                className="relative flex items-center"
                            >
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    placeholder="Type a command or question..."
                                    disabled={isThinking}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all placeholder:text-zinc-600 disabled:opacity-50"
                                />
                                <div className="absolute right-2 flex items-center gap-1">
                                    <button
                                        type="submit"
                                        disabled={!inputMessage.trim() || isThinking}
                                        className="p-2 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:hover:text-cyan-400 transition-colors"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
