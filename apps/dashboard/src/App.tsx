import { Routes, Route, NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Radio,
    MessageSquare,
    Activity,
    Settings,
    Zap,
    Book,
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Conversations from './pages/Conversations';
import ConversationDetail from './pages/ConversationDetail';
import Events from './pages/Events';
import SettingsPage from './pages/Settings';
import Docs from './pages/Docs';

export default function App() {

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Zap size={24} />
                        <span>BridgeKit</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <NavLink
                        to="/"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/channels"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Radio size={20} />
                        <span>Channels</span>
                    </NavLink>

                    <NavLink
                        to="/conversations"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <MessageSquare size={20} />
                        <span>Conversations</span>
                    </NavLink>

                    <NavLink
                        to="/events"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Activity size={20} />
                        <span>Events</span>
                    </NavLink>

                    <NavLink
                        to="/docs"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Book size={20} />
                        <span>Docs</span>
                    </NavLink>

                    <div style={{ flex: 1 }} />

                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Settings size={20} />
                        <span>Settings</span>
                    </NavLink>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/channels" element={<Channels />} />
                    <Route path="/conversations" element={<Conversations />} />
                    <Route path="/conversations/:conversationId" element={<ConversationDetail />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/docs" element={<Docs />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Routes>
            </main>
        </div>
    );
}
