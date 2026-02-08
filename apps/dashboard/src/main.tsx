import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import App from './App';
import './index.css';

// Initialize Convex client
const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
    console.warn(
        'VITE_CONVEX_URL not set. Dashboard will show demo data. ' +
        'Run `npx convex dev` and set VITE_CONVEX_URL in your .env file.'
    );
}

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {convex ? (
            <ConvexProvider client={convex}>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </ConvexProvider>
        ) : (
            <BrowserRouter>
                <App />
            </BrowserRouter>
        )}
    </React.StrictMode>
);
