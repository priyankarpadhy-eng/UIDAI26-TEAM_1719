import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useShortcuts = (extraActions = {}) => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Use Alt as the primary modifier to avoid browser conflicts
            if (e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'm':
                        e.preventDefault();
                        navigate('/');
                        break;
                    case 's':
                        e.preventDefault();
                        navigate('/settings');
                        break;
                    case 'n':
                        e.preventDefault();
                        navigate('/notebook');
                        break;
                    case 'e':
                        e.preventDefault();
                        navigate('/decision-engine');
                        break;
                    case 'u':
                        e.preventDefault();
                        navigate('/sources');
                        break;
                }
            }

            // Execute context-specific actions
            if (e.altKey && extraActions[e.key.toLowerCase()]) {
                e.preventDefault();
                extraActions[e.key.toLowerCase()]();
            }

            if (e.key === 'Escape' && extraActions['escape']) {
                extraActions['escape']();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, extraActions]);
};
