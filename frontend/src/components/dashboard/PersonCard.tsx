import { Card, CardBody, Checkbox, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { formatDistanceToNow } from 'date-fns';
import type { PresentPerson, AlertSeverity } from '../../../../shared/types';

interface PersonCardProps {
  person: PresentPerson;
  selectMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPress: (person: PresentPerson) => void;
  isHighlighted?: boolean;
}

// Parse name into first and last parts
function parseName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

function getAlertIcon(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return 'mdi:alert-circle';
    case 'warning':
      return 'mdi:alert';
    case 'info':
      return 'mdi:information';
  }
}

function getAlertColorClass(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return 'text-danger animate-pulse';
    case 'warning':
      return 'text-warning';
    case 'info':
      return 'text-primary';
  }
}

export default function PersonCard({
  person,
  selectMode,
  isSelected,
  onSelect,
  onPress,
  isHighlighted = false,
}: PersonCardProps) {
  const isMember = person.type === 'member';
  const chipColor = isMember ? 'success' : 'primary';
  const chipLabel = isMember ? 'Member' : 'Visitor';

  const borderClassName = isSelected
    ? 'border-2 border-primary'
    : isHighlighted
    ? 'ring-2 ring-warning'
    : '';

  const activeAlerts = person.alerts?.filter(
    (alert) => !alert.dismissedAt && (!alert.expiresAt || new Date(alert.expiresAt) > new Date())
  ) || [];
  const highestSeverityAlert = activeAlerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  })[0];

  // Parse name for display
  const { firstName, lastName } = parseName(person.name);

  return (
    <Card
      isPressable
      isHoverable
      shadow="sm"
      className={`${borderClassName} border border-default-200`}
      onPress={() => onPress(person)}
      data-testid="person-card"
    >
      <CardBody className="py-2 px-3">
        <div className="flex items-start gap-2 relative">
          {/* Alert Indicator */}
          {highestSeverityAlert && (
            <div className="absolute top-0 right-0 flex items-center gap-1">
              <Icon
                icon={getAlertIcon(highestSeverityAlert.severity)}
                className={getAlertColorClass(highestSeverityAlert.severity)}
                width={18}
              />
              {activeAlerts.length > 1 && (
                <span className="text-xs font-medium text-default-600">
                  {activeAlerts.length}
                </span>
              )}
            </div>
          )}

          {selectMode && (
            <Checkbox
              isSelected={isSelected}
              onValueChange={() => onSelect(person.id)}
              onClick={(e) => e.stopPropagation()}
              size="sm"
            />
          )}

          <div className="flex-1 min-w-0">
            {/* Name display - different for members vs visitors */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0" data-testid="person-name">
                {isMember ? (
                  <>
                    <p className="font-medium truncate">
                      {person.rank && `${person.rank} `}{lastName}
                    </p>
                    <p className="text-sm text-default-500 truncate">{firstName}</p>
                  </>
                ) : (
                  <p className="font-medium truncate">{person.name}</p>
                )}
              </div>
              <Chip size="sm" variant="flat" color={chipColor} className="shrink-0" data-testid="person-type-badge">
                {chipLabel}
              </Chip>
            </div>

            {isMember ? (
              <>
                {person.division && (
                  <p className="text-xs text-default-400 truncate">
                    {person.division}
                  </p>
                )}
              </>
            ) : (
              <>
                {person.organization && (
                  <p className="text-sm text-default-500 truncate">
                    {person.organization}
                  </p>
                )}
                {person.visitReason && (
                  <p className="text-xs text-default-400 truncate">
                    {person.visitReason}
                  </p>
                )}
                {person.hostName && (
                  <p className="text-xs text-default-400 truncate">
                    Host: {person.hostName}
                  </p>
                )}
              </>
            )}

            <p className="text-xs text-default-400 mt-1">
              {formatDistanceToNow(person.checkInTime, { addSuffix: true })}
              {person.kioskName && ` • ${person.kioskName}`}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
