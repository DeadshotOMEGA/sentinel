import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { Letterhead } from './Letterhead';
import { PDFTable } from './PDFTable';
import { PDF_COLORS, PDF_SPACING, PDF_TYPOGRAPHY } from './ThemeUtils';

interface VisitorRecord {
  name: string;
  organization: string;
  visitType: string;
  purpose: string;
  host: string;
  checkInTime: string;
  checkOutTime: string | null;
  duration: string;
}

interface VisitorSummary {
  totalVisitors: number;
  totalVisits: number;
  averageDuration: string;
  byType: Record<string, number>;
  byOrganization: Record<string, number>;
}

interface Props {
  data: VisitorRecord[];
  summary: VisitorSummary;
  startDate: string;
  endDate: string;
  visitTypeFilter?: string;
  organizationFilter?: string;
  generatedAt?: Date;
  pageSize?: 'LETTER' | 'A4';
}

const styles = StyleSheet.create({
  periodHeader: {
    ...PDF_TYPOGRAPHY.body,
    color: PDF_COLORS.textMuted,
    marginBottom: PDF_SPACING.md,
  },
  section: {
    marginBottom: PDF_SPACING.lg,
  },
  sectionTitle: {
    ...PDF_TYPOGRAPHY.subtitle,
    color: PDF_COLORS.primary,
    marginBottom: PDF_SPACING.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: PDF_SPACING.lg,
    padding: PDF_SPACING.md,
    backgroundColor: PDF_COLORS.backgroundAlt,
    borderRadius: 4,
  },
  summaryItem: {
    width: '50%',
    marginBottom: PDF_SPACING.sm,
  },
  summaryLabel: {
    ...PDF_TYPOGRAPHY.small,
    color: PDF_COLORS.textMuted,
  },
  summaryValue: {
    ...PDF_TYPOGRAPHY.subtitle,
    color: PDF_COLORS.text,
  },
  emptyMessage: {
    ...PDF_TYPOGRAPHY.body,
    color: PDF_COLORS.textMuted,
    fontStyle: 'italic',
    padding: PDF_SPACING.md,
    textAlign: 'center',
  },
  activeVisit: {
    color: PDF_COLORS.warning,
    fontStyle: 'italic',
  },
});

export function VisitorSummaryPDF({
  data,
  summary,
  startDate,
  endDate,
  visitTypeFilter,
  organizationFilter,
  generatedAt,
  pageSize = 'LETTER',
}: Props) {
  const filterText = [
    visitTypeFilter && `Type: ${visitTypeFilter}`,
    organizationFilter && `Organization: ${organizationFilter}`,
  ]
    .filter(Boolean)
    .join(' | ');

  if (data.length === 0) {
    return (
      <Letterhead reportTitle="Visitor Activity Summary" generatedAt={generatedAt} pageSize={pageSize}>
        <Text style={styles.periodHeader}>
          Period: {new Date(startDate).toLocaleDateString('en-CA')} - {new Date(endDate).toLocaleDateString('en-CA')}
        </Text>
        {filterText && <Text style={styles.periodHeader}>{filterText}</Text>}
        <Text style={styles.emptyMessage}>No visitor activity during this period</Text>
      </Letterhead>
    );
  }

  const rows = data.map((visitor) => ({
    name: visitor.name,
    organization: visitor.organization,
    visitType: visitor.visitType,
    purpose: visitor.purpose,
    host: visitor.host,
    checkInTime: new Date(visitor.checkInTime).toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    checkOutTime: visitor.checkOutTime ? (
      new Date(visitor.checkOutTime).toLocaleString('en-CA', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    ) : (
      <Text style={styles.activeVisit}>Active</Text>
    ),
    duration: visitor.duration,
  }));

  return (
    <Letterhead reportTitle="Visitor Activity Summary" generatedAt={generatedAt} pageSize={pageSize}>
      <Text style={styles.periodHeader}>
        Period: {new Date(startDate).toLocaleDateString('en-CA')} - {new Date(endDate).toLocaleDateString('en-CA')}
      </Text>
      {filterText && <Text style={styles.periodHeader}>{filterText}</Text>}

      {/* Summary Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Visits</Text>
            <Text style={styles.summaryValue}>{summary.totalVisits}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Unique Visitors</Text>
            <Text style={styles.summaryValue}>{summary.totalVisitors}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Average Duration</Text>
            <Text style={styles.summaryValue}>{summary.averageDuration}</Text>
          </View>
        </View>

        {/* By Type */}
        {Object.keys(summary.byType).length > 0 && (
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryItem, { width: '100%', marginBottom: PDF_SPACING.xs }]}>
              <Text style={styles.summaryLabel}>By Visit Type</Text>
            </View>
            {Object.entries(summary.byType).map(([type, count]) => (
              <View key={type} style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{type}</Text>
                <Text style={styles.summaryValue}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* By Organization */}
        {Object.keys(summary.byOrganization).length > 0 && (
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryItem, { width: '100%', marginBottom: PDF_SPACING.xs }]}>
              <Text style={styles.summaryLabel}>By Organization</Text>
            </View>
            {Object.entries(summary.byOrganization).map(([org, count]) => (
              <View key={org} style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{org}</Text>
                <Text style={styles.summaryValue}>{count}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Visitor Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Visitor Details</Text>
        <PDFTable
          columns={[
            { key: 'name', header: 'Name', width: '15%', align: 'left' },
            { key: 'organization', header: 'Organization', width: '15%', align: 'left' },
            { key: 'visitType', header: 'Type', width: '10%', align: 'left' },
            { key: 'purpose', header: 'Purpose', width: '15%', align: 'left' },
            { key: 'host', header: 'Host', width: '12%', align: 'left' },
            { key: 'checkInTime', header: 'Check-In', width: '11%', align: 'right' },
            { key: 'checkOutTime', header: 'Check-Out', width: '11%', align: 'right' },
            { key: 'duration', header: 'Duration', width: '11%', align: 'right' },
          ]}
          data={rows}
        />
      </View>
    </Letterhead>
  );
}

export default VisitorSummaryPDF;
