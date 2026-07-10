export interface DashboardDdsTransferExampleDetail {
  visible: boolean
  modalVisible?: boolean
}

const DASHBOARD_DDS_TRANSFER_EXAMPLE_EVENT = 'sentinel:dashboard-dds-transfer-example'

export function setDashboardDdsTransferExampleVisible(visible: boolean): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new window.CustomEvent<DashboardDdsTransferExampleDetail>(
      DASHBOARD_DDS_TRANSFER_EXAMPLE_EVENT,
      {
        detail: { visible, modalVisible: false },
      }
    )
  )
}

export function setDashboardDdsTransferModalExampleVisible(visible: boolean): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new window.CustomEvent<DashboardDdsTransferExampleDetail>(
      DASHBOARD_DDS_TRANSFER_EXAMPLE_EVENT,
      {
        detail: { visible: false, modalVisible: visible },
      }
    )
  )
}

export function subscribeDashboardDdsTransferExample(
  handler: (detail: DashboardDdsTransferExampleDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined

  const listener = (event: Event) => {
    const customEvent = event as globalThis.CustomEvent<DashboardDdsTransferExampleDetail>
    handler(customEvent.detail)
  }

  window.addEventListener(DASHBOARD_DDS_TRANSFER_EXAMPLE_EVENT, listener)
  return () => window.removeEventListener(DASHBOARD_DDS_TRANSFER_EXAMPLE_EVENT, listener)
}
