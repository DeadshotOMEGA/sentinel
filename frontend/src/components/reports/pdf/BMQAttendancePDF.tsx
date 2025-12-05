import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { Letterhead } from './Letterhead';
import { PDFTable } from './PDFTable';
import { PDF_COLORS, PDF_SPACING, PDF_TYPOGRAPHY, getThresholdColor } from './ThemeUtils';
import type { BMQAttendanceData } from '@shared/types/reports';

interface Props {
  data: BMQAttendanceData[];
  courseName: string;
  courseStartDate: string;
  courseEndDate: string;
  generatedAt?: Date;
  pageSize?: 'LETTER' | 'A4';
}

const styles = StyleSheet.create({
  courseHeader: {
    ...PDF_TYPOGRAPHY.body,
    color: PDF_COLORS.textMuted,
    marginBottom: PDF_SPACING.md,
  },
  courseName: {
    ...PDF_TYPOGRAPHY.subtitle,
    color: PDF_COLORS.primary,
    marginBottom: PDF_SPACING.xs,
  },
  emptyMessage: {
    ...PDF_TYPOGRAPHY.body,
    color: PDF_COLORS.textMuted,
    fontStyle: 'italic',
    padding: PDF_SPACING.md,
    textAlign: 'center',
  },
  statusBadge: {
    fontSize: 7,
    padding: '2 4',
    borderRadius: 3,
    marginLeft: 4,
  },
  statusEnrolled: {
    backgroundColor: PDF_COLORS.primary,
    color: 'white',
  },
  statusCompleted: {
    backgroundColor: PDF_COLORS.success,
    color: 'white',
  },
  statusWithdrawn: {
    backgroundColor: PDF_COLORS.danger,
    color: 'white',
  },
  cellContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export function BMQAttendancePDF({
  data,
  courseName,
  courseStartDate,
  courseEndDate,
  generatedAt,
  pageSize = 'LETTER',
}: Props) {
  if (data.length === 0) {
    return (
      <Letterhead reportTitle="BMQ Attendance Report" generatedAt={generatedAt} pageSize={pageSize}>
        <Text style={styles.courseName}>{courseName}</Text>
        <Text style={styles.courseHeader}>
          {new Date(courseStartDate).toLocaleDateString('en-CA')} -{' '}
          {new Date(courseEndDate).toLocaleDateString('en-CA')}
        </Text>
        <Text style={styles.emptyMessage}>No students enrolled in this course</Text>
      </Letterhead>
    );
  }

  const rows = data.map((student) => {
    // Format name with status badge
    const nameParts: React.ReactNode[] = [
      <Text key="name">
        {student.member.rank} {student.member.lastName}, {student.member.firstName}
      </Text>,
    ];

    // Add status badge
    let badgeStyle = styles.statusEnrolled;
    if (student.enrollment.status === 'completed') {
      badgeStyle = styles.statusCompleted;
    } else if (student.enrollment.status === 'withdrawn') {
      badgeStyle = styles.statusWithdrawn;
    }

    nameParts.push(
      <Text key="badge-status" style={[styles.statusBadge, badgeStyle]}>
        {student.enrollment.status.charAt(0).toUpperCase() + student.enrollment.status.slice(1)}
      </Text>
    );

    // Format attendance
    let attendanceDisplay: React.ReactNode;
    if (student.attendance.status === 'insufficient_data') {
      if (!student.attendance.display) {
        throw new Error('Attendance display is required for insufficient_data status');
      }
      attendanceDisplay = (
        <Text style={{ color: PDF_COLORS.textMuted }}>{student.attendance.display}</Text>
      );
    } else if (student.attendance.status === 'calculated' && student.attendance.percentage !== undefined) {
      if (!student.attendance.flag) {
        throw new Error('Attendance flag is required for calculated status');
      }
      const color = getThresholdColor(student.attendance.flag);
      attendanceDisplay = (
        <Text style={{ color }}>
          {student.attendance.percentage.toFixed(1)}%
          {student.attendance.attended !== undefined && student.attendance.possible !== undefined
            ? ` (${student.attendance.attended}/${student.attendance.possible})`
            : ''}
        </Text>
      );
    } else {
      attendanceDisplay = <Text style={{ color: PDF_COLORS.textMuted }}>N/A</Text>;
    }

    return {
      serviceNumber: student.member.serviceNumber,
      name: <View style={styles.cellContent}>{nameParts}</View>,
      division: student.member.division.name,
      attendance: attendanceDisplay,
      enrolledDate: new Date(student.enrollment.enrolledAt).toLocaleDateString('en-CA'),
    };
  });

  return (
    <Letterhead reportTitle="BMQ Attendance Report" generatedAt={generatedAt} pageSize={pageSize}>
      <Text style={styles.courseName}>{courseName}</Text>
      <Text style={styles.courseHeader}>
        Course Period: {new Date(courseStartDate).toLocaleDateString('en-CA')} -{' '}
        {new Date(courseEndDate).toLocaleDateString('en-CA')}
      </Text>

      <PDFTable
        columns={[
          { key: 'serviceNumber', header: 'Service #', width: '15%', align: 'left' },
          { key: 'name', header: 'Name', width: '35%', align: 'left' },
          { key: 'division', header: 'Division', width: '15%', align: 'left' },
          { key: 'attendance', header: 'Attendance', width: '20%', align: 'right' },
          { key: 'enrolledDate', header: 'Enrolled', width: '15%', align: 'right' },
        ]}
        data={rows}
      />
    </Letterhead>
  );
}

export default BMQAttendancePDF;
