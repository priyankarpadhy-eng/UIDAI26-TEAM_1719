/**
 * Analysis Library - Pre-defined analysis modules for the Notebook
 * Each module defines a complete, self-contained analysis that can be run with one click.
 */

export const ANALYSIS_MODULES = {
    enrollment_trends: {
        id: 'enrollment_trends',
        title: 'Enrollment Trends (Time Series)',
        description: 'View how enrollments have changed over time. Track the monthly pulse of Aadhaar activity.',
        icon: 'TrendingUp',
        sqlTable: 'analytics_monthly_trends',
        chartType: 'LineChart',
        xAxis: 'month_label',
        dataKeys: ['total_enrollments'],
        colors: ['#10B981'], // Emerald green
        hasDateFilter: true,
        dateColumn: 'sort_date',
        orderBy: 'sort_date',
        orderDirection: 'asc'
    },

    demographic_split: {
        id: 'demographic_split',
        title: 'Age Demographics',
        description: 'Breakdown of enrollments by Age Group (0-5, 5-18, 18+). Understand population distribution.',
        icon: 'PieChart',
        sqlTable: 'analytics_age_dist',
        chartType: 'PieChart',
        dataKeys: ['age_0_5', 'age_5_18', 'age_18_plus'],
        pieLabels: ['0-5 Years', '5-18 Years', '18+ Years'],
        colors: ['#14B8A6', '#6366F1', '#64748B'], // Teal, Indigo, Slate
        hasDateFilter: false,
        dateColumn: null,
        orderBy: null
    },

    state_performance: {
        id: 'state_performance',
        title: 'State-wise Leaderboard',
        description: 'Top states by total enrollments. See which states are leading in Aadhaar activity.',
        icon: 'BarChart3',
        sqlTable: 'analytics_state_stats',
        chartType: 'BarChart',
        xAxis: 'state',
        dataKeys: ['total_enrollments'],
        colors: ['#3B82F6'], // Blue
        hasDateFilter: false,
        dateColumn: null,
        orderBy: 'total_enrollments',
        orderDirection: 'desc',
        limit: 10
    },

    district_leaderboard: {
        id: 'district_leaderboard',
        title: 'District Performance',
        description: 'Top performing districts across all states. Granular view of enrollment activity.',
        icon: 'MapPin',
        sqlTable: 'analytics_district_leaderboard',
        chartType: 'BarChart',
        xAxis: 'district',
        dataKeys: ['total_activity'],
        colors: ['#8B5CF6'], // Purple
        hasDateFilter: false,
        dateColumn: null,
        orderBy: 'total_activity',
        orderDirection: 'desc',
        limit: 15
    },

    age_comparison: {
        id: 'age_comparison',
        title: 'Age Group Comparison (Bar)',
        description: 'Compare enrollments across age groups using a bar chart view.',
        icon: 'BarChart',
        sqlTable: 'analytics_age_dist',
        chartType: 'BarChartHorizontal',
        xAxis: 'age_group',
        dataKeys: ['count'],
        colors: ['#F97316', '#EC4899', '#06B6D4'], // Orange, Pink, Cyan
        hasDateFilter: false,
        dateColumn: null,
        transformData: (data) => {
            if (!data || data.length === 0) return [];
            const row = data[0];
            return [
                { age_group: '0-5 Years', count: row.age_0_5 || 0 },
                { age_group: '5-18 Years', count: row.age_5_18 || 0 },
                { age_group: '18+ Years', count: row.age_18_plus || 0 },
            ];
        }
    }
};

// Helper to get an array of all modules for dropdown
export const getModuleList = () => {
    return Object.values(ANALYSIS_MODULES);
};

// Default chart colors palette
export const CHART_COLORS = [
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#6366F1', // Indigo
    '#EF4444', // Red
    '#FBBF24', // Amber
    '#06B6D4', // Cyan
];
