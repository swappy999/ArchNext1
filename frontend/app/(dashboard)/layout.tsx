import DashboardShell from '@/components/layout/DashboardShell'
import { RealtimeProvider } from '@/components/providers/RealtimeProvider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardShell>
            <RealtimeProvider>
                {children}
            </RealtimeProvider>
        </DashboardShell>
    )
}
