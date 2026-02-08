import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Activity, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Events() {
    const events = useQuery(api.events.list, { limit: 50 }) ?? [];

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
