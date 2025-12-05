import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { Letterhead } from './Letterhead';
import { PDFTable } from './PDFTable';
import { PDF_COLORS, PDF_SPACING, PDF_TYPOGRAPHY } from './ThemeUtils';

interface DailyCheckinData {
  presentFTStaff: Array<{
    serviceNumber: string;
    rank: string;
    name: string;
    division: string;
    checkInTime: string;
  }>;
  absentFTStaff: Array<{
    serviceNumber: string;
    rank: string;
    name: string;
    division: string;
  }>;
  presentReserve: Array<{
    serviceNumber: string;
    rank: string;
    name: string;
    division: string;
    checkInTime: string;
  }>;
  summary: {
    totalPresent: number;
    totalFTStaff: number;
    totalReserve: number;
    byDivision: Record<string, number>;
  };
}

interface Props {
  data: DailyCheckinData;
  generatedAt?: Date;
  pageSize?: 'LETTER' | 'A4';
}

const styles = StyleSheet.create({
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
});

export function DailyCheckinPDF({ data, generatedAt, pageSize = 'LETTER' }: Props) {
  // Transform data for tables
  const ftStaffPresentRows = data.presentFTStaff.map((member) => ({
    serviceNumber: member.serviceNumber,
    rank: member.rank,
    name: member.name,
    division: member.division,
    checkInTime: member.checkInTime,
  }));

  const ftStaffAbsentRows = data.absentFTStaff.map((member) => ({
    serviceNumber: member.serviceNumber,
    rank: member.rank,
    name: member.name,
    division: member.division,
  }));

  const reserveRows = data.presentReserve.map((member) => ({
    serviceNumber: member.serviceNumber,
    rank: member.rank,
    name: member.name,
    division: member.division,
    checkInTime: member.checkInTime,
  }));

  return (
    <Letterhead reportTitle="Daily Check-In Summary" generatedAt={generatedAt} pageSize={pageSize}>
      {/* Summary Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Present</Text>
            <Text style={styles.summaryValue}>{data.summary.totalPresent}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Full-Time Staff</Text>
            <Text style={styles.summaryValue}>{data.summary.totalFTStaff}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Reserve Members</Text>
            <Text style={styles.summaryValue}>{data.summary.totalReserve}</Text>
          </View>
          {Object.entries(data.summary.byDivision).map(([division, count]) => (
            <View key={division} style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{division}</Text>
              <Text style={styles.summaryValue}>{count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Full-Time Staff Present */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Full-Time Staff Present</Text>
        {ftStaffPresentRows.length > 0 ? (
          <PDFTable
            columns={[
              { key: 'serviceNumber', header: 'Service #', width: '15%', align: 'left' },
              { key: 'rank', header: 'Rank', width: '15%', align: 'left' },
              { key: 'name', header: 'Name', width: '35%', align: 'left' },
              { key: 'division', header: 'Division', width: '20%', align: 'left' },
              { key: 'checkInTime', header: 'Check-In', width: '15%', align: 'right' },
            ]}
            data={ftStaffPresentRows}
          />
        ) : (
          <Text style={styles.emptyMessage}>No full-time staff present</Text>
        )}
      </View>

      {/* Full-Time Staff Absent */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Full-Time Staff Absent</Text>
        {ftStaffAbsentRows.length > 0 ? (
          <PDFTable
            columns={[
              { key: 'serviceNumber', header: 'Service #', width: '20%', align: 'left' },
              { key: 'rank', header: 'Rank', width: '20%', align: 'left' },
              { key: 'name', header: 'Name', width: '40%', align: 'left' },
              { key: 'division', header: 'Division', width: '20%', align: 'left' },
            ]}
            data={ftStaffAbsentRows}
          />
        ) : (
          <Text style={styles.emptyMessage}>All full-time staff present</Text>
        )}
      </View>

      {/* Reserve Members Present */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reserve Members Present</Text>
        {reserveRows.length > 0 ? (
          <PDFTable
            columns={[
              { key: 'serviceNumber', header: 'Service #', width: '15%', align: 'left' },
              { key: 'rank', header: 'Rank', width: '15%', align: 'left' },
              { key: 'name', header: 'Name', width: '35%', align: 'left' },
              { key: 'division', header: 'Division', width: '20%', align: 'left' },
              { key: 'checkInTime', header: 'Check-In', width: '15%', align: 'right' },
            ]}
            data={reserveRows}
          />
        ) : (
          <Text style={styles.emptyMessage}>No reserve members present</Text>
        )}
      </View>
    </Letterhead>
  );
}

export default DailyCheckinPDF;
