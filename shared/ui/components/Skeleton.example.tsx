/**
 * Example usage of skeleton loading components
 *
 * This file demonstrates all skeleton variants available in the Sentinel design system.
 */

import { Skeleton } from './Skeleton';
import { TableSkeleton } from './TableSkeleton';
import { CardSkeleton } from './CardSkeleton';

export function SkeletonExamples() {
  return (
    <div className="space-y-8 p-8">
      <section>
        <h2 className="text-xl font-bold mb-4">Base Skeleton</h2>
        <div className="space-y-3">
          <Skeleton width="200px" height="20px" />
          <Skeleton width="150px" height="20px" />
          <Skeleton width="100px" height="20px" />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Skeleton Variants</h2>
        <div className="space-y-3">
          <Skeleton width="100px" height="40px" rounded="none" />
          <Skeleton width="100px" height="40px" rounded="sm" />
          <Skeleton width="100px" height="40px" rounded="md" />
          <Skeleton width="100px" height="40px" rounded="lg" />
          <Skeleton width="40px" height="40px" rounded="full" />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Table Skeleton</h2>
        <TableSkeleton rows={3} columns={4} />
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Table Skeleton (Large)</h2>
        <TableSkeleton rows={10} columns={6} />
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Card Skeletons</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton showIcon lines={2} />
          <CardSkeleton showIcon={false} lines={3} />
          <CardSkeleton showIcon lines={4} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Loading State Pattern</h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Typical usage pattern with loading states:
          </p>
          <div className="bg-gray-50 p-4 rounded">
            <pre className="text-xs">
{`// Table loading state
{isLoading ? (
  <TableSkeleton rows={5} columns={4} />
) : (
  <Table>...</Table>
)}

// Card grid loading state
{isLoading ? (
  <div className="grid grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <CardSkeleton key={i} showIcon lines={2} />
    ))}
  </div>
) : (
  renderCards()
)}`}
            </pre>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Accessibility & Motion</h2>
        <div className="bg-blue-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Features:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>All skeletons have <code>aria-hidden="true"</code></li>
            <li>Container skeletons have <code>role="status"</code> with descriptive labels</li>
            <li>Screen reader text provides context about loading state</li>
            <li>
              Respects <code>prefers-reduced-motion</code> - pulse animation disabled for
              users with motion sensitivity
            </li>
            <li>Optimized for Raspberry Pi performance</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
