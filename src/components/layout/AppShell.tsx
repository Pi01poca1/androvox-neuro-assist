import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PrivacyBanner } from '@/components/security/PrivacyBanner';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <main className="flex-1 p-6">
            <div className="mb-4">
              <PrivacyBanner />
            </div>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
