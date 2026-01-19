# S.A.M.A.R.T.H. Decision Engine - UIDAI Data Hackathon 2026 Report

## 1. Executive Summary
This report details the technical architecture of the **Decision Engine**, a node-based visual programming interface designed for complex data analysis. The system allows users to construct data pipelines using a "Drag-and-Drop" interface, where each node performs specific tasks like data ingestion, transformation, visualization, and automated decision-making.

---

## 2. Core Architecture: How Data Flows
The most critical design decision in this engine is **Decoupled Data Storage**. To ensure performance when handling thousands of records, we do **not** pass raw data arrays through the React Flow graph edges.

### 2.1 The Data Store Service
**File:** `src/services/DataStore.js`

Instead of passing heavy JSON objects between nodes, the system uses a centralized in-memory registry.

*   **Mechanism**: A global `Map()` object acts as the high-speed cache.
*   **Process**:
    1.  **Producer Node** (e.g., File Upload) parses data and calls `DataStore.set(data)`.
    2.  **DataStore** returns a unique `datasetId` (e.g., `ds_1739...`).
    3.  **React Flow Edge** transfers *only* this lightweight `datasetId` to the next node.
    4.  **Consumer Node** (e.g., Graph) calls `DataStore.get(datasetId)` to retrieve the full dataset when needed.

**Code Reference:**
```javascript
// src/services/DataStore.js
const store = new Map();

export const DataStore = {
    set: (data) => {
        const id = `ds_${Date.now()}`;
        store.set(id, data);
        return id; // Only this ID travels through the graph
    },
    get: (id) => store.get(id)
};
```

---

## 3. Analysis Modules & Node Logic

### 3.1 Heuristic Visualization (GraphNode)
**File:** `src/components/decision-engine/nodes/GraphNode.jsx`

The `GraphNode` allows users to visualize data. However, it includes an "AI-Lite" layer that automatically determines the best chart type based on data topology.

*   **Heuristic Logic**:
    *   **Time Series Detection**: Scans columns for keywords like `date`, `month`, `year`. If found + numeric data exists -> **Line Chart**.
    *   **Low Cardinality**: If there is 1 categorical column and few rows (<8) -> **Pie Chart**.
    *   **Comparison**: Default state with >2 numeric columns -> **Bar Chart**.
*   **Data Quality Check**:
    It iterates through every cell in the linked dataset to calculate a health score:
    ```javascript
    const score = ((totalCells - emptyCells) / totalCells) * 100;
    ```
    This informs the user if their data is "Excellent" or "Needs Attention" before analysis.

### 3.2 Targeted Domain Analysis (SpecificGraphNode)
**File:** `src/components/decision-engine/nodes/SpecificGraphNode.jsx`

This node is hard-coded for high-performance specific queries (e.g., UIDAI Enrollment Data). Unlike generic nodes, it bypasses the `DataStore` and queries the database (Supabase) directly.

*   **Fetching Strategy**:
    *   Listens for a `targetLabel` (e.g., "Odisha").
    *   Executes a `supabase.from('enrollments').select(...)` query.
    *   **Aggregation**: It performs client-side aggregation to merge multiple district-level records into a single state-level daily timeline.

### 3.3 Multi-Source Agentic Analysis (AnalysisNode)
**File:** `src/components/decision-engine/nodes/AnalysisNode.jsx`

This is the "Brain" node. It is designed to accept inputs from *any* number of sources (Databases, APIs, Files).

*   **Connectivity Analyzer**:
    It uses React Flow's `useEdges` hook to perform a reverse-lookup:
    ```javascript
    const sourceEdges = edges.filter(e => e.target === id);
    ```
    It then verifies if the connected sources actually contain valid `datasetId`s before allowing the AI to run.

---

## 4. Visualizers & Rendering Engines

### 4.1 Graph Visualizer
**File:** `src/components/decision-engine/visualizers/GraphVisualizer.jsx`

Handles the actual rendering using the `Recharts` library.

*   **X/Y Axis Intelligence**:
    If the user doesn't manually map columns, the visualizer attempts to guess:
    *   **X-Axis**: Looks for columns matching `/name|state|date/`.
    *   **Y-Axis**: Looks for columns matching `/count|total|value/`.
*   **Rendering**:
    It transforms the raw array `[{name: 'A', val: 10}, ...]` into Recharts-compatiable format and dynamically switches between `<BarChart>`, `<LineChart>`, and `<PieChart>`.

---

## 5. Export Capabilities (DownloadNode)
**File:** `src/components/decision-engine/nodes/DownloadNode.jsx`

Allows extracting insights out of the system.

*   **PDF Generation (`jspdf`)**:
    *   Iterates through the dataset stored in `DataStore`.
    *   Draws a dynamic table on the PDF canvas using specific coordinate calculations (`doc.text(val, x, y)`).
    *   Handles pagination manually (checks if `y > pageHeight`).
*   **Excel Export (`xlsx`)**:
    *   Converts the JSON structure directly into a binary worksheet.
    *   Triggers a browser download of the `.xlsx` file.

---

## 6. Conclusion
The system successfully balances **flexibility** (generic Table/Graph nodes) with **specificity** (SpecificGraphNode for optimizations). By using the `DataStore` singleton pattern, we ensure that the UI remains responsive even when complex analysis graphs are constructed.
