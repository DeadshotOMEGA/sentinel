'use client';

import { PageShell } from '@/components/layout/page-shell';

export default function DashboardPage() {
  return (
    <PageShell>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Presence Stats</h2>
          <p className="text-muted-foreground">Widget coming soon...</p>
        </div>

        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Security Alerts</h2>
          <p className="text-muted-foreground">Widget coming soon...</p>
        </div>

        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Recent Check-ins</h2>
          <p className="text-muted-foreground">Widget coming soon...</p>
        </div>

        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
          <p className="text-muted-foreground">Widget coming soon...</p>
        </div>
      </div>
    </PageShell>
  );
}
