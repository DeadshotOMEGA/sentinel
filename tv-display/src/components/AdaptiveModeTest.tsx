import { useState } from 'react';
import { Button, Slider } from '@heroui/react';
import { AdaptivePresenceView } from './AdaptivePresenceView';
import type { PresentMember, ActiveVisitor } from '../hooks/usePresenceData';

/**
 * Test component to demonstrate adaptive display modes
 * Use this to verify the three modes work correctly
 */
export function AdaptiveModeTest() {
  const [count, setCount] = useState(20);

  // Generate mock members
  const generateMembers = (count: number): PresentMember[] => {
    const divisions = ['Command', 'Operations', 'Engineering', 'Logistics', 'Admin'];
    const ranks = ['Cdr', 'LCdr', 'Lt(N)', 'SLt', 'A/SLt', 'CPO2', 'PO1', 'PO2', 'LS', 'AB'];
    const messes = ['Wardroom', 'C&POs', 'Junior Ranks'];
    const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Amanda', 'James', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

    return Array.from({ length: count }, (_, i) => ({
      id: `member-${i}`,
      firstName: firstNames[i % firstNames.length],
      lastName: `${lastNames[i % lastNames.length]}-${Math.floor(i / 10)}`,
      rank: ranks[i % ranks.length],
      division: i < 3 ? 'Command' : divisions[(i % (divisions.length - 1)) + 1],
      mess: messes[Math.floor(i / 30) % messes.length],
      checkedInAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    }));
  };

  // Generate mock visitors
  const generateVisitors = (count: number): ActiveVisitor[] => {
    const names = ['Alice Cooper', 'Bob Dylan', 'Charlie Parker', 'Diana Ross', 'Elvis Presley'];
    const orgs = ['DND', 'CJOC', 'Contractor Inc', 'Museum Society', 'Recruiting Team'];
    const types = ['official', 'contractor', 'museum', 'recruitment', 'event'];

    return Array.from({ length: count }, (_, i) => ({
      id: `visitor-${i}`,
      name: `${names[i % names.length]} ${i}`,
      organization: orgs[i % orgs.length],
      visitType: types[i % types.length],
      checkInTime: new Date(Date.now() - Math.random() * 7200000).toISOString(),
    }));
  };

  const memberCount = Math.floor(count * 0.9); // 90% members
  const visitorCount = count - memberCount; // 10% visitors

  const presentMembers = generateMembers(memberCount);
  const activeVisitors = generateVisitors(visitorCount);
  const absent = Math.floor(count * 1.5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      {/* Test Controls */}
      <div className="fixed top-4 right-4 z-50 bg-white p-4 rounded-lg shadow-xl border-2 border-blue-500">
        <h3 className="font-bold text-lg mb-3">Mode Test Controls</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Present Count: {count}
            </label>
            <Slider
              minValue={5}
              maxValue={200}
              value={count}
              onChange={(val) => setCount(val as number)}
              className="w-full"
              data-testid="test-slider"
            />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Compact:</span>
              <span className="font-bold">≤40</span>
            </div>
            <div className="flex justify-between">
              <span>Dense:</span>
              <span className="font-bold">41-80</span>
            </div>
            <div className="flex justify-between">
              <span>Scroll:</span>
              <span className="font-bold">80+</span>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-600">
              Current: {memberCount} members + {visitorCount} visitors
            </p>
          </div>
          <div className="space-y-1">
            <Button
              color="success"
              onPress={() => setCount(20)}
              className="w-full"
              data-testid="test-compact"
            >
              Test Compact (20)
            </Button>
            <Button
              color="primary"
              onPress={() => setCount(50)}
              className="w-full"
              data-testid="test-dense"
            >
              Test Dense (50)
            </Button>
            <Button
              color="secondary"
              onPress={() => setCount(100)}
              className="w-full"
              data-testid="test-scroll"
            >
              Test Scroll (100)
            </Button>
            <Button
              color="danger"
              onPress={() => setCount(200)}
              className="w-full"
              data-testid="test-large"
            >
              Test Large (200)
            </Button>
          </div>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex h-screen">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="text-3xl font-bold text-blue-600">SENTINEL</div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-emerald-500" />
                <span className="text-lg text-gray-600">Test Mode</span>
              </div>
            </div>
          </div>

          <AdaptivePresenceView
            present={count}
            absent={absent}
            visitors={visitorCount}
            presentMembers={presentMembers}
            activeVisitors={activeVisitors}
          />
        </div>

        {/* Mock Activity Feed */}
        <div className="w-[24%] border-l border-gray-200 bg-gray-50 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Activity Feed</h2>
          <div className="space-y-2">
            <div className="border-l-4 border-l-emerald-600 bg-emerald-100 px-3 py-2 rounded-r">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-mono font-semibold">14:23</span>
                <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-600 text-white">IN</span>
              </div>
              <p className="text-base font-bold">Lt(N) John Smith</p>
            </div>
            <div className="border-l-4 border-l-blue-600 bg-blue-100 px-3 py-2 rounded-r">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-mono font-semibold">14:15</span>
                <span className="text-xs font-bold px-2 py-1 rounded bg-blue-600 text-white">VISITOR</span>
              </div>
              <p className="text-base font-bold">Alice Cooper</p>
            </div>
            <div className="border-l-4 border-l-orange-600 bg-orange-100 px-3 py-2 rounded-r">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-mono font-semibold">14:10</span>
                <span className="text-xs font-bold px-2 py-1 rounded bg-orange-600 text-white">OUT</span>
              </div>
              <p className="text-base font-bold">SLt Sarah Johnson</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
