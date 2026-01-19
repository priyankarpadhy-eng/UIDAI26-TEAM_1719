import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { parseCSV, mergeAndAggregateData } from '../utils/dataProcessor';
import { supabase } from '../supabaseClient';
import _ from 'lodash';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [processedData, setProcessedData] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [dbConnected, setDbConnected] = useState(false);
    const [lastAnalysisTime, setLastAnalysisTime] = useState(null);

    // NEW: Time-based filtering
    const [timePeriod, setTimePeriod] = useState('all'); // 'day', 'week', 'month', '3months', '6months', 'year', 'all'
    const [totalRecords, setTotalRecords] = useState(0);

    // Scanner Animation State
    const [scanMode, setScanMode] = useState(false);
    const [scanProgress, setScanProgress] = useState(null);

    // Scanner control functions
    const triggerScanAnimation = (active) => {
        setScanMode(active);
        if (!active) {
            setScanProgress(null);
        }
    };

    const updateScanProgress = (activePincode, step, total) => {
        setScanProgress({ activePincode, step, total });
    };

    // Check Database Connection on Mount
    useEffect(() => {
        const checkConnection = async () => {
            // Check connection using the enrollments table (or any existing table)
            const { error } = await supabase.from('enrollments').select('count', { count: 'exact', head: true });
            if (!error) {
                setDbConnected(true);
                fetchFromDatabase(); // Load initial data
            } else {
                console.warn("Supabase not connected:", error.message);
            }
        };
        checkConnection();
    }, []);

    // Action: Fetch Data from DB with time-based filtering
    const fetchFromDatabase = async (period = timePeriod, retries = 3) => {
        setIsSyncing(true);

        // Calculate date range based on period
        const getStartDate = (periodType) => {
            const now = new Date();
            switch (periodType) {
                case 'day': return new Date(now - 1 * 24 * 60 * 60 * 1000);
                case 'week': return new Date(now - 7 * 24 * 60 * 60 * 1000);
                case 'month': return new Date(now - 30 * 24 * 60 * 60 * 1000);
                case '3months': return new Date(now - 90 * 24 * 60 * 60 * 1000);
                case '6months': return new Date(now - 180 * 24 * 60 * 60 * 1000);
                case 'year': return new Date(now - 365 * 24 * 60 * 60 * 1000);
                default: return null; // 'all' - no date filter
            }
        };

        const startDate = getStartDate(period);
        const startDateStr = startDate ? startDate.toISOString().split('T')[0] : null;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Build query with optional date filter
                let enrollmentsQuery = supabase.from('enrollments').select('*');
                let biometricQuery = supabase.from('biometric_updates').select('*');
                let demographicQuery = supabase.from('demographic_updates').select('*');

                if (startDateStr) {
                    enrollmentsQuery = enrollmentsQuery.gte('record_date', startDateStr);
                    biometricQuery = biometricQuery.gte('record_date', startDateStr);
                    demographicQuery = demographicQuery.gte('record_date', startDateStr);
                }

                // Fetch all three types in parallel
                const [enrollRes, bioRes, demoRes] = await Promise.all([
                    enrollmentsQuery.limit(50000),
                    biometricQuery.limit(50000),
                    demographicQuery.limit(50000)
                ]);

                if (enrollRes.error) throw enrollRes.error;

                // Aggregate data by pincode on client side
                const pincodeMap = new Map();

                // Process enrollments
                (enrollRes.data || []).forEach(item => {
                    const key = item.pincode;
                    if (!pincodeMap.has(key)) {
                        pincodeMap.set(key, {
                            Pincode: item.pincode,
                            State: item.state,
                            District: item.district,
                            metrics: {
                                totalEnrollments: 0,
                                biometricUpdates: 0,
                                demographicUpdates: 0,
                                updates: 0,
                                rejections: 0,
                                enrollmentAgeBreakdown: { age_0_5: 0, age_5_18: 0, age_18_plus: 0 },
                                biometricAgeBreakdown: { age_0_5: 0, age_5_18: 0, age_18_plus: 0 },
                                demographicAgeBreakdown: { age_0_5: 0, age_5_18: 0, age_18_plus: 0 }
                            },
                            dates: [] // Track individual dates
                        });
                    }
                    const record = pincodeMap.get(key);
                    const total = (item.age_0_5 || 0) + (item.age_5_18 || 0) + (item.age_18_plus || 0);
                    record.metrics.totalEnrollments += total;
                    record.metrics.enrollmentAgeBreakdown.age_0_5 += item.age_0_5 || 0;
                    record.metrics.enrollmentAgeBreakdown.age_5_18 += item.age_5_18 || 0;
                    record.metrics.enrollmentAgeBreakdown.age_18_plus += item.age_18_plus || 0;
                    if (item.record_date && !record.dates.includes(item.record_date)) {
                        record.dates.push(item.record_date);
                    }
                });

                // Process biometrics
                (bioRes.data || []).forEach(item => {
                    const key = item.pincode;
                    if (!pincodeMap.has(key)) {
                        pincodeMap.set(key, {
                            Pincode: item.pincode,
                            State: item.state,
                            District: item.district,
                            metrics: {
                                totalEnrollments: 0, biometricUpdates: 0, demographicUpdates: 0,
                                updates: 0, rejections: 0,
                                enrollmentAgeBreakdown: { age_0_5: 0, age_5_18: 0, age_18_plus: 0 },
                                biometricAgeBreakdown: { age_0_5: 0, age_5_18: 0, age_18_plus: 0 },
                                demographicAgeBreakdown: { age_0_5: 0, age_5_18: 0, age_18_plus: 0 }
                            },
                            dates: []
                        });
                    }
                    const record = pincodeMap.get(key);
                    const total = (item.age_0_5 || 0) + (item.age_5_18 || 0) + (item.age_18_plus || 0);
                    record.metrics.biometricUpdates += total;
                    record.metrics.biometricAgeBreakdown.age_0_5 += item.age_0_5 || 0;
                    record.metrics.biometricAgeBreakdown.age_5_18 += item.age_5_18 || 0;
                    record.metrics.biometricAgeBreakdown.age_18_plus += item.age_18_plus || 0;
                });

                // Process demographics
                (demoRes.data || []).forEach(item => {
                    const key = item.pincode;
                    if (!pincodeMap.has(key)) {
                        pincodeMap.set(key, {
                            Pincode: item.pincode,
                            State: item.state,
                            District: item.district,
                            metrics: {
                                totalEnrollments: 0, biometricUpdates: 0, demographicUpdates: 0,
                                updates: 0, rejections: 0,
                                enrollmentAgeBreakdown: { age_0_5: 0, age_5_18: 0, age_18_plus: 0 },
                                biometricAgeBreakdown: { age_0_5: 0, age_5_18: 0, age_18_plus: 0 },
                                demographicAgeBreakdown: { age_0_5: 0, age_5_18: 0, age_18_plus: 0 }
                            },
                            dates: []
                        });
                    }
                    const record = pincodeMap.get(key);
                    const total = (item.age_0_5 || 0) + (item.age_5_18 || 0) + (item.age_18_plus || 0);
                    record.metrics.demographicUpdates += total;
                    record.metrics.demographicAgeBreakdown.age_0_5 += item.age_0_5 || 0;
                    record.metrics.demographicAgeBreakdown.age_5_18 += item.age_5_18 || 0;
                    record.metrics.demographicAgeBreakdown.age_18_plus += item.age_18_plus || 0;
                });

                // Calculate total updates
                pincodeMap.forEach(record => {
                    record.metrics.updates = record.metrics.biometricUpdates + record.metrics.demographicUpdates;
                });

                const mappedData = Array.from(pincodeMap.values());
                setProcessedData(mappedData);
                setTotalRecords((enrollRes.data?.length || 0) + (bioRes.data?.length || 0) + (demoRes.data?.length || 0));
                console.log(`✅ Fetched ${mappedData.length} unique pincodes (${period} period)`);

                break; // Success

            } catch (err) {
                console.error(`Attempt ${attempt}/${retries} failed:`, err);
                if (attempt < retries) {
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.log(`Retrying in ${delay / 1000}s...`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    console.error("All retry attempts failed.");
                }
            }
        }

        setIsSyncing(false);
    };

    // NEW: Function to change time period and refetch data
    const changeTimePeriod = async (newPeriod) => {
        setTimePeriod(newPeriod);
        await fetchFromDatabase(newPeriod);
    };

    // Action: Upload & Sync Files
    // Supports both raw File objects AND pre-structured objects from Column Mapping Modal
    // autoSync: if true, automatically sync to database (default: false for new 2-step flow)
    const handleFileUpload = useCallback(async (files, dataType = 'enrollment', autoSync = false) => {
        setIsProcessing(true);
        try {
            let taggedFiles;

            // Check if files are already structured (from Column Mapping Modal)
            if (files.length > 0 && files[0].data && files[0].fileName) {
                // Already structured - use directly
                console.log('Using pre-structured files from Column Mapping');
                taggedFiles = files.map(f => ({
                    ...f,
                    type: f.type || dataType,
                    meta: f.meta || { fields: Object.keys(f.data[0] || {}) }
                }));
            } else {
                // Raw File objects - parse them
                console.log('Parsing raw File objects');
                const parsedResults = await Promise.all(files.map(parseCSV));
                taggedFiles = parsedResults.map(f => ({ ...f, type: dataType }));
            }

            setUploadedFiles(prev => [...prev, ...taggedFiles]);

            // Only sync if autoSync is true
            if (autoSync) {
                await syncToDatabase(taggedFiles);
            } else {
                console.log('Files loaded. Waiting for manual sync trigger.');
            }

        } catch (error) {
            console.error("File upload failed", error);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    // ABORT CONTROL
    const abortSyncRef = React.useRef(false);

    const stopGlobalSync = useCallback(() => {
        abortSyncRef.current = true;
        setScanMode(false);
        setIsSyncing(false);
        setScanProgress(null);
    }, []);

    const syncToDatabase = async (parsedFiles) => {
        if (!parsedFiles.length) return;
        setIsSyncing(true);
        abortSyncRef.current = false; // Reset abort flag

        console.log("Starting Sync to Database with", parsedFiles.length, "files.");

        // Flatten all data but keep the 'type' context for each row
        const allRows = parsedFiles.flatMap(file =>
            file.data.map(row => ({ ...row, _type: file.type || 'enrollment' }))
        );

        console.log(`Total rows to process: ${allRows.length}`);

        // Helper: Get pincode from row (handles both Pincode and pincode)
        const getPincode = (row) => {
            return row.pincode || row.Pincode || row.PINCODE || row.pin || row.Pin || null;
        };

        // Helper: Find value by checking exact keys first, then fuzzy matching
        const findVal = (row, exactKeys, fuzzyTerms) => {
            // First check exact keys (from normalized data)
            for (const key of exactKeys) {
                if (row[key] !== undefined) {
                    const val = parseInt(row[key]);
                    if (!isNaN(val)) return val;
                }
            }

            // Fallback: fuzzy match for non-normalized data
            const keys = Object.keys(row);
            const foundKey = keys.find(k => {
                const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                return fuzzyTerms.some(t => lower.includes(t));
            });
            const val = foundKey ? parseInt(row[foundKey]) : 0;
            return isNaN(val) ? 0 : val;
        };

        // Filter rows with valid pincode
        const validRows = allRows.filter(row => getPincode(row));
        console.log(`Valid rows with pincode: ${validRows.length}`);

        // DEBUG: Log sample data to understand structure
        if (allRows.length > 0) {
            console.log('DEBUG - First row keys:', Object.keys(allRows[0]));
            // console.log('DEBUG - First row data:', JSON.stringify(allRows[0]).slice(0, 500));
            // console.log('DEBUG - First row _type:', allRows[0]._type);
            // console.log('DEBUG - First row pincode:', getPincode(allRows[0]));
        }
        if (validRows.length === 0 && allRows.length > 0) {
            console.error('ERROR: All rows filtered out! No valid pincodes found.');
        }

        const uniqueUpdates = _(validRows)
            .groupBy(row => getPincode(row))
            .map((rows, pincode) => {
                const first = rows[0];

                // Get state/district - use non-pincode value (avoid using pincode as state)
                const getState = (r) => {
                    const state = r.state || r.State || r.STATE || r.circle || r.Circle;
                    // Make sure we're not using pincode as state
                    if (state && state !== r.pincode && state !== r.Pincode) {
                        return state;
                    }
                    return 'Unknown';
                };
                const getDistrict = (r) => {
                    const district = r.district || r.District || r.DISTRICT || r.division || r.Division;
                    if (district && district !== r.pincode && district !== r.Pincode) {
                        return district;
                    }
                    return 'Unknown';
                };

                // SIMPLIFIED: Directly read normalized keys from each row
                // The normalized data from Column Mapping Modal has: age_0_5, age_5_18, age_18_plus, total
                const getVal = (row, key) => {
                    const val = parseInt(row[key]) || 0;
                    return val;
                };

                // Sum by data type
                const enrollmentRows = rows.filter(r => r._type === 'enrollment');
                const biometricRows = rows.filter(r => r._type === 'biometric');
                const demographicRows = rows.filter(r => r._type === 'demographic');

                // Enrollment sums
                const enrol_age0_5 = _.sumBy(enrollmentRows, r => getVal(r, 'age_0_5'));
                const enrol_age5_18 = _.sumBy(enrollmentRows, r => getVal(r, 'age_5_18'));
                const enrol_age18_plus = _.sumBy(enrollmentRows, r => getVal(r, 'age_18_plus'));
                const enrol_total = _.sumBy(enrollmentRows, r => getVal(r, 'total'));
                const totalEnrollments = (enrol_age0_5 + enrol_age5_18 + enrol_age18_plus) || enrol_total;

                // Biometric sums
                const bio_age0_5 = _.sumBy(biometricRows, r => getVal(r, 'age_0_5'));
                const bio_age5_18 = _.sumBy(biometricRows, r => getVal(r, 'age_5_18'));
                const bio_age18_plus = _.sumBy(biometricRows, r => getVal(r, 'age_18_plus'));
                const bio_total = _.sumBy(biometricRows, r => getVal(r, 'total'));
                const totalBio = (bio_age0_5 + bio_age5_18 + bio_age18_plus) || bio_total;

                // Demographic sums
                const demo_age0_5 = _.sumBy(demographicRows, r => getVal(r, 'age_0_5'));
                const demo_age5_18 = _.sumBy(demographicRows, r => getVal(r, 'age_5_18'));
                const demo_age18_plus = _.sumBy(demographicRows, r => getVal(r, 'age_18_plus'));
                const demo_total = _.sumBy(demographicRows, r => getVal(r, 'total'));
                const totalDemo = (demo_age0_5 + demo_age5_18 + demo_age18_plus) || demo_total;

                return {
                    pincode: String(pincode),
                    state: getState(first),
                    district: getDistrict(first),

                    // Core Metrics
                    total_enrollments: totalEnrollments,
                    biometric_updates: totalBio,
                    demographic_updates: totalDemo,

                    // Detailed Breakdowns - Enrollment
                    enrollment_0_5: enrol_age0_5,
                    enrollment_5_18: enrol_age5_18,
                    enrollment_18_plus: enrol_age18_plus,

                    // Detailed Breakdowns - Biometric
                    biometric_0_5: bio_age0_5,
                    biometric_5_18: bio_age5_18,
                    biometric_18_plus: bio_age18_plus,

                    // Detailed Breakdowns - Demographic
                    demographic_0_5: demo_age0_5,
                    demographic_5_18: demo_age5_18,
                    demographic_18_plus: demo_age18_plus
                };
            })
            .value();

        console.log("Prepared", uniqueUpdates.length, "unique pincode records for upsert.");

        // REAL-TIME SEQUENTIAL SYNC: Process one by one as requested
        // This ensures the progress bar updates for *every* single database write

        let successCount = 0;
        const totalPincodes = uniqueUpdates.length;

        // Activate scan animation
        setScanMode(true);
        const startTime = Date.now(); // Start timer for ETA

        // Process sequentially
        for (let i = 0; i < uniqueUpdates.length; i++) {
            // STOP CHECK
            if (abortSyncRef.current) {
                console.warn("Sync aborted by user!");
                alert("Upload Terminated by User.");
                break;
            }

            const item = uniqueUpdates[i];
            const now = new Date().toISOString();

            // ETA Calculation
            const elapsedTime = Date.now() - startTime;
            const avgTimePerItem = i > 0 ? elapsedTime / i : 0;
            const remainingItems = totalPincodes - i;
            const estimatedRemainingTime = avgTimePerItem * remainingItems; // in ms
            const etaSeconds = Math.ceil(estimatedRemainingTime / 1000);

            // Format ETA string
            let etaString = "Calculating...";
            if (i > 5) { // Wait for a few samples
                if (etaSeconds < 60) {
                    etaString = `${etaSeconds}s remaining`;
                } else {
                    const mins = Math.floor(etaSeconds / 60);
                    const secs = etaSeconds % 60;
                    etaString = `${mins}m ${secs}s remaining`;
                }
            }

            // Visual Progress Update
            setScanProgress({
                activePincode: item.pincode,
                state: item.state,
                district: item.district,
                step: i + 1,
                total: totalPincodes,
                currentTable: 'Preparing...',
                batchNum: i + 1,
                totalBatches: totalPincodes,
                eta: etaString // Adding ETA to state
            });

            // 1. Enrollment
            if (item.total_enrollments > 0 || (item.enrollment_0_5 + item.enrollment_5_18 + item.enrollment_18_plus) > 0) {
                setScanProgress(prev => ({ ...prev, currentTable: '📊 Updating Enrollments...' }));
                const payload = {
                    pincode: item.pincode,
                    state: item.state,
                    district: item.district,
                    age_0_5: item.enrollment_0_5,
                    age_5_18: item.enrollment_5_18,
                    age_18_plus: item.enrollment_18_plus,
                    updated_at: now
                    // Note: 'total' is GENERATED ALWAYS in DB, so we do NOT send it.
                };
                const { error } = await supabase.from('enrollments').upsert(payload, { onConflict: 'pincode' });
                if (error) console.error(`Enrollment Upsert Error (${item.pincode}):`, error);
            }

            // 2. Biometric
            if (item.biometric_updates > 0 || (item.biometric_0_5 + item.biometric_5_18 + item.biometric_18_plus) > 0) {
                setScanProgress(prev => ({ ...prev, currentTable: '🔐 Updating Biometrics...' }));
                const payload = {
                    pincode: item.pincode,
                    state: item.state,
                    district: item.district,
                    count: item.biometric_updates, // This is explicitly defined in table, not generated
                    age_0_5: item.biometric_0_5,
                    age_5_18: item.biometric_5_18,
                    age_18_plus: item.biometric_18_plus,
                    updated_at: now
                };
                const { error } = await supabase.from('biometric_updates').upsert(payload, { onConflict: 'pincode' });
                if (error) console.error(`Biometric Upsert Error (${item.pincode}):`, error);
            }

            // 3. Demographic
            if (item.demographic_updates > 0 || (item.demographic_0_5 + item.demographic_5_18 + item.demographic_18_plus) > 0) {
                setScanProgress(prev => ({ ...prev, currentTable: '👥 Updating Demographics...' }));
                const payload = {
                    pincode: item.pincode,
                    state: item.state,
                    district: item.district,
                    count: item.demographic_updates, // This is explicitly defined in table, not generated
                    age_0_5: item.demographic_0_5,
                    age_5_18: item.demographic_5_18,
                    age_18_plus: item.demographic_18_plus,
                    updated_at: now
                };
                const { error } = await supabase.from('demographic_updates').upsert(payload, { onConflict: 'pincode' });
                if (error) console.error(`Demographic Upsert Error (${item.pincode}):`, error);
            }

            successCount++;

            // Log every 100 items
            if (i % 100 === 0) {
                console.log(`Processed ${i + 1}/${totalPincodes} pincodes...`);
            }
        }

        console.log(`Sync Complete/Stopped. ${successCount} records updated.`);

        // After sync, re-fetch to get the unified view
        await fetchFromDatabase();

        // Clear flags if completed naturally
        if (!abortSyncRef.current) {
            setIsSyncing(false);
            setScanMode(false);
            setScanProgress(null);
        }
    };

    // Action: Clear Data (Local View Only)
    const resetData = useCallback(() => {
        setUploadedFiles([]);
        setProcessedData([]);
        setLastAnalysisTime(null);
    }, []);

    // Explicit Analysis Trigger (for testing logic without DB if needed, but mainly we use the DB sync path now)
    const runAnalysis = useCallback(() => {
        if (uploadedFiles.length > 0) {
            setIsProcessing(true);
            try {
                // Client-side processing logic using utility
                const aggregated = mergeAndAggregateData(uploadedFiles);
                setProcessedData(aggregated);
            } catch (err) {
                console.error("Local analysis failed:", err);
            } finally {
                setIsProcessing(false);
            }
        } else {
            // If no files, try fetching from DB
            fetchFromDatabase();
        }
    }, [uploadedFiles]);

    // Fetch specific pincode data from database
    const fetchPincodeData = async (pincode) => {
        if (!pincode) return null;

        try {
            // Query the individual tables directly (new schema with record_date)
            const [enrollRes, bioRes, demoRes] = await Promise.all([
                supabase.from('enrollments').select('*').eq('pincode', pincode),
                supabase.from('biometric_updates').select('*').eq('pincode', pincode),
                supabase.from('demographic_updates').select('*').eq('pincode', pincode)
            ]);

            // Aggregate the results
            const enrollData = enrollRes.data || [];
            const bioData = bioRes.data || [];
            const demoData = demoRes.data || [];

            if (enrollData.length === 0 && bioData.length === 0 && demoData.length === 0) {
                console.warn(`Pincode ${pincode} not found in database`);
                return null;
            }

            // Sum up all records for this pincode (across all dates)
            const sumEnrollments = enrollData.reduce((acc, r) => ({
                total: acc.total + (r.age_0_5 || 0) + (r.age_5_18 || 0) + (r.age_18_plus || 0),
                age_0_5: acc.age_0_5 + (r.age_0_5 || 0),
                age_5_18: acc.age_5_18 + (r.age_5_18 || 0),
                age_18_plus: acc.age_18_plus + (r.age_18_plus || 0)
            }), { total: 0, age_0_5: 0, age_5_18: 0, age_18_plus: 0 });

            const sumBiometric = bioData.reduce((acc, r) => ({
                total: acc.total + (r.age_0_5 || 0) + (r.age_5_18 || 0) + (r.age_18_plus || 0),
                age_0_5: acc.age_0_5 + (r.age_0_5 || 0),
                age_5_18: acc.age_5_18 + (r.age_5_18 || 0),
                age_18_plus: acc.age_18_plus + (r.age_18_plus || 0)
            }), { total: 0, age_0_5: 0, age_5_18: 0, age_18_plus: 0 });

            const sumDemographic = demoData.reduce((acc, r) => ({
                total: acc.total + (r.age_0_5 || 0) + (r.age_5_18 || 0) + (r.age_18_plus || 0),
                age_0_5: acc.age_0_5 + (r.age_0_5 || 0),
                age_5_18: acc.age_5_18 + (r.age_5_18 || 0),
                age_18_plus: acc.age_18_plus + (r.age_18_plus || 0)
            }), { total: 0, age_0_5: 0, age_5_18: 0, age_18_plus: 0 });

            // Get state/district from first record
            const firstRecord = enrollData[0] || bioData[0] || demoData[0];

            return {
                Pincode: pincode,
                State: firstRecord?.state || 'Unknown',
                District: firstRecord?.district || 'Unknown',
                total_enrollments: sumEnrollments.total,
                biometric_updates: sumBiometric.total,
                demographic_updates: sumDemographic.total,
                updates: sumBiometric.total + sumDemographic.total,
                rejections: 0,

                // Count of unique dates
                uniqueDates: enrollData.length,
                dates: enrollData.map(r => r.record_date),

                // Enrollment Age Breakdown
                enrollmentAgeBreakdown: {
                    age_0_5: sumEnrollments.age_0_5,
                    age_5_18: sumEnrollments.age_5_18,
                    age_18_plus: sumEnrollments.age_18_plus
                },

                // Biometric Age Breakdown
                biometricAgeBreakdown: {
                    age_0_5: sumBiometric.age_0_5,
                    age_5_18: sumBiometric.age_5_18,
                    age_18_plus: sumBiometric.age_18_plus
                },

                // Demographic Age Breakdown
                demographicAgeBreakdown: {
                    age_0_5: sumDemographic.age_0_5,
                    age_5_18: sumDemographic.age_5_18,
                    age_18_plus: sumDemographic.age_18_plus
                }
            };
        } catch (err) {
            console.error('Error fetching pincode data:', err);
            return null;
        }
    };


    const value = {
        uploadedFiles,
        processedData,
        isProcessing,
        isSyncing,
        dbConnected,
        lastAnalysisTime,
        handleFileUpload,
        resetData,
        runAnalysis,
        // Scanner Animation State
        scanMode,
        triggerScanAnimation,
        scanProgress,
        updateScanProgress,
        syncToDatabase,
        fetchPincodeData,
        stopGlobalSync,
        fetchFromDatabase,
        // NEW: Time-based filtering
        timePeriod,
        totalRecords,
        changeTimePeriod
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
