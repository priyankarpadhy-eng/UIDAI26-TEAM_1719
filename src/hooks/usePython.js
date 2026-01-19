import { useState, useEffect, useRef } from 'react';

// Configuration
const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";

/**
 * Custom Hook to manage the Pyodide Python Runtime.
 * Handles loading, package installation (pandas), and code execution.
 */
export const usePython = () => {
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const pyodideRef = useRef(null);

    // Initialize Pyodide on mount
    useEffect(() => {
        const loadPyodide = async () => {
            try {
                // Check if script is already present
                if (!document.querySelector(`script[src="${PYODIDE_CDN}"]`)) {
                    const script = document.createElement('script');
                    script.src = PYODIDE_CDN;
                    script.async = true;
                    document.body.appendChild(script);

                    await new Promise((resolve) => {
                        script.onload = resolve;
                    });
                } else if (!window.loadPyodide) {
                    // Wait for it to be available if script exists but not loaded
                    await new Promise(r => setTimeout(r, 1000));
                }

                // Initialize runtime
                if (!pyodideRef.current) {
                    console.log("Initializing Pyodide...");
                    const pyodide = await window.loadPyodide({
                        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
                    });

                    // Install Dependencies
                    await pyodide.loadPackage("micropip");
                    const micropip = pyodide.pyimport("micropip");
                    await micropip.install("pandas");

                    pyodideRef.current = pyodide;
                    console.log("Pyodide Ready with Pandas.");
                }

                setIsReady(true);
            } catch (err) {
                console.error("Failed to load Pyodide:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (!pyodideRef.current) {
            loadPyodide();
        }
    }, []);

    /**
     * Executes Python code within the runtime.
     * @param {string} code - The Python script to run.
     * @param {Array} contextVariables - Array of objects { name: "varName", value: "data" } to inject.
     * @param {Array} csvFiles - Array of File objects to mount to the virtual FS.
     */
    const runPythonCode = async (code, csvFiles = []) => {
        if (!pyodideRef.current) throw new Error("Pyodide not loaded");

        try {
            const pyodide = pyodideRef.current;

            // 1. Mount Files (Virtual FS)
            for (const file of csvFiles) {
                // We need to read the file content as text/buffer
                // If 'file' is from our DataContext, it might be the parsed JSON 'data' or the original 'file' object.
                // Our current FileUploader stores parsed data. But Pyodide pandas prefers CSV strings usually.
                // Ideally, we regenerate the CSV string from JSON or pass JSON directly.
                // Let's assume we pass the raw CSV content string for now.

                if (file.content) {
                    pyodide.FS.writeFile(file.name, file.content);
                }
            }

            // 2. Set strict globals clearance if needed, but for now we just run
            // 3. Execution Wrapper to capture 'result'
            // We wrap user code to ensure it returns the variable 'result' as a JSON string
            const wrappedCode = `
import pandas as pd
import json

${code}

# Serialization
# The user code MUST produce a variable named 'result' which is a Dict { pincode: value }
json.dumps(result)
            `;

            const output = await pyodide.runPythonAsync(wrappedCode);

            // 4. Cleanup Files (Optional, but good for memory)
            for (const file of csvFiles) {
                if (file.name) try { pyodide.FS.unlink(file.name); } catch (e) { }
            }

            return JSON.parse(output);

        } catch (err) {
            console.error("Python Execution Error:", err);
            throw err;
        }
    };

    return { isReady, isLoading, error, runPythonCode };
};
