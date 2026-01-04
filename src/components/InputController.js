import { useEffect } from 'react';

// <=== {InputHandler} :: {Global keyboard listener} ===>
const InputController = ({ onInput }) => {
    
    useEffect(() => {
        const handleKeyDown = (e) => {
            let eventName = null;
            
            // Map keys
            switch(e.key) {
                case 'ArrowUp': eventName = 'Up'; break;
                case 'ArrowDown': eventName = 'Down'; break;
                case 'ArrowLeft': eventName = 'Left'; break;
                case 'ArrowRight': eventName = 'Right'; break;
                case 'Enter': eventName = 'Enter'; break;
                case 'm': eventName = 'Menu'; break;
            }

            if (eventName) {
                onInput(eventName);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onInput]);

    return null; // Invisible component
};

export default InputController;
