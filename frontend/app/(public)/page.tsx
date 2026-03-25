'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Building2, Brain, ArrowUpRight, Activity, Lock, FileCheck, Users, Wallet, TrendingUp, Zap } from 'lucide-react'
import { useRef, useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import dynamic from 'next/dynamic'
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import type { OrbitControls as OrbitControlsType } from "three-stdlib"
import Model from './model'
import React from 'react'
import PropertyIndexCard from '@/components/home/PropertyIndexCard'

const LandingMap = dynamic(() => import('@/components/map/LandingMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-[#0A0E17] flex items-center justify-center rounded-[3rem]">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
    ),
})

const GlassCard = ({
    icon: Icon,
    title,
    desc,
    delay = 0,
}: {
    icon: React.ElementType<any>
    title: string
    desc: string
    delay?: number
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay }}
        viewport={{ once: true }}
        className="group relative p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.01] 
               hover:bg-white/[0.03] transition-all duration-700 overflow-hidden 
               flex flex-col items-center text-center"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <div className="relative z-10 flex flex-col items-center">

            {/* ICON */}
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 
                      flex items-center justify-center mb-6 
                      text-cyan-400 group-hover:text-cyan-300 
                      transition-all duration-500 group-hover:scale-110">
                {(() => {
                    const Component = Icon as any;
                    return <Component size={28} strokeWidth={1.5} />
                })()}
            </div>

            {/* TITLE */}
            <h3 className="text-lg font-bold text-white mb-3 tracking-tight">
                {title}
            </h3>

            {/* DESCRIPTION */}
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
                {desc}
            </p>

        </div>
    </motion.div>
)

