let openModalCount = 0

function syncRootScrollbarGutter() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const root = document.documentElement

  if (openModalCount < 1) {
    root.style.scrollbarGutter = ''
    return
  }

  const hasVerticalScrollbar = root.scrollHeight > window.innerHeight
  root.style.scrollbarGutter = hasVerticalScrollbar ? 'stable' : 'unset'
}

export function registerOpenModal(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  openModalCount += 1
  syncRootScrollbarGutter()

  const handleResize = () => {
    syncRootScrollbarGutter()
  }

  window.addEventListener('resize', handleResize)

  return () => {
    window.removeEventListener('resize', handleResize)
    openModalCount = Math.max(0, openModalCount - 1)
    syncRootScrollbarGutter()
  }
}
