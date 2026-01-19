
// Utility to generate deterministic random stats based on pincode
// ensuring the same pincode always gets the same "random" stats
const seededRandom = (seed) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

export const generateMockStatsForPincode = (pincode) => {
    const seed = parseInt(pincode) || 12345;

    // Generate realistic looking numbers based on pincode seed
    const totalEnrollments = Math.floor(seededRandom(seed) * 50000) + 5000;
    const updates = Math.floor(totalEnrollments * (0.2 + seededRandom(seed + 1) * 0.1)); // 20-30% of enrollments
    const rejections = Math.floor(totalEnrollments * (0.005 + seededRandom(seed + 2) * 0.02)); // 0.5-2.5% rejection
    const activeCenters = Math.floor(seededRandom(seed + 3) * 15) + 1;

    return {
        pincode,
        total_enrollments: totalEnrollments,
        updates: updates,
        rejections: rejections,
        rejection_rate: ((rejections / totalEnrollments) * 100).toFixed(2),
        active_centers: activeCenters
    };
};

export const createStatsLookup = (statsDataArray) => {
    const lookup = {};
    if (!statsDataArray) return lookup;
    statsDataArray.forEach(item => {
        lookup[item.pincode] = item;
    });
    return lookup;
};

// Fetch GeoJSON and (optionally) static Stats
export const loadMapData = async () => {
    try {
        // Fetch the local large GeoJSON file
        const response = await fetch('/data/india_pincodes.json');
        if (!response.ok) throw new Error('Failed to load boundary data');
        const boundaryData = await response.json();

        // In a real app, we'd fetch stats from an API. 
        // Here we won't fetch a static file because we generate them on the fly
        // to match the massive number of polygons.

        return { boundaryData, statsData: [] };
    } catch (error) {
        console.error("Error loading map data:", error);
        return { boundaryData: null, statsData: [] };
    }
};

export const getMergedPincodeData = (featureProperties, statsLookup) => {
    const pincode = featureProperties.Pincode;

    // First try lookup (if we had real API data)
    let stats = statsLookup[pincode];

    // If no real data, generate mock data for demo
    if (!stats) {
        stats = generateMockStatsForPincode(pincode);
    }

    return {
        ...featureProperties, // GeoJSON properties (Office_Name, etc.)
        ...stats             // UIDAI Stats
    };
};

export const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
};

export const getEnrollmentColor = (count) => {
    if (!count) return '#CBD5E1'; // Slate-300 for no data
    if (count > 40000) return '#1e3a8a'; // Blue-900
    if (count > 30000) return '#1d4ed8'; // Blue-700
    if (count > 20000) return '#3b82f6'; // Blue-500
    if (count > 10000) return '#60a5fa'; // Blue-400
    return '#93c5fd'; // Blue-300
};

// Generate a consistent color from a string (State/Circle name)
export const getStateColor = (name) => {
    if (!name) return '#94a3b8'; // slate-400
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    // HSL: Hue 0-360, Saturation 60-80%, Lightness 40-60%
    // Using Golden Ratio to spread hues if we wanted, but hash is fine for arbitrary strings
    const h = Math.abs(hash % 360);
    const s = 65 + (Math.abs(hash) % 20);
    const l = 45 + (Math.abs(hash) % 15);
    return `hsl(${h}, ${s}%, ${l}%)`;
};
