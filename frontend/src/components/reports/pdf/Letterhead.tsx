import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

/**
 * PDF Letterhead Component
 *
 * Reusable letterhead for HMCS CHIPPAWA reports with official branding.
 *
 * @example
 * ```tsx
 * import { Letterhead, PDFTable } from '@/components/reports/pdf';
 * import { PDFDownloadLink } from '@react-pdf/renderer';
 *
 * function MyReport() {
 *   return (
 *     <PDFDownloadLink
 *       document={
 *         <Letterhead reportTitle="Training Night Attendance">
 *           <PDFTable
 *             columns={[
 *               { key: 'name', header: 'Name', width: '50%', align: 'left' },
 *               { key: 'percentage', header: 'Attendance', width: '50%', align: 'right' }
 *             ]}
 *             data={[
 *               { name: 'Smith, J.', percentage: '85%' },
 *               { name: 'Jones, R.', percentage: '92%' }
 *             ]}
 *           />
 *         </Letterhead>
 *       }
 *       fileName="attendance-report.pdf"
 *     >
 *       Download PDF
 *     </PDFDownloadLink>
 *   );
 * }
 * ```
 */

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottom: '1 solid #007fff',
    paddingBottom: 15,
  },
  crest: {
    width: 60,
    height: 60,
  },
  headerText: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  unitName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007fff',
    marginBottom: 4,
  },
  address: {
    fontSize: 9,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1 solid #ddd',
    paddingTop: 10,
    fontSize: 8,
    color: '#666',
  },
  classification: {
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
    marginTop: 5,
  },
  pageNumber: {
    textAlign: 'right',
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  generatedAt: {
    fontSize: 9,
    color: '#666',
    marginBottom: 20,
  },
});

interface LetterheadProps {
  reportTitle: string;
  generatedAt?: Date;
  classification?: string;
  pageSize?: 'LETTER' | 'A4';
  children: React.ReactNode;
}

// Use public URL for crest
const CREST_URL = '/assets/hmcs_chippawa_crest.jpg';

export function Letterhead({
  reportTitle,
  generatedAt = new Date(),
  classification = 'UNCLASSIFIED',
  pageSize = 'LETTER',
  children,
}: LetterheadProps) {
  const formattedDate = generatedAt.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Document>
      <Page size={pageSize} style={styles.page}>
        {/* Header with crest and unit info */}
        <View style={styles.header}>
          <Image style={styles.crest} src={CREST_URL} />
          <View style={styles.headerText}>
            <Text style={styles.unitName}>HMCS CHIPPAWA</Text>
            <Text style={styles.address}>1 Navy Way</Text>
            <Text style={styles.address}>Winnipeg, MB</Text>
          </View>
        </View>

        {/* Report Title and Generation Date */}
        <Text style={styles.reportTitle}>{reportTitle}</Text>
        <Text style={styles.generatedAt}>Generated: {formattedDate}</Text>

        {/* Main Content */}
        <View style={styles.content}>{children}</View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{classification}</Text>
          <Text>{reportTitle}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export default Letterhead;
