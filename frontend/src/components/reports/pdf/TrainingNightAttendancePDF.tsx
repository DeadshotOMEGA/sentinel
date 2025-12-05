import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { Letterhead } from './Letterhead';
import { PDFTable } from './PDFTable';
import {
  PDF_COLORS,
  PDF_SPACING,
  PDF_TYPOGRAPHY,
  getThresholdColor,
  getTrendSymbol,
  getTrendColor,
} from './ThemeUtils';
import type { TrainingNightAttendanceData, OrganizationOption } from '@shared/types/reports';

interface Props {
  data: TrainingNightAttendanceData[];
  periodStart: string;
  periodEnd: string;
  organizationOption: OrganizationOption;
  generatedAt?: Date;
  pageSize?: 'LETTER' | 'A4';
}

const styles = StyleSheet.create({
  periodHeader: {
    ...PDF_TYPOGRAPHY.body,
    color: PDF_COLORS.textMuted,
    marginBottom: PDF_SPACING.md,
  },
  badge: {
    backgroundColor: PDF_COLORS.primary,
    color: 'white',
    fontSize: 7,
    padding: '2 4',
    borderRadius: 3,
    marginLeft: 4,
  },
  badgeBMQ: {
    backgroundColor: PDF_COLORS.accent,
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
  emptyMessage: {
    ...PDF_TYPOGRAPHY.body,
    color: PDF_COLORS.textMuted,
    fontStyle: 'italic',
    padding: PDF_SPACING.md,
    textAlign: 'center',
  },
  cellContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export function TrainingNightAttendancePDF({
  data,
  periodStart,
  periodEnd,
  organizationOption,
  generatedAt,
  pageSize = 'LETTER',
}: Props) {
  if (data.length === 0) {
    return (
      <Letterhead reportTitle="Training Night Attendance" generatedAt={generatedAt} pageSize={pageSize}>
        <Text style={styles.periodHeader}>
          Period: {new Date(periodStart).toLocaleDateString('en-CA')} - {new Date(periodEnd).toLocaleDateString('en-CA')}
        </Text>
        <Text style={styles.emptyMessage}>No attendance data available for this period</Text>
      </Letterhead>
    );
  }

  // Group by division if needed
  const shouldGroupByDivision =
    organizationOption === 'grouped_by_division' || organizationOption === 'separated_by_division';

  const renderAttendanceTable = (members: TrainingNightAttendanceData[]) => {
    const rows = members.map((member) => {
      // Format name with badges
      const nameParts: React.ReactNode[] = [
        <Text key="name">
          {member.member.rank} {member.member.lastName}, {member.member.firstName}
        </Text>,
      ];

      // Add "New" badge if recently enrolled
      const enrollmentAge = Date.now() - new Date(member.enrollmentDate).getTime();
      const fourWeeksInMs = 4 * 7 * 24 * 60 * 60 * 1000;
      if (member.attendance.status === 'new' || enrollmentAge < fourWeeksInMs) {
        nameParts.push(
          <Text key="badge-new" style={styles.badge}>
            New
          </Text>
        );
      }

      // Add "BMQ" badge if enrolled
      if (member.isBMQEnrolled) {
        nameParts.push(
          <Text key="badge-bmq" style={[styles.badge, styles.badgeBMQ]}>
            BMQ
          </Text>
        );
      }

      // Format attendance
      let attendanceDisplay: React.ReactNode;
      if (member.attendance.status === 'new') {
        attendanceDisplay = <Text style={{ color: PDF_COLORS.textMuted }}>New</Text>;
      } else if (member.attendance.status === 'insufficient_data') {
        if (!member.attendance.display) {
          throw new Error('Attendance display is required for insufficient_data status');
        }
        attendanceDisplay = (
          <Text style={{ color: PDF_COLORS.textMuted }}>{member.attendance.display}</Text>
        );
      } else if (member.attendance.status === 'calculated' && member.attendance.percentage !== undefined) {
        if (!member.attendance.flag) {
          throw new Error('Attendance flag is required for calculated status');
        }
        const color = getThresholdColor(member.attendance.flag);
        attendanceDisplay = (
          <Text style={{ color }}>
            {member.attendance.percentage.toFixed(1)}%
            {member.attendance.attended !== undefined && member.attendance.possible !== undefined
              ? ` (${member.attendance.attended}/${member.attendance.possible})`
              : ''}
          </Text>
        );
      } else {
        attendanceDisplay = <Text style={{ color: PDF_COLORS.textMuted }}>N/A</Text>;
      }

      // Format trend
      let trendDisplay: React.ReactNode;
      if (member.trend && member.trend.trend !== 'none') {
        const trendSymbol = getTrendSymbol(member.trend.trend);
        const trendColor = getTrendColor(member.trend.trend);
        const deltaText = member.trend.delta
          ? ` ${member.trend.delta > 0 ? '+' : ''}${member.trend.delta.toFixed(1)}%`
          : '';
        trendDisplay = (
          <Text style={{ color: trendColor }}>
            {trendSymbol}
            {deltaText}
          </Text>
        );
      } else {
        trendDisplay = <Text style={{ color: PDF_COLORS.textMuted }}>-</Text>;
      }

      return {
        serviceNumber: member.member.serviceNumber,
        name: <View style={styles.cellContent}>{nameParts}</View>,
        division: member.member.division.name,
        attendance: attendanceDisplay,
        trend: trendDisplay,
      };
    });

    return (
      <PDFTable
        columns={[
          { key: 'serviceNumber', header: 'Service #', width: '15%', align: 'left' },
          { key: 'name', header: 'Name', width: '35%', align: 'left' },
          { key: 'division', header: 'Division', width: '15%', align: 'left' },
          { key: 'attendance', header: 'Attendance', width: '20%', align: 'right' },
          { key: 'trend', header: 'Trend', width: '15%', align: 'right' },
        ]}
        data={rows}
      />
    );
  };

  return (
    <Letterhead reportTitle="Training Night Attendance" generatedAt={generatedAt} pageSize={pageSize}>
      <Text style={styles.periodHeader}>
        Period: {new Date(periodStart).toLocaleDateString('en-CA')} - {new Date(periodEnd).toLocaleDateString('en-CA')}
      </Text>

      {shouldGroupByDivision ? (
        // Group by division
        (() => {
          const divisions = new Map<string, TrainingNightAttendanceData[]>();
          data.forEach((member) => {
            const divisionName = member.member.division.name;
            if (!divisions.has(divisionName)) {
              divisions.set(divisionName, []);
            }
            divisions.get(divisionName)!.push(member);
          });

          return Array.from(divisions.entries()).map(([divisionName, members]) => (
            <View key={divisionName} style={styles.divisionSection} break={organizationOption === 'separated_by_division'}>
              <Text style={styles.divisionTitle}>{divisionName}</Text>
              {renderAttendanceTable(members)}
            </View>
          ));
        })()
      ) : (
        // Single table
        renderAttendanceTable(data)
      )}
    </Letterhead>
  );
}

export default TrainingNightAttendancePDF;
