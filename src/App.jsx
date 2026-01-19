import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/common/Header';
import DataSources from './pages/DataSources';
import NotebookPage from './pages/NotebookPage';
import PincodeMapPage from './pages/PincodeMapPage';
import DecisionCanvas from './components/decision-engine/DecisionCanvas';
import SettingsPage from './pages/SettingsPage';
import Dashboard from './pages/Dashboard';
import { DataProvider } from './context/DataContext';
import { FlowProvider } from './context/FlowContext';
import { useShortcuts } from './hooks/useShortcuts';

function App() {
    // Enable global navigation shortcuts
    useShortcuts();

    return (
        <DataProvider>
            <FlowProvider>
                <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
                    {/* Header Navigation */}
                    <Header />

                    <div className="flex-1 overflow-hidden relative">
                        <main className="h-full w-full bg-gray-50 text-gray-900 overflow-hidden relative">
                            <Routes>
                                <Route path="/" element={<PincodeMapPage />} />
                                <Route path="/sources" element={<div className="h-full overflow-y-auto"><DataSources /></div>} />
                                <Route path="/notebook" element={<div className="h-full overflow-y-auto"><NotebookPage /></div>} />
                                <Route path="/decision-engine" element={<div className="h-full w-full p-4"><DecisionCanvas /></div>} />
                                <Route path="/reports" element={<div className="h-full overflow-y-auto"><div className="flex items-center justify-center h-full text-gray-400">Reports Module Coming Soon</div></div>} />
                                <Route path="/demographics" element={<div className="h-full overflow-y-auto"><Dashboard /></div>} />
                                <Route path="/settings" element={<div className="h-full overflow-y-auto"><SettingsPage /></div>} />
                                <Route path="/help" element={<div className="h-full overflow-y-auto"><div className="flex items-center justify-center h-full text-gray-400">Help & Support Module Coming Soon</div></div>} />
                            </Routes>
                        </main>
                    </div>
                </div>
            </FlowProvider>
        </DataProvider>
    );
}

export default App;
