import { NetworkSettingsPanel } from '@/components/settings/network-settings-panel'

export default function AdminNetworkRoute() {
  return (
    <div className="space-y-(--space-4)">
      <h1 id="admin-page-title" className="font-display text-3xl font-bold">
        Network
      </h1>
      <p className="max-w-3xl text-sm text-base-content/65">
        Manage approved Wi-Fi, remote systems, and host-side network recovery.
      </p>
      <NetworkSettingsPanel />
    </div>
  )
}
