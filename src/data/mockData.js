// Mock Data for Dashboard

export const stateData = [
    { state: "Odisha", enrollment_count: 45000000, updates_count: 1200000, rejection_rate: 1.2, lat: 20.9517, lng: 85.0985, active: true },
    { state: "Maharashtra", enrollment_count: 125000000, updates_count: 4500000, rejection_rate: 2.1, lat: 19.7515, lng: 75.7139, active: true },
    { state: "Delhi", enrollment_count: 20000000, updates_count: 800000, rejection_rate: 0.8, lat: 28.7041, lng: 77.1025, active: true },
    { state: "Karnataka", enrollment_count: 68000000, updates_count: 2100000, rejection_rate: 1.5, lat: 15.3173, lng: 75.7139, active: true },
    { state: "West Bengal", enrollment_count: 98000000, updates_count: 3200000, rejection_rate: 2.5, lat: 22.9868, lng: 87.8550, active: true },
    { state: "Tamil Nadu", enrollment_count: 76000000, updates_count: 1800000, rejection_rate: 1.1, lat: 11.1271, lng: 78.6569, active: true }
];

export const genderDistribution = [
    { name: 'Male', value: 52 },
    { name: 'Female', value: 47 },
    { name: 'Other', value: 1 },
];

export const getAggregatedStats = () => {
    return {
        totalGenerated: 1380000000,
        globalRejection: 1.84,
        activeState: "Maharashtra",
        totalUpdates: 45000000
    };
};

export const formatIndianNumber = (num) => {
    if (num >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
    if (num >= 100000) return (num / 100000).toFixed(2) + " L";
    return num.toLocaleString("en-IN");
};
