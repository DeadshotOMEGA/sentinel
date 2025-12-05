import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { Letterhead } from './Letterhead';
import { PDFTable } from './PDFTable';
import { PDF_COLORS, PDF_SPACING, PDF_TYPOGRAPHY } from './ThemeUtils';

interface PersonnelMember {
  serviceNumber: string;
  rank: string;
  firstName: string;
  lastName: string;
  division: string;
  classification: string;
  enrollmentDate: string;
}

interface Props {
  data: PersonnelMember[];
  divisionFilter?: string;
  sortOrder: 'division_rank' | 'rank' | 'alphabetical';
  generatedAt?: Date;
  pageSize?: 'LETTER' | 'A4';
}

const styles = StyleSheet.create({
  subtitle: {
    ...PDF_TYPOGRAPHY.body,
    color: PDF_COLORS.textMuted,
    marginBottom: PDF_SPACING.md,
  },
  emptyMessage: {
    ...PDF_TYPOGRAPHY.body,
    color: PDF_COLORS.textMuted,
    fontStyle: 'italic',
    padding: PDF_SPACING.md,
    textAlign: 'center',
  },
  divisionSection: {
    marginBottom: PDF_SPACING.xl,
  },
  divisionTitle: {
    ...PDF_TYPOGRAPHY.subtitle,
    color: PDF_COLORS.primary,
    marginBottom: PDF_SPACING.sm,
    borderBottom: `1 solid ${PDF_COLORS.border}`,
    paddingBottom: PDF_SPACING.xs,
  },
});

export function PersonnelRosterPDF({
  data,
  divisionFilter,
  sortOrder,
  generatedAt,
  pageSize = 'LETTER',
}: Props) {
  if (data.length === 0) {
    return (
      <Letterhead reportTitle="Personnel Roster" generatedAt={generatedAt} pageSize={pageSize}>
        {divisionFilter && <Text style={styles.subtitle}>Division: {divisionFilter}</Text>}
        <Text style={styles.emptyMessage}>No active members found</Text>
      </Letterhead>
    );
  }

  const renderRosterTable = (members: PersonnelMember[]) => {
    const rows = members.map((member) => ({
      serviceNumber: member.serviceNumber,
      rank: member.rank,
      name: `${member.lastName}, ${member.firstName}`,
      division: member.division,
      classification: member.classification,
      enrollmentDate: new Date(member.enrollmentDate).toLocaleDateString('en-CA'),
    }));

    return (
      <PDFTable
        columns={[
          { key: 'serviceNumber', header: 'Service #', width: '12%', align: 'left' },
          { key: 'rank', header: 'Rank', width: '12%', align: 'left' },
          { key: 'name', header: 'Name', width: '28%', align: 'left' },
          { key: 'division', header: 'Division', width: '15%', align: 'left' },
          { key: 'classification', header: 'Classification', width: '18%', align: 'left' },
          { key: 'enrollmentDate', header: 'Enrolled', width: '15%', align: 'right' },
        ]}
        data={rows}
      />
    );
  };

  // Determine if we should group by division
  const shouldGroupByDivision = sortOrder === 'division_rank' && !divisionFilter;

  const subtitle = divisionFilter
    ? `Division: ${divisionFilter}`
    : `Sort Order: ${sortOrder === 'division_rank' ? 'Division, then Rank' : sortOrder === 'rank' ? 'Rank' : 'Alphabetical'}`;

  return (
    <Letterhead reportTitle="Personnel Roster" generatedAt={generatedAt} pageSize={pageSize}>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {shouldGroupByDivision ? (
        // Group by division
        (() => {
          const divisions = new Map<string, PersonnelMember[]>();
          data.forEach((member) => {
            const divisionName = member.division;
            if (!divisions.has(divisionName)) {
              divisions.set(divisionName, []);
            }
            divisions.get(divisionName)!.push(member);
          });

          return Array.from(divisions.entries()).map(([divisionName, members]) => (
            <View key={divisionName} style={styles.divisionSection}>
              <Text style={styles.divisionTitle}>{divisionName}</Text>
              {renderRosterTable(members)}
            </View>
          ));
        })()
      ) : (
        // Single table
        renderRosterTable(data)
      )}
    </Letterhead>
  );
}

export default PersonnelRosterPDF;
