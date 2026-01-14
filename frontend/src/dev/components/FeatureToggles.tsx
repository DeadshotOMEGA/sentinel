import { useMemo } from 'react';
import { Switch, Chip, Button, Divider } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useDevStore } from '../store/dev-store';
import type { FeatureToggle } from '@shared/types/dev-mode';

// ============================================================================
// Category Configuration
// ============================================================================

const categoryConfig = {
  network: {
    label: 'Network',
    icon: 'solar:routing-2-bold',
    color: 'primary' as const,
  },
  ui: {
    label: 'UI',
    icon: 'solar:palette-bold',
    color: 'success' as const,
  },
  debug: {
    label: 'Debug',
    icon: 'solar:bug-bold',
    color: 'warning' as const,
  },
};

// ============================================================================
// Category Group Component
// ============================================================================

interface FeatureToggleCategoryProps {
  category: FeatureToggle['category'];
  toggles: FeatureToggle[];
  onToggle: (key: string) => void;
}

function FeatureToggleCategory({
  category,
  toggles,
  onToggle,
}: FeatureToggleCategoryProps) {
  const config = categoryConfig[category];

  return (
    <div className="space-y-2">
      {/* Category header */}
      <div className="flex items-center gap-2 px-1">
        <Icon icon={config.icon} width={16} className="text-default-500" />
        <span className="text-xs font-semibold text-default-600 uppercase tracking-wider">
          {config.label}
        </span>
        <Chip
          size="sm"
          variant="flat"
          color={config.color}
          className="ml-auto text-[10px] h-5"
        >
          {toggles.length}
        </Chip>
      </div>

      {/* Toggle items */}
      <div className="space-y-1 px-1">
        {toggles.map((toggle) => (
          <div
            key={toggle.key}
            className="flex items-start justify-between gap-3 rounded-lg border border-default-200 bg-default-50 p-3 hover:bg-default-100 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-default-700">
                  {toggle.label}
                </span>
              </div>
              <p className="text-xs text-default-500 mt-0.5">{toggle.description}</p>
            </div>
            <Switch
              size="sm"
              isSelected={toggle.enabled}
              onValueChange={() => onToggle(toggle.key)}
              aria-label={`Toggle ${toggle.label}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main FeatureToggles Component
// ============================================================================

export function FeatureToggles() {
  const { featureToggles, toggleFeature, resetToDefaults } = useDevStore();

  // Group toggles by category
  const togglesByCategory = useMemo(() => {
    const groups: Record<FeatureToggle['category'], FeatureToggle[]> = {
      network: [],
      ui: [],
      debug: [],
    };

    featureToggles.forEach((toggle) => {
      groups[toggle.category].push(toggle);
    });

    return groups;
  }, [featureToggles]);

  // Count active toggles
  const activeCount = useMemo(
    () => featureToggles.filter((t) => t.enabled).length,
    [featureToggles]
  );

  const handleResetAll = () => {
    resetToDefaults();
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Active indicator */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-default-600">
          <span className="font-semibold text-default-700">{activeCount}</span>{' '}
          active {activeCount === 1 ? 'toggle' : 'toggles'}
        </div>
        <Button
          size="sm"
          variant="flat"
          color="default"
          className="text-xs h-7"
          onPress={handleResetAll}
          startContent={<Icon icon="solar:refresh-bold" width={14} />}
        >
          Reset
        </Button>
      </div>

      <Divider className="my-1" />

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto -mx-3 px-3 space-y-4">
        {/* Network category */}
        {togglesByCategory.network.length > 0 && (
          <FeatureToggleCategory
            category="network"
            toggles={togglesByCategory.network}
            onToggle={toggleFeature}
          />
        )}

        {/* UI category */}
        {togglesByCategory.ui.length > 0 && (
          <FeatureToggleCategory
            category="ui"
            toggles={togglesByCategory.ui}
            onToggle={toggleFeature}
          />
        )}

        {/* Debug category */}
        {togglesByCategory.debug.length > 0 && (
          <FeatureToggleCategory
            category="debug"
            toggles={togglesByCategory.debug}
            onToggle={toggleFeature}
          />
        )}

        {featureToggles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-default-400">
            <Icon icon="solar:settings-bold" width={32} className="mb-2" />
            <p className="text-sm">No toggles available</p>
          </div>
        )}
      </div>
    </div>
  );
}
