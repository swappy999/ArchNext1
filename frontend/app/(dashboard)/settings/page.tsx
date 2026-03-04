'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Fingerprint, Shield, ShieldCheck, Key, Copy,
    Eye, EyeOff, Wallet, Mail, User, Lock,
    RefreshCw, CheckCircle2, AlertTriangle, Loader2,
    ChevronRight, Bell, Globe, Cpu, Save, Pencil, X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useWalletStore } from '@/store/walletStore'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

/* ──────────────────────── Animations ──────────────────────── */
const fadeUp = (d = 0) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: d, duration: 0.55, ease: [0.22, 0.8, 0.36, 1] },
})

function SettingsCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    return (
        <motion.div
            {...fadeUp(delay)}
            className={cn(
                "relative group rounded-[1.5rem] border border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:border-cyan-500/20",
                className,
            )}
        >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {children}
        </motion.div>
    )
}

/* ══════════════════════════════════════════════════════════════
   SETTINGS PAGE — Fully Live Data
   ══════════════════════════════════════════════════════════════ */
export default function SettingsPage() {
    const router = useRouter()
    const { user, accessToken, walletConnected, logout } = useAuthStore()
    const { address: walletAddress, isConnected: walletStoreConnected } = useWalletStore()
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showToken, setShowToken] = useState(false)
    const [showSecurityKey, setShowSecurityKey] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)
    const [regenerating, setRegenerating] = useState(false)
    const [savingPrefs, setSavingPrefs] = useState(false)
    const [prefsSaved, setPrefsSaved] = useState(false)
    const [editingUsername, setEditingUsername] = useState(false)
    const [newUsername, setNewUsername] = useState('')
    const [savingUsername, setSavingUsername] = useState(false)

    // Live notification preferences from backend
    const [prefs, setPrefs] = useState({
        price_alerts: true,
        zone_intel: true,
        marketplace: false,
        ai_predictions: true,
    })

    // Fetch real user profile from backend
    const fetchProfile = useCallback(async () => {
        if (!accessToken) { setLoading(false); return }
        try {
            const data = await api.get('/users/me', accessToken)
            const u = data.user || data
            setProfile(u)
            // Load real preferences from DB
            if (u.preferences && typeof u.preferences === 'object') {
                setPrefs(prev => ({ ...prev, ...u.preferences }))
            }
        } catch {
            setProfile(null)
        } finally {
            setLoading(false)
        }
    }, [accessToken])

    useEffect(() => { fetchProfile() }, [fetchProfile])

    // Merge backend profile + frontend authStore + walletStore
    const resolvedWallet = profile?.wallet_address || user?.wallet_address || walletAddress || null
    const isWalletActive = walletConnected || walletStoreConnected || !!resolvedWallet
    const userData = {
        ...user,        // base: frontend store
        ...profile,     // overlay: backend DB fields
        wallet_address: resolvedWallet,
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        setCopied(label)
        setTimeout(() => setCopied(null), 2000)
    }

    // ─── Regenerate Security Key (calls backend) ───
    const handleRegenerateKey = async () => {
        if (!accessToken) return
        setRegenerating(true)
        try {
            const resp = await api.post('/users/regenerate-key', {}, accessToken)
            if (resp.security_key) {
                setProfile((prev: any) => ({ ...prev, security_key: resp.security_key }))
            }
        } catch (err) {
            console.error('Regenerate key failed:', err)
        } finally {
            setRegenerating(false)
        }
    }

    // ─── Toggle a notification preference (persists to backend) ───
    const togglePref = async (key: keyof typeof prefs) => {
        const newVal = !prefs[key]
        setPrefs(prev => ({ ...prev, [key]: newVal }))
        setSavingPrefs(true)
        setPrefsSaved(false)
        try {
            await api.put('/users/preferences', { [key]: newVal }, accessToken)
            setPrefsSaved(true)
            setTimeout(() => setPrefsSaved(false), 2000)
        } catch (err) {
            // Revert on error
            setPrefs(prev => ({ ...prev, [key]: !newVal }))
        } finally {
            setSavingPrefs(false)
        }
    }

    // ─── Update Username ───
    const handleUpdateUsername = async () => {
        if (!newUsername.trim() || !accessToken) return
        setSavingUsername(true)
        try {
            await api.put('/users/profile', { username: newUsername.trim() }, accessToken)
            setProfile((prev: any) => ({ ...prev, username: newUsername.trim() }))
            setEditingUsername(false)
        } catch (err) {
            console.error('Update username failed:', err)
        } finally {
            setSavingUsername(false)
        }
    }

    // Derive display values from real data
    const securityKey = userData?.security_key || '—'
    const securityKeyMasked = securityKey !== '—'
        ? showSecurityKey ? securityKey : `${securityKey.slice(0, 6)}${'•'.repeat(16)}${securityKey.slice(-4)}`
        : '—'

    const tokenPreview = accessToken
        ? showToken ? accessToken : `${'•'.repeat(16)}...${accessToken.slice(-6)}`
        : 'No active session'

    const memberSince = userData?.created_at
        ? new Date(userData.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—'

    const prefItems = [
        { key: 'price_alerts' as const, label: 'Price Alerts', desc: 'Notify when property prices change significantly', icon: '📈' },
        { key: 'zone_intel' as const, label: 'Zone Alerts', desc: 'New trending zone discoveries', icon: '🗺️' },
        { key: 'marketplace' as const, label: 'Marketplace Activity', desc: 'New listings and sales in your area', icon: '🏪' },
        { key: 'ai_predictions' as const, label: 'Market Forecasts', desc: 'New price prediction reports for properties', icon: '🧠' },
    ]

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="space-y-4 px-2">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_10px_#0ea5e9] animate-pulse" />
                    <span className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.3em]">User Settings</span>
                </div>
                <div className="space-y-2">
                    <h1 className="text-5xl font-black text-white tracking-tighter text-gradient leading-none">Settings</h1>
                    <p className="text-slate-400 max-w-xl text-lg font-medium">Manage your identity, security key, and network configuration.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                {/* ─── NEURAL IDENTITY (Live from /users/me) ─── */}
                <SettingsCard delay={0}>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                <User size={22} className="text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">User Profile</h2>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Profile Details</p>
                            </div>
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="animate-spin text-cyan-400" size={24} />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Username — Editable */}
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <User size={14} className="text-cyan-400" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Username</span>
                                        </div>
                                        {!editingUsername && (
                                            <button
                                                onClick={() => { setEditingUsername(true); setNewUsername(userData?.username || '') }}
                                                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                                                title="Edit username"
                                            >
                                                <Pencil size={12} className="text-slate-500" />
                                            </button>
                                        )}
                                    </div>
                                    {editingUsername ? (
                                        <div className="flex items-center gap-2 mt-2 ml-7">
                                            <input
                                                value={newUsername}
                                                onChange={(e) => setNewUsername(e.target.value)}
                                                className="flex-1 h-8 px-3 rounded-lg bg-[#05070A]/50 border border-white/[0.08] text-sm font-bold text-white focus:outline-none focus:border-cyan-500/50"
                                                placeholder="Enter new username"
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleUpdateUsername}
                                                disabled={savingUsername}
                                                className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
                                            >
                                                {savingUsername ? <Loader2 size={14} className="text-cyan-400 animate-spin" /> : <Save size={14} className="text-cyan-400" />}
                                            </button>
                                            <button
                                                onClick={() => setEditingUsername(false)}
                                                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                                            >
                                                <X size={14} className="text-slate-500" />
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-bold text-white mt-2 ml-7">
                                            {userData?.username || userData?.email?.split('@')[0] || '—'}
                                        </p>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Mail size={14} className="text-cyan-400" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</span>
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2 py-0.5 rounded-md border",
                                            userData?.email_verified
                                                ? 'bg-emerald-500/10 border-emerald-500/20'
                                                : 'bg-amber-500/10 border-amber-500/20'
                                        )}>
                                            {userData?.email_verified
                                                ? <><ShieldCheck size={8} className="text-emerald-400" /><span className="text-[8px] font-black text-emerald-400 uppercase">Verified</span></>
                                                : <><AlertTriangle size={8} className="text-amber-400" /><span className="text-[8px] font-black text-amber-400 uppercase">Unverified</span></>
                                            }
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-white mt-2 ml-7">
                                        {userData?.email || '—'}
                                    </p>
                                </div>

                                {/* Role */}
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                                    <div className="flex items-center gap-3">
                                        <Shield size={14} className="text-purple-400" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</span>
                                    </div>
                                    <p className="text-sm font-bold text-white mt-2 ml-7 capitalize">
                                        {userData?.role || 'user'}
                                    </p>
                                </div>

                                {/* Wallet */}
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Wallet size={14} className="text-amber-400" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Wallet</span>
                                        </div>
                                        {isWalletActive && (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[8px] font-black text-emerald-400 uppercase">Connected</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 ml-7">
                                        <p className="text-sm font-bold text-white font-mono">
                                            {userData?.wallet_address
                                                ? `${userData.wallet_address.slice(0, 6)}...${userData.wallet_address.slice(-4)}`
                                                : 'Not connected'
                                            }
                                        </p>
                                        {userData?.wallet_address && (
                                            <button
                                                onClick={() => copyToClipboard(userData.wallet_address, 'wallet')}
                                                className="p-1 rounded-md hover:bg-white/[0.06] transition-colors"
                                            >
                                                {copied === 'wallet' ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-500" />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Member Since */}
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                                    <div className="flex items-center gap-3">
                                        <Globe size={14} className="text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Member Since</span>
                                    </div>
                                    <p className="text-sm font-bold text-white mt-2 ml-7">
                                        {memberSince}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </SettingsCard>

                {/* ─── SECURITY KEY (Live from DB + Regenerate) ─── */}
                <SettingsCard delay={0.1}>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <Fingerprint size={22} className="text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">Security Key</h2>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Your unique identity key</p>
                            </div>
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div className="space-y-4">
                            {/* Security Key — Real from DB */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/20 to-cyan-900/10 border border-purple-500/10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Key size={14} className="text-purple-400" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personal Security Key</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                                        <Shield size={8} className="text-cyan-400" />
                                        <span className="text-[8px] font-black text-cyan-400 uppercase">
                                            {securityKey !== '—' ? 'Active' : 'Not Set'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <code className="text-sm font-bold text-white font-mono flex-1 truncate select-none">
                                        {securityKeyMasked}
                                    </code>
                                    <button
                                        onClick={() => setShowSecurityKey(v => !v)}
                                        className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                                        title={showSecurityKey ? 'Hide key' : 'Reveal key'}
                                    >
                                        {showSecurityKey ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-slate-400" />}
                                    </button>
                                    <button
                                        onClick={() => securityKey !== '—' && copyToClipboard(securityKey, 'seckey')}
                                        className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                                        title="Copy security key"
                                    >
                                        {copied === 'seckey' ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-500" />}
                                    </button>
                                </div>
                            </div>

                            {/* Regenerate Key */}
                            <button
                                onClick={handleRegenerateKey}
                                disabled={regenerating}
                                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] font-black text-purple-400 uppercase tracking-widest hover:bg-purple-500/20 transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                                {regenerating ? 'Generating New Key...' : 'Regenerate Security Key'}
                            </button>

                            {/* Access Token */}
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Token (JWT)</span>
                                    <button
                                        onClick={() => setShowToken(!showToken)}
                                        className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                                    >
                                        {showToken ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-slate-400" />}
                                    </button>
                                </div>
                                <code className="text-xs font-mono text-slate-300 break-all block max-h-20 overflow-y-auto">
                                    {tokenPreview}
                                </code>
                            </div>

                            {/* Session Actions */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={() => copyToClipboard(accessToken || '', 'token')}
                                    disabled={!accessToken}
                                    className="py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-30"
                                >
                                    {copied === 'token' ? '✓ Copied!' : 'Copy Token'}
                                </button>
                                <button
                                    onClick={() => {
                                        logout()
                                        router.push('/')
                                    }}
                                    className="py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-black text-rose-400 uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                                >
                                    Revoke Session
                                </button>
                            </div>
                        </div>
                    </div>
                </SettingsCard>

                {/* ─── NETWORK CONFIG (Live) ─── */}
                <SettingsCard delay={0.2}>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Globe size={22} className="text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">Network Config</h2>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">API & Blockchain Settings</p>
                            </div>
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                                <div className="flex items-center gap-3 mb-2">
                                    <Cpu size={14} className="text-emerald-400" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">API Endpoint</span>
                                </div>
                                <code className="text-sm font-bold text-white font-mono ml-7 block">
                                    {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                                </code>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Globe size={14} className="text-emerald-400" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Network</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[8px] font-black text-emerald-400 uppercase">Online</span>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-white mt-2 ml-7">Kolkata-1</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                                <div className="flex items-center gap-3 mb-2">
                                    <Shield size={14} className="text-emerald-400" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auth Type</span>
                                </div>
                                <p className="text-sm font-bold text-white ml-7">JWT + MetaMask (Dual Layer)</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                                <div className="flex items-center gap-3 mb-2">
                                    <Lock size={14} className="text-emerald-400" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">User ID</span>
                                </div>
                                <code className="text-xs font-bold text-slate-400 font-mono ml-7 block truncate">
                                    {userData?._id || userData?.id || '—'}
                                </code>
                            </div>
                        </div>
                    </div>
                </SettingsCard>

                {/* ─── NOTIFICATIONS (Live — persisted to backend) ─── */}
                <SettingsCard delay={0.3}>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                    <Bell size={22} className="text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">Notifications</h2>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alert Preferences</p>
                                </div>
                            </div>
                            <AnimatePresence>
                                {prefsSaved && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                                    >
                                        <CheckCircle2 size={12} className="text-emerald-400" />
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Saved</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div className="space-y-4">
                            {prefItems.map((item) => (
                                <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{item.icon}</span>
                                        <div>
                                            <p className="text-xs font-bold text-white">{item.label}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => togglePref(item.key)}
                                        disabled={savingPrefs}
                                        className={cn(
                                            "w-11 h-6 rounded-full p-1 transition-all duration-300 cursor-pointer shrink-0",
                                            prefs[item.key] ? 'bg-cyan-500' : 'bg-white/[0.06]'
                                        )}
                                    >
                                        <motion.div
                                            layout
                                            className="w-4 h-4 rounded-full bg-white shadow-sm"
                                            style={{ x: prefs[item.key] ? 20 : 0 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </SettingsCard>

            </div>
        </div>
    )
}
