import React, { createContext, useContext, useState } from 'react';

const CanvasContext = createContext({
    isCanvasLocked: false,
    setIsCanvasLocked: () => { }
});

export const CanvasProvider = ({ children }) => {
    const [isCanvasLocked, setIsCanvasLocked] = useState(false);

    return (
        <CanvasContext.Provider value={{ isCanvasLocked, setIsCanvasLocked }}>
            {children}
        </CanvasContext.Provider>
    );
};

export const useCanvas = () => useContext(CanvasContext);
