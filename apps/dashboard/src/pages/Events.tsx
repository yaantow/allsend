import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Activity, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Demo data fallback
const demoEvents = [
    { _id: '1' as any, type: 'message.received', channelType: 'telegram', timestamp: Date.now() - 1000 * 60 * 2 },
    { _id: '2' as any, type: 'adapter.connected', channelType: 'discord', timestamp: Date.now() - 1000 * 60 * 5 },
    { _id: '3' as any, type: 'message.sent', channelType: 'telegram', timestamp: Date.now() - 1000 * 60 * 10 },
    { _id: '4' as any, type: 'reaction.added', channelType: 'discord', timestamp: Date.now() - 1000 * 60 * 15 },
    { _id: '5' as any, type: 'adapter.disconnected', channelType: 'whatsapp', timestamp: Date.now() - 1000 * 60 * 30 },
];

export default function Events() {
    let events: typeof demoEvents;

    try {
        const convexEvents = useQuery(api.events.list, { limit: 50 });
        events = convexEvents ?? demoEvents;
    } catch {
        events = demoEvents;
    }

    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-title">
                    <h1>Events</h1>
                    <p className="page-description">
                        Real-time activity feed across all channels
                    </p>
                </div>
                <button className="btn btn-secondary">
                    <Filter size={16} />
                    Filter
                </button>
            </header>

            <div className="card">
                <div className="event-list">
                    {events.map((event) => (
                        <div key={event._id} className="event-item">
                            <div className="event-icon">
                                <Activity size={16} />
                            </div>
                            <div className="event-content">
                                <span className="event-type">{event.type}</span>
                                <span className={`event-channel ${event.channelType}`}>
                                    {event.channelType}
                                </span>
                            </div>
                            <span className="event-time">
                                {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
