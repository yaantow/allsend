import { Settings as SettingsIcon, Shield, Bell, Database } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-title">
                    <h1>Settings</h1>
                    <p className="page-description">
                        Configure your BridgeKit instance
                    </p>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {/* General Settings */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <SettingsIcon size={20} />
                            <h3 className="card-title">General</h3>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <SettingRow
                            label="Instance Name"
                            description="A friendly name for your BridgeKit instance"
                            type="text"
                            value="My BridgeKit"
                        />
                        <SettingRow
                            label="Timezone"
                            description="Timezone for displaying timestamps"
                            type="select"
                            value="UTC"
                            options={['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']}
                        />
                    </div>
                </div>

                {/* Security */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <Shield size={20} />
                            <h3 className="card-title">Security</h3>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <SettingRow
                            label="API Key"
                            description="Use this key to authenticate API requests"
                            type="secret"
                            value="bk_live_xxxxxxxxxxxxxxxxxxxx"
                        />
                        <SettingRow
                            label="Webhook Secret"
                            description="Secret for verifying incoming webhooks"
                            type="secret"
                            value="whsec_xxxxxxxxxxxxxxxxxxxx"
                        />
                    </div>
                </div>

                {/* Notifications */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <Bell size={20} />
                            <h3 className="card-title">Notifications</h3>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <SettingRow
                            label="Error Alerts"
                            description="Send alerts when channel connections fail"
                            type="toggle"
                            value={true}
                        />
                        <SettingRow
                            label="Daily Summary"
                            description="Receive a daily summary of activity"
                            type="toggle"
                            value={false}
                        />
                    </div>
                </div>

                {/* Database */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <Database size={20} />
                            <h3 className="card-title">Database</h3>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <SettingRow
                            label="Convex URL"
                            description="Your Convex deployment URL"
                            type="text"
                            value={import.meta.env.VITE_CONVEX_URL || 'Not configured'}
                        />
                        <SettingRow
                            label="Message Retention"
                            description="How long to keep message history"
                            type="select"
                            value="30 days"
                            options={['7 days', '30 days', '90 days', 'Forever']}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

interface SettingRowProps {
    label: string;
    description: string;
    type: 'text' | 'secret' | 'toggle' | 'select';
    value: string | boolean;
    options?: string[];
}

function SettingRow({ label, description, type, value, options }: SettingRowProps) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-md) 0',
                borderBottom: '1px solid var(--color-border)',
            }}
        >
            <div>
                <div style={{ fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    {description}
                </div>
            </div>
            <div>
                {type === 'text' && (
                    <input
                        type="text"
                        defaultValue={value as string}
                        style={{
                            background: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-sm) var(--space-md)',
                            color: 'var(--color-text)',
                            width: '250px',
                        }}
                    />
                )}
                {type === 'secret' && (
                    <input
                        type="password"
                        defaultValue={value as string}
                        style={{
                            background: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-sm) var(--space-md)',
                            color: 'var(--color-text)',
                            width: '250px',
                            fontFamily: 'var(--font-mono)',
                        }}
                    />
                )}
                {type === 'select' && (
                    <select
                        defaultValue={value as string}
                        style={{
                            background: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-sm) var(--space-md)',
                            color: 'var(--color-text)',
                            width: '180px',
                        }}
                    >
                        {options?.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                )}
                {type === 'toggle' && (
                    <button
                        style={{
                            width: '50px',
                            height: '26px',
                            borderRadius: 'var(--radius-full)',
                            background: value ? 'var(--color-primary)' : 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            position: 'relative',
                            cursor: 'pointer',
                        }}
                    >
                        <div
                            style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: 'white',
                                position: 'absolute',
                                top: '2px',
                                left: value ? '26px' : '2px',
                                transition: 'left 0.2s ease',
                            }}
                        />
                    </button>
                )}
            </div>
        </div>
    );
}
