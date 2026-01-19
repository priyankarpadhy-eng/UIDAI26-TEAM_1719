import React, { memo, useState } from 'react';
import { useReactFlow } from 'reactflow';
import { Globe, Play, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import BaseNode from './BaseNode';

const APINode = ({ id, data, isConnectable }) => {
    const [url, setUrl] = useState(data.apiUrl || 'https://jsonplaceholder.typicode.com/users');
    const [status, setStatus] = useState('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const { setNodes, setEdges } = useReactFlow();

    const handleFetch = async () => {
        setStatus('loading');
        setErrorMsg('');

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const jsonData = await response.json();

            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === id) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                apiUrl: url,
                                fetchedData: Array.isArray(jsonData) ? jsonData : [jsonData],
                                fetchedAt: new Date().toISOString()
                            }
                        };
                    }
                    return node;
                })
            );

            setStatus('success');
        } catch (err) {
            setErrorMsg(err.message);
            setStatus('error');
        }
    };

    return (
        <BaseNode
            id={id}
            title="API Source"
            icon={Globe}
            color="purple"
            isConnectable={isConnectable}
            handles={['right']}
        >
            <div className="space-y-3">
                <div>
                    <label className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Endpoint URL</label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://api.example.com/data"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 font-mono outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
                    />
                </div>

                <button
                    onClick={handleFetch}
                    disabled={status === 'loading' || !url}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all shadow-sm ${status === 'success'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : status === 'error'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 hover:border-purple-300'
                        } disabled:opacity-50`}
                >
                    {status === 'loading' ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Fetching...</>
                    ) : status === 'success' ? (
                        <><CheckCircle2 className="w-3 h-3" /> Data Ready</>
                    ) : status === 'error' ? (
                        <><AlertCircle className="w-3 h-3" /> Retry</>
                    ) : (
                        <><Play className="w-3 h-3" /> Fetch Data</>
                    )}
                </button>

                {status === 'error' && <p className="text-[9px] text-red-500 font-medium">{errorMsg}</p>}
                {status === 'success' && data.fetchedData && (
                    <p className="text-[9px] text-emerald-600 font-medium bg-emerald-50 p-1.5 rounded border border-emerald-100 mt-1">
                        ✓ {data.fetchedData.length} records loaded successfully
                    </p>
                )}
            </div>
        </BaseNode>
    );
};

export default memo(APINode);
