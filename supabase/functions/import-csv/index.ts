// Supabase Edge Function: import-csv v2
// Individual Date Rows (No Aggregation)
// Primary Key: (pincode, record_date)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHUNK_SIZE = 5000;

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { file_path, data_type = "enrollment" } = await req.json();

        if (!file_path) {
            return new Response(
                JSON.stringify({ error: "file_path is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`📥 Starting import from: ${file_path}`);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Download file from Storage
        console.log("⬇️ Downloading file from Storage...");
        const { data: fileData, error: downloadError } = await supabase.storage
            .from("bulk_import")
            .download(file_path);

        if (downloadError) {
            throw new Error(`Storage download failed: ${downloadError.message}`);
        }

        const csvText = await fileData.text();
        const lines = csvText.split("\n").filter(line => line.trim());

        if (lines.length < 2) {
            throw new Error("CSV file is empty or has no data rows");
        }

        console.log(`📊 Found ${lines.length - 1} data rows to process`);

        // Parse header - NEW: includes record_date
        const header = lines[0].split(",").map(h => h.trim().toLowerCase());
        const pincodeIdx = header.indexOf("pincode");
        const dateIdx = header.indexOf("record_date");
        const stateIdx = header.indexOf("state");
        const districtIdx = header.indexOf("district");
        const age05Idx = header.indexOf("age_0_5");
        const age518Idx = header.indexOf("age_5_18");
        const age18plusIdx = header.indexOf("age_18_plus");

        if (pincodeIdx === -1) {
            throw new Error("CSV must have a 'pincode' column");
        }
        if (dateIdx === -1) {
            throw new Error("CSV must have a 'record_date' column");
        }

        // Determine target table
        const tableName = data_type === "biometric"
            ? "biometric_updates"
            : data_type === "demographic"
                ? "demographic_updates"
                : "enrollments";

        console.log(`🎯 Target table: ${tableName}`);

        // Parse all rows
        const records: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === 0) continue;

            const pincode = values[pincodeIdx]?.trim();
            const recordDate = values[dateIdx]?.trim();

            if (!pincode || !recordDate) continue;

            const record: any = {
                pincode,
                record_date: recordDate,
                state: values[stateIdx]?.trim() || "Unknown",
                district: values[districtIdx]?.trim() || "Unknown",
                age_0_5: parseInt(values[age05Idx]) || 0,
                age_5_18: parseInt(values[age518Idx]) || 0,
                age_18_plus: parseInt(values[age18plusIdx]) || 0,
            };

            records.push(record);
        }

        console.log(`✅ Parsed ${records.length} valid records`);

        // Bulk upsert in chunks
        // IMPORTANT: onConflict must include BOTH pincode AND record_date
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < records.length; i += CHUNK_SIZE) {
            const chunk = records.slice(i, i + CHUNK_SIZE);

            const { error: upsertError } = await supabase
                .from(tableName)
                .upsert(chunk, {
                    onConflict: "pincode,record_date", // Composite key!
                    ignoreDuplicates: false
                });

            if (upsertError) {
                console.error(`❌ Chunk ${Math.floor(i / CHUNK_SIZE) + 1} failed:`, upsertError.message);
                errorCount += chunk.length;
            } else {
                successCount += chunk.length;
                console.log(`✅ Inserted chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${chunk.length} records`);
            }
        }

        // Cleanup
        console.log("🧹 Cleaning up storage...");
        await supabase.storage.from("bulk_import").remove([file_path]);

        const result = {
            success: true,
            message: `Import complete: ${successCount} records inserted, ${errorCount} errors`,
            stats: {
                total_rows: lines.length - 1,
                records_processed: records.length,
                records_inserted: successCount,
                records_failed: errorCount,
                table: tableName,
            },
        };

        console.log("🎉 Import complete!", result);

        return new Response(
            JSON.stringify(result),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("❌ Import error:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message || "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}