export default function LandingPage() {
    const controlsRef = useRef<OrbitControlsType | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const router = useRouter()
    const { user } = useAuthStore()
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    })

    const opacityHero = useTransform(scrollYProgress, [0, 0.15], [1, 0])
    const scaleHero = useTransform(scrollYProgress, [0, 0.15], [1, 0.98])
    const yHero = useTransform(scrollYProgress, [0, 0.15], [0, -50])

    const springConfig = { damping: 25, stiffness: 150 }
    const mouseXSpring = useSpring(mousePos.x, springConfig)
    const mouseYSpring = useSpring(mousePos.y, springConfig)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e
            const { innerWidth, innerHeight } = window
            setMousePos({
                x: (clientX / innerWidth - 0.5) * 40,
                y: (clientY / innerHeight - 0.5) * 40
            })
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    return (
        <div ref={containerRef} className="relative min-h-screen bg-[#07090F] text-white selection:bg-cyan-500/30 font-sans">

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-[100] h-20 flex items-center justify-between px-8 md:px-16 glass-navbar border-b border-white/5 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 cursor-pointer group relative z-10"
                >
                    <Image
                        src="/branding/logo-full.png"
                        alt="ArchNext"
                        width={140}
                        height={32}
                        sizes="140px"
                        className="object-contain hover:opacity-80 transition-opacity drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        priority
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hidden lg:flex items-center gap-10 relative z-10"
                >
                    {[
                        { name: 'Property Map', href: '/map' },
                        { name: 'Marketplace', href: '/marketplace' },
                        { name: 'Ecosystem', href: '/ecosystem' }
                    ].map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 hover:text-white transition-all relative group py-2"
                        >
                            <span className="relative z-10">{item.name}</span>
                            <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-cyan-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                        </Link>
                    ))}
                    <div className="w-[1px] h-4 bg-white/10 mx-2" />
                    <Link href="/docs" className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 hover:text-white flex items-center gap-2 group transition-all py-2">
                        Docs <ArrowUpRight size={14} className="text-cyan-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-6 relative z-10"
                >
                    {isMounted ? (
                        <>
                            <button onClick={() => router.push(user ? '/dashboard' : '/auth/signin')} className="text-[14px] font-bold uppercase tracking-[0.2em] text-cyan-400 hover:text-cyan-300 transition-all">
                                {user ? 'DASHBOARD' : 'LOGIN'}
                            </button>
                            {!user && (
                                <button onClick={() => router.push('/auth/signup')} className="relative group px-5 py-3 rounded-full overflow-hidden border border-white/10 hover:bg-black/30 hover:text-white hover:border-white transition-all duration-300 bg-white text-black">
                                    <span className="relative z-10 text-[14px] font-black uppercase tracking-[0.2em]">SIGN UP</span>
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="w-24 h-8 bg-white/5 rounded-full animate-pulse" />
                    )}
                </motion.div>
            </nav>

            <main className="relative z-10">

                {/* 1. HERO */}
                <section className="relative w-full h-screen overflow-hidden bg-[#07090F]">
                    <div className="absolute inset-0 z-0">
                        <Canvas
                            shadows
                            dpr={[1, 2]}
                            camera={{
                                position: [2.989802224131152, 0.49121907482585914, 7.171863772986412],
                                fov: 35,
                            }}
                            gl={{ antialias: true }}
                        >
                            <color attach="background" args={["#07090F"]} />
                            <fog attach="fog" args={["#07090F", 12, 38]} />

                            <directionalLight position={[-8, 20, -10]} intensity={0.18} color="#4a6fa5" />
                            <pointLight position={[0, -0.5, 0]} intensity={5} distance={30} color="#0bd0e6" />
                            <pointLight position={[8, 1, -8]} intensity={3} distance={25} color="#0ffae6" />
                            <pointLight position={[-10, 3, 6]} intensity={2} distance={20} color="#00c8ff" />
                            <pointLight position={[0, 8, -20]} intensity={1.5} distance={35} color="#1a3a6e" />

                            <React.Suspense fallback={
                                <mesh position={[0, 0, 0]}>
                                    <sphereGeometry args={[0.1, 16, 16]} />
                                    <meshStandardMaterial color="#0bd0e6" emissive="#0bd0e6" emissiveIntensity={2} />
                                </mesh>
                            }>
                                <Model />
                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
                                    <planeGeometry args={[200, 200]} />
                                    <meshStandardMaterial color="#000000" roughness={3} metalness={0} />
                                </mesh>
                            </React.Suspense>

                            <OrbitControls
                                ref={controlsRef}
                                enableRotate={true}
                                enableZoom={false}
                                enablePan={true}
                                enableDamping={true}
                                dampingFactor={0.08}
                                minPolarAngle={Math.PI / 4}
                                maxPolarAngle={Math.PI / 1.8}
                                target={[-4.101012936384505, 1.9224139833236338, 2.7014141146686006]}
                            />
                        </Canvas>
                    </div>
                    <div className="absolute inset-0 w-full h-full z-1 bg-black/20 pointer-events-none" />

                    <motion.div
                        style={{ opacity: opacityHero, scale: scaleHero, y: yHero }}
                        className="top-[25%] mx-auto text-center relative z-20 flex flex-col items-start ml-16 pointer-events-none"
                    >
                        <div className="max-w-full mb-4 mt-16">
                            <h1 className="text-[3rem] md:text-[3rem] lg:text-[4rem] font-black leading-[0.9] text-white flex flex-col mt-6 items-start">
                                <motion.span
                                    initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                                    className="block tracking-[-0.02em] md:tracking-[-0.03em] lg:tracking-[-0.04em]"
                                >
                                    Choose Smart.
                                </motion.span>
                                <motion.span
                                    initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    transition={{ delay: 0.15, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                                    className="premium-gradient-text block pb-6 tracking-[-0.04em] md:tracking-[-0.05em] lg:tracking-[-0.06em] drop-shadow-[0_0_50px_rgba(180, 218, 250,0.8)]"
                                >
                                    Invest Smarter.
                                </motion.span>
                            </h1>
                            <motion.div
                                animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.1, 1] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none"
                            />
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 1 }}
                            className="flex flex-col sm:flex-row items-center justify-center md:mt-4 pointer-events-auto"
                        >
                            {isMounted && (
                                <button onClick={() => router.push(user ? '/map' : '/auth/signin')} className="group relative px-8 py-7 rounded-full bg-white text-black text-[12px] font-black uppercase tracking-[0.35em] transition-all duration-500 hover:bg-black border border-opacity-0 hover:border-white hover:border-opacity-100 hover:text-white">
                                    <span className="relative z-10">View Properties</span>
                                </button>
                            )}
                        </motion.div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2, duration: 1 }}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
                    >
                        <motion.span
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-[11px] font-black text-slate-500 uppercase tracking-[0.6em]"
                        >
                            Loading_Map
                        </motion.span>
                        <div className="w-[1.5px] h-20 relative overflow-hidden rounded-full">
                            <div className="absolute inset-0 bg-white/10" />
                            <motion.div
                                animate={{ y: ['-100%', '100%'] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]"
                            />
                        </div>
                    </motion.div>
                </section>

                {/* 1b. STATS BAR */}
                <div className="relative w-full border-y border-white/[0.04] bg-[#05070A]/80 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-8 py-5">
                        <div className="flex flex-wrap justify-around items-center gap-x-6 gap-y-4">
                            {[
                                { label: 'Properties Indexed', value: '1,200+', icon: Building2, color: 'text-cyan-400' },
                                { label: 'Total Volume', value: '₹480 Cr+', icon: TrendingUp, color: 'text-emerald-400' },
                                { label: 'AI Accuracy', value: '94.8%', icon: Brain, color: 'text-purple-400' },
                                { label: 'Networks', value: 'Polygon + Algorand', icon: Zap, color: 'text-amber-400' },
                            ].map((s) => (
                                <div key={s.label} className="flex items-center gap-3">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] ${s.color}`}>
                                        <s.icon size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white tracking-tight">{s.value}</p>
                                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{s.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Global Index Preview */}
                <section className="relative w-full py-16 px-8 border-y border-white/5 bg-[#05070A] z-10">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="flex flex-col max-w-xl">
                            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
                                The National <span className="text-cyan-400">ArchNext Property Index.</span>
                            </h2>
                            <p className="text-slate-400 font-medium leading-relaxed">
                                Our proprietary AI-driven index aggregates data from thousands of property nodes across the country, providing a real-time pulse on market trajectory and growth vectors.
                            </p>
                        </div>
                        <PropertyIndexCard />
                    </div>
                </section>

                {/* 3. BLOCKCHAIN OWNERSHIP SYSTEM */}
                <section className="relative min-h-screen py-32 px-8 border-y border-white/3">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="max-w-7xl mx-auto flex flex-col items-center text-center">

                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[0.9] mb-12">
                            Secure Property Ownership,<br /> <span className="premium-gradient-text">Made Simple.</span>
                        </h2>
                        <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-24 font-medium leading-relaxed">
                            Every property record is securely stored on blockchain, so ownership history can’t be changed, faked, or manipulated
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
                            {[
                                { icon: FileCheck, title: 'Verify Ownership', desc: 'See complete title history in seconds.' },
                                { icon: Users, title: 'Shared Investment', desc: 'Own property securely with others.' },
                                { icon: Wallet, title: 'Safe Transactions', desc: 'Automated escrow for risk-free deals.' },
                                { icon: TrendingUp, title: 'Transparent Earnings', desc: 'Real-time income tracking and distribution.' },
                            ].map((f, i) => (
                                <GlassCard key={f.title} {...f} delay={i * 0.1} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* 4. SMART CITY MAP PREVIEW */}
                <section className="relative min-h-screen py-32 px-8 bg-white/[0.01]">
                    <div className="max-w-7xl mx-auto flex flex-col items-center">
                        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 1 }}
                                viewport={{ once: true }}
                                className="order-2 lg:order-1 relative group"
                            >
                                <div className="absolute -inset-4 bg-cyan-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition duration-1000" />
                                <div className="glass-panel p-2 rounded-[3.5rem] border-white/10 relative overflow-hidden">
                                    <div className="aspect-[4/3] rounded-[3rem] border border-white/5 relative overflow-hidden">
                                        <LandingMap />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 1 }}
                                viewport={{ once: true }}
                                className="order-1 lg:order-2"
                            >
                                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-[0.9] mb-10">
                                    Discover Kolkata’s <br />
                                    <span className="premium-gradient-text">High-Growth Zones.</span>
                                </h2>
                                <p className="text-xl text-slate-400 mb-14 font-medium leading-relaxed">
                                    A real-time geospatial operating system. Visualize ownership layers,
                                    regulatory boundaries, and predicted growth vectors in a single unified canvas.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="relative py-24 px-16 border-t border-white/5 bg-[#05070A]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-16">
                    <div className="flex flex-col gap-8">
                        <div className="flex items-center gap-3 group cursor-pointer mb-2">
                            <Image
                                src="/branding/logo-full.png"
                                alt="ArchNext"
                                width={180}
                                height={40}
                                className="object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                        </div>
                        <p className="text-sm text-slate-600 max-w-xs font-medium leading-relaxed">
                            The next generation of property investment and asset ownership.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-20">
                        <div className="flex flex-col gap-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Platform</span>
                            <div className="flex flex-col gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                <Link href="/map" className="hover:text-cyan-400 transition-colors">Intelligence Map</Link>
                                <Link href="/marketplace" className="hover:text-cyan-400 transition-colors">Marketplace</Link>
                                <Link href="/ecosystem" className="hover:text-cyan-400 transition-colors">Ecosystem</Link>
                            </div>
                        </div>
                        <div className="flex flex-col gap-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Resources</span>
                            <div className="flex flex-col gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                <Link href="/docs" className="hover:text-cyan-400 transition-colors">Documentation</Link>
                                <a href="#" className="hover:text-cyan-400 transition-colors">API Reference</a>
                                <a href="#" className="hover:text-cyan-400 transition-colors">Audit Report</a>
                            </div>
                        </div>
                        <div className="flex flex-col gap-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Company</span>
                            <div className="flex flex-col gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                <a href="#" className="hover:text-cyan-400 transition-colors">VPC Access</a>
                                <a href="#" className="hover:text-cyan-400 transition-colors">Contact</a>
                                <a href="#" className="hover:text-cyan-400 transition-colors">Legal</a>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-white/[0.03] flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-700">
                        © 2026 ArchNext Infrastructure Platform. All Rights Reserved.
                    </div>
                    <div className="flex gap-8 text-[9px] font-black uppercase tracking-[0.3em] text-slate-700">
                        <span className="text-cyan-500/50">v1.0.2-STABLE</span>
                        <span>Built for the Polygon Network</span>
                    </div>
                </div>
            </footer>
        </div>
    )
}