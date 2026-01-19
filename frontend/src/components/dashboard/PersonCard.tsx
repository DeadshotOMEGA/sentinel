import { Card, CardHeader, CardBody, CardFooter, Checkbox, Chip, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { formatDistanceToNow, format } from 'date-fns';
import type { PresentPerson, AlertSeverity } from '../../../../shared/types';
import { TruncatedText, StatusTooltip, TagChip } from '@sentinel/ui';

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
      return 'mdi:flag';
    case 'warning':
      return 'mdi:flag';
    case 'info':
      return 'mdi:flag';
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

function getTooltipSeverity(severity: AlertSeverity): 'danger' | 'warning' | 'default' {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'info':
      return 'default';
  }
}

export default function PersonCard({
  person,
  selectMode,
  isSelected,
  onSelect,
  onPress,
}: PersonCardProps) {
  const isMember = person.type === 'member';
  const chipColor = isMember ? 'success' : 'primary';
  const chipLabel = isMember ? 'Member' : 'Visitor';

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
      shadow="lg"
      onPress={() => onPress(person)}
      data-testid="person-card"
      className="border border-default-100"
    >
      {/* Alert Flag Indicator */}
      {highestSeverityAlert && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
          <StatusTooltip
            severity={getTooltipSeverity(highestSeverityAlert.severity)}
            title={activeAlerts.length > 1 ? `${activeAlerts.length} Active Alerts` : 'Alert'}
            description={activeAlerts.map(a => a.message).join('; ')}
          >
            <span className="cursor-help">
              <Icon
                icon={getAlertIcon(highestSeverityAlert.severity)}
                className={getAlertColorClass(highestSeverityAlert.severity)}
                width={18}
              />
            </span>
          </StatusTooltip>
          {activeAlerts.length > 1 && (
            <span className="text-xs font-medium text-default-600">
              {activeAlerts.length}
            </span>
          )}
        </div>
      )}

      <CardHeader className="px-3 py-2 flex items-start gap-2">
        {selectMode && (
          <Checkbox
            isSelected={isSelected}
            onValueChange={() => onSelect(person.id)}
            onClick={(e) => e.stopPropagation()}
            size="sm"
          />
        )}

        <div className="flex-1 min-w-0" data-testid="person-name">
          {isMember ? (
            <>
              <TruncatedText
                content={`${person.rank ? `${person.rank} ` : ''}${lastName}`}
                className="font-semibold text-base truncate block"
                as="p"
              />
              <TruncatedText
                content={firstName}
                className="text-sm text-default-600 truncate block"
                as="p"
              />
            </>
          ) : (
            <>
              <TruncatedText
                content={person.name}
                className="font-semibold text-base truncate block"
                as="p"
              />
              {person.organization && (
                <TruncatedText
                  content={person.organization}
                  className="text-sm text-default-600 truncate block"
                  as="p"
                />
              )}
            </>
          )}
        </div>
      </CardHeader>

      <CardBody className="px-3 py-1 flex flex-col gap-0.5">
        {isMember ? (
          <>
            {person.tags && person.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {person.tags.map((tag) => (
                  <TagChip
                    key={tag.id}
                    tagName={tag.name}
                    tagColor={tag.color as 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default' | 'gray' | 'info' | 'accent'}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {person.eventName && (
              <TruncatedText
                content={person.eventName}
                className="text-sm text-default-600 truncate block"
                as="p"
              />
            )}
            {person.hostName && (
              <TruncatedText
                content={`Host: ${person.hostName}`}
                className="text-sm text-default-500 truncate block"
                as="p"
              />
            )}
          </>
        )}
      </CardBody>

      <CardFooter className="px-3 py-1.5 bg-default-100 flex items-center justify-between">
        <Tooltip
          content={
            <div className="px-1 py-2">
              {person.kioskName && (
                <div className="text-small font-bold">{person.kioskName}</div>
              )}
              <div className="text-tiny">{format(person.checkInTime, 'PPpp')}</div>
            </div>
          }
        >
          <p className="text-xs text-default-500 cursor-help inline-block">
            {formatDistanceToNow(person.checkInTime, { addSuffix: true })}
          </p>
        </Tooltip>

        <Tooltip content={isMember ? 'Unit member' : 'Visitor to the unit'}>
          <Chip size="sm" variant="bordered" color={chipColor} className="shrink-0 h-5 text-tiny" data-testid="person-type-badge">
            {chipLabel}
          </Chip>
        </Tooltip>
      </CardFooter>
    </Card>
  );
}
