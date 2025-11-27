import { useEffect } from 'react';
import { useKioskStore } from './state/kiosk-state';
import { syncService } from './services/sync-service';
import { useBadgeScanner } from './hooks/useBadgeScanner';
import SyncStatus from './components/SyncStatus';
import IdleScreen from './screens/IdleScreen';
import ScanningScreen from './screens/ScanningScreen';
import SuccessScreen from './screens/SuccessScreen';
import ErrorScreen from './screens/ErrorScreen';
import VisitorScreen from './screens/VisitorScreen';
import VisitorSuccessScreen from './screens/VisitorSuccessScreen';
import EventSelectionScreen from './screens/EventSelectionScreen';

export default function App() {
  const { currentScreen } = useKioskStore();

  // Initialize badge scanner (listens for NFC keyboard input)
  useBadgeScanner();

  // Initialize sync service on mount
  useEffect(() => {
    syncService.startSync();
    return () => {
      syncService.stopSync();
    };
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'idle':
        return <IdleScreen />;
      case 'scanning':
        return <ScanningScreen />;
      case 'success':
        return <SuccessScreen />;
      case 'error':
        return <ErrorScreen />;
      case 'visitor':
        return <VisitorScreen />;
      case 'visitor-success':
        return <VisitorSuccessScreen />;
      case 'event-selection':
        return <EventSelectionScreen />;
      default:
        return <IdleScreen />;
    }
  };

  return (
    <>
      <SyncStatus />
      {renderScreen()}
    </>
  );
}
