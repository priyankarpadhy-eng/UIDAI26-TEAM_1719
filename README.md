# S.A.M.A.R.T.H. - Smart Analytics & Multi-Agent Real-time Heuristics

> A Next-Gen "Decision Engine" for analyzing UIDAI/Public Sector Data using Flow-Based Programming and Agentic AI.

## 🚀 Overview

S.A.M.A.R.T.H. (Systems for Analysis, Modeling, and Real-Time Heuristics) is a visual decision-making platform. Unlike traditional dashboards where analysts stare at static charts, S.A.M.A.R.T.H. allows users to **build logic flows** to automate analysis.

It combines:
1.  **Drag-and-Drop Canvas**: Connect data sources, filters, and logic blocks.
2.  **Multi-Agent AI**: Three specialized AI agents (Data, Risk, Policy) analyze the data in parallel.
3.  **Real-Time Execution**: Logic runs instantly in the browser using Supabase and In-Memory acceleration.

---

## 🏗️ The Node Canvas: How it Works

The core of S.A.M.A.R.T.H. is the **Infinite Canvas**. Users construct "pipelines" by connecting nodes. Data flows from left to right.

### 1. Data Source Nodes (The Inputs)
These nodes fetch data from the outside world.
-   **🗄️ Database Node**: Connects directly to the Supabase `enrollments` table.
-   **📁 File Node**: Allows uploading CSV/Excel files for ad-hoc analysis.
-   **🌐 API Node**: Fetches JSON data from external public APIs.

### 2. Logic & Transformation Nodes (The Processors)
These nodes act as "Gates" or "Modifiers" for the data stream.
-   **📍 Region Filter**: Filters downstream data by State, District, or Pincode.
-   **🧮 Math Node**: Performs calculations (e.g., Saturation = `Enrollments / Population`).
-   **🚦 Logic Node**: The Decision Maker. It emits a **Signal** (True/False) if a condition is met (e.g., `IF Saturation < 50% THEN Signal = TRUE`).

### 3. Visualization Nodes (The Outputs)
-   **📊 Graph Node**: An "AI-Aware" chart that automatically picks the best visualization (Bar/Line/Pie) based on your data columns.
-   **🤖 Analysis Node**: (See Section Below) The AI integration point.
-   **🚨 Action Node**: Triggers an alert (Email/SMS/Report) when it receives a 'True' signal from a Logic Node.

---

## 🧠 The AI Analyst: Multi-Agent Intelligence

Traditional AI chatbots are linear. S.A.M.A.R.T.H. uses a **Multi-Agent Consensus System** driven by the `AnalysisNode`.

### How It Works:
1.  **Connection**: You drag a wire from any Data Source (DB, File, Table) to the `Multi-AI Analyst` node.
2.  **Ingestion**: The node identifies all connected datasets. If multiple sources are connected (e.g., Enrollments + Bank Linkage), it performs a **Smart Join** on common keys (like Pincode).
3.  **Parallel Execution**: It dispatches the data to **3 Distinct Personas** simultaneously via Groq (Llama 3.3):

| Agent Persona | Role | Focus Area |
| :--- | :--- | :--- |
| **📊 Data Analyst** | Statistician | Finds patterns, correlations, and data quality issues. |
| **⚠️ Risk Analyst** | Auditor | Hunts for anomalies, fraud risks, and zero-coverage areas. |
| **📋 Policy Advisor** | Strategist | Synthesizes findings into actionable government policy. |

### The "Consensus Engine"
After the 3 agents finish, their outputs are fed into a **Consensus Algorithm**.
-   It calculates a **Confidence Score** (0-100%).
-   If the Risk Analyst says "High Risk" but the Data Analyst says "Data Quality is Bad", the system lowers confidence.
-   It produces a final **Executive Summary** that balances caution (Risk) with action (Policy).

---

## 🛠️ Technical Architecture

### 1. Decoupled Data Store
To ensure 60FPS performance on the canvas, we do **not** pass raw data through the visual edges.
-   **Mechanism**: A global `DataStore` (In-Memory Map) holds the heavy JSON arrays.
-   **Edges**: Only carry a lightweight `datasetId` string.
-   **Result**: You can visualize 50,000 records without the UI lagging.

### 2. Recursive Flow Engine (`useFlowEngine.js`)
The engine doesn't just "run" nodes; it "walks" the graph.
-   It starts from your `DatabaseNode`.
-   It recursively asks downstream nodes: *"Do you have any filters?"*
-   It aggregates all constraints (e.g., `State=Odisha` AND `Age>18`) into a single optimized SQL query.
-   This ensures we fetch only what is needed, saving bandwidth and cost.

### 3. Heuristic Visualizer
The `GraphNode` isn't just a dummy chart. It inspects your data structure:
-   *Has Date Column?* -> **Line Chart**.
-   *Few Categories?* -> **Pie Chart**.
-   *Many Numbers?* -> **Bar Chart**.
-   It also calculates a **Data Quality Score** instantly to warn users about bad data.

---

## 🚀 Getting Started

1.  **Clone the Repo**: `git clone https://github.com/your-org/samarth-uidai.git`
2.  **Install Dependencies**: `npm install`
3.  **Environment Setup**: Create a `.env` file with `VITE_SUPABASE_URL` and `VITE_GROQ_API_KEY`.
4.  **Run Dev Server**: `npm run dev`

---

*Built for UIDAI Hackathon 2024 by Team 1719.*
