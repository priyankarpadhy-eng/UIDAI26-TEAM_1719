import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

/**
 * PDF Styles using @react-pdf/renderer StyleSheet
 * Designed for A4 pages with professional layout
 */
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        padding: 40,
        fontFamily: 'Helvetica',
    },
    // Header Section
    header: {
        marginBottom: 30,
        borderBottom: '2px solid #8b5cf6',
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    logoContainer: {
        width: 120,
        height: 60,
    },
    logo: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    headerText: {
        flex: 1,
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
        fontFamily: 'Helvetica-Bold',
    },
    subtitle: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    teamBadge: {
        fontSize: 10,
        color: '#8b5cf6',
        backgroundColor: '#f3e8ff',
        padding: '4 8',
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    // Summary Section
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        fontFamily: 'Helvetica-Bold',
    },
    summaryLabel: {
        fontSize: 10,
        color: '#6b7280',
        marginTop: 4,
    },
    // Cell Container
    cellContainer: {
        marginBottom: 24,
        padding: 20,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderLeft: '4px solid #8b5cf6',
    },
    cellHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cellNumber: {
        fontSize: 12,
        color: '#ffffff',
        backgroundColor: '#8b5cf6',
        padding: '4 10',
        borderRadius: 12,
        marginRight: 12,
        fontFamily: 'Helvetica-Bold',
    },
    cellTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        fontFamily: 'Helvetica-Bold',
        flex: 1,
    },
    cellDescription: {
        fontSize: 11,
        color: '#4b5563',
        marginBottom: 16,
        lineHeight: 1.5,
    },
    // Chart Image
    chartImageContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
        alignItems: 'center',
    },
    chartImage: {
        width: '100%',
        maxHeight: 280,
        objectFit: 'contain',
    },
    chartMissing: {
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center',
        padding: 40,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
    },
    // Data Stats Row
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 16,
        marginTop: 12,
        paddingTop: 12,
        borderTop: '1px solid #e5e7eb',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 9,
        color: '#6b7280',
        marginRight: 4,
    },
    statValue: {
        fontSize: 10,
        color: '#1f2937',
        fontFamily: 'Helvetica-Bold',
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTop: '1px solid #e5e7eb',
    },
    footerText: {
        fontSize: 9,
        color: '#9ca3af',
    },
    pageNumber: {
        fontSize: 9,
        color: '#6b7280',
    },
    // Utilities
    divider: {
        borderBottom: '1px solid #e5e7eb',
        marginVertical: 20,
    },
});

/**
 * ReportDocument - The PDF structure using @react-pdf/renderer
 * Renders crisp vector text with embedded chart images
 * 
 * @param {Array} selectedCells - Array of cell objects to include
 * @param {Object} chartImagesMap - Map of cell.id -> base64 PNG data URL
 * @param {Object} metadata - Report metadata (date, title, etc.)
 */
const ReportDocument = ({ selectedCells, chartImagesMap, metadata = {} }) => {
    const reportDate = new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const reportTime = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
    });

    // Logo as base64 for PDF embedding (you can also use a URL)
    const logoSrc = '/uidai-samarth-logo.png';

    return (
        <Document
            title="UIDAI SAMARTH - Analytics Report"
            author="UIDAI SAMARTH Team 1719"
            subject="Smart Aadhaar Monitoring, Analytics & Reporting"
            keywords="aadhaar, samarth, analytics, enrollment, report, uidai"
        >
            <Page size="A4" style={styles.page} wrap>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image src={logoSrc} style={styles.logo} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.mainTitle}>UIDAI SAMARTH Report</Text>
                        <Text style={styles.subtitle}>
                            Smart Aadhaar Monitoring, Analytics & Reporting Technology Hub
                        </Text>
                        <Text style={styles.subtitle}>
                            Generated on {reportDate} at {reportTime}
                        </Text>
                        <Text style={styles.teamBadge}>Team UIDAI_1719 • Hackathon 2026</Text>
                    </View>
                </View>

                {/* Summary Stats */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{selectedCells.length}</Text>
                        <Text style={styles.summaryLabel}>Analysis Cells</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>
                            {selectedCells.filter(c => chartImagesMap[c.id]).length}
                        </Text>
                        <Text style={styles.summaryLabel}>Charts Captured</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{metadata.totalRecords || 'N/A'}</Text>
                        <Text style={styles.summaryLabel}>Records Analyzed</Text>
                    </View>
                </View>

                {/* Analysis Cells */}
                {selectedCells.map((cell, index) => (
                    <View
                        key={cell.id}
                        style={styles.cellContainer}
                        break={index > 0 && index % 2 === 0} // Page break every 2 cells
                    >
                        {/* Cell Header */}
                        <View style={styles.cellHeader}>
                            <Text style={styles.cellNumber}>{index + 1}</Text>
                            <Text style={styles.cellTitle}>{cell.title || 'Analysis Cell'}</Text>
                        </View>

                        {/* Description */}
                        {cell.description && (
                            <Text style={styles.cellDescription}>{cell.description}</Text>
                        )}

                        {/* Chart Image */}
                        <View style={styles.chartImageContainer}>
                            {chartImagesMap[cell.id] ? (
                                <Image
                                    src={chartImagesMap[cell.id]}
                                    style={styles.chartImage}
                                />
                            ) : (
                                <Text style={styles.chartMissing}>
                                    Chart visualization not available
                                </Text>
                            )}
                        </View>

                        {/* Stats Row */}
                        {(cell.rowCount || cell.executionTime) && (
                            <View style={styles.statsRow}>
                                {cell.rowCount && (
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>Rows:</Text>
                                        <Text style={styles.statValue}>{cell.rowCount}</Text>
                                    </View>
                                )}
                                {cell.executionTime && (
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>Time:</Text>
                                        <Text style={styles.statValue}>{cell.executionTime}ms</Text>
                                    </View>
                                )}
                                {cell.moduleId && (
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>Module:</Text>
                                        <Text style={styles.statValue}>{cell.moduleId}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                ))}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        UIDAI SAMARTH • Smart Aadhaar Monitoring, Analytics & Reporting Technology Hub • Confidential
                    </Text>
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
};

export default ReportDocument;
