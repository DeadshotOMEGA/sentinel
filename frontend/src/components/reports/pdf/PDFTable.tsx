import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

interface Column {
  key: string;
  header: string;
  width: number | string;
  align: 'left' | 'center' | 'right';
}

interface PDFTableProps {
  columns: Column[];
  data: Record<string, React.ReactNode>[];
  alternateRowColors?: boolean;
  headerBackgroundColor?: string;
}

const styles = StyleSheet.create({
  table: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#007fff',
    padding: 6,
  },
  headerCell: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 9,
  },
  row: {
    flexDirection: 'row',
    padding: 5,
    borderBottom: '0.5 solid #ddd',
  },
  rowEven: {
    backgroundColor: '#f9f9f9',
  },
  rowOdd: {
    backgroundColor: 'white',
  },
  cell: {
    fontSize: 9,
  },
});

export function PDFTable({
  columns,
  data,
  alternateRowColors = true,
  headerBackgroundColor = '#007fff',
}: PDFTableProps) {
  // Validate columns have required properties
  if (columns.length === 0) {
    throw new Error('PDFTable requires at least one column');
  }

  return (
    <View style={styles.table}>
      {/* Header Row */}
      <View style={[styles.headerRow, { backgroundColor: headerBackgroundColor }]}>
        {columns.map((col) => (
          <Text
            key={col.key}
            style={[
              styles.headerCell,
              {
                width: col.width,
                textAlign: col.align,
              },
            ]}
          >
            {col.header}
          </Text>
        ))}
      </View>

      {/* Data Rows */}
      {data.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.row,
            alternateRowColors
              ? rowIndex % 2 === 0
                ? styles.rowEven
                : styles.rowOdd
              : {},
          ]}
        >
          {columns.map((col) => (
            <Text
              key={col.key}
              style={[
                styles.cell,
                {
                  width: col.width,
                  textAlign: col.align,
                },
              ]}
            >
              {row[col.key]}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export default PDFTable;
