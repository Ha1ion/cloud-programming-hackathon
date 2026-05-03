import { useState, useEffect } from 'react'

// Define TypeScript interfaces for the device and props
interface Device {
  eventId: string
  deviceId: string
  alertStatus: string
  status: 'EMERGENCY' | 'SUSPICIOUS' | 'NORMAL'
  timestamp: number
}

interface StatCardProps {
  label: string;
  value: number;
  valueClass: string;
}

interface DeviceCardProps {
  device: Device;
}

const MOCK_DATA: Device[] = [
  { eventId: 'evt-1777600026271', deviceId: 'mock-001', alertStatus: 'NONE', status: 'EMERGENCY', timestamp: Date.now() - 1000 * 60 * 2 },
  { eventId: 'evt-1777601047130', deviceId: 'mock-002', alertStatus: 'PENDING', status: 'SUSPICIOUS', timestamp: Date.now() - 1000 * 60 * 8 },
  { eventId: 'evt-1777601200000', deviceId: 'mock-003', alertStatus: 'NONE', status: 'NORMAL', timestamp: Date.now() - 1000 * 60 * 15 },
  { eventId: 'evt-1777601300000', deviceId: 'mock-004', alertStatus: 'NONE', status: 'NORMAL', timestamp: Date.now() - 1000 * 60 * 30 },
  { eventId: 'evt-1777601400000', deviceId: 'mock-005', alertStatus: 'PENDING', status: 'SUSPICIOUS', timestamp: Date.now() - 1000 * 60 * 45 },
  { eventId: 'evt-1777601500000', deviceId: 'mock-006', alertStatus: 'NONE', status: 'EMERGENCY', timestamp: Date.now() - 1000 * 45 },
  { eventId: 'evt-1777601600000', deviceId: 'mock-007', alertStatus: 'NONE', status: 'NORMAL', timestamp: Date.now() - 1000 * 60 * 60 },
]

const STATUS_STYLES = {
  EMERGENCY: {
    border: 'border-l-red-600',
    badge: 'bg-red-50 text-red-700',
    indicator: 'bg-red-50',
    icon: 'text-red-700',
  },
  SUSPICIOUS: {
    border: 'border-l-amber-600',
    badge: 'bg-amber-50 text-amber-700',
    indicator: 'bg-amber-50',
    icon: 'text-amber-700',
  },
  NORMAL: {
    border: 'border-l-green-600',
    badge: 'bg-green-50 text-green-700',
    indicator: 'bg-green-50',
    icon: 'text-green-700',
  },
}

const STATUS_ORDER = { EMERGENCY: 0, SUSPICIOUS: 1, NORMAL: 2 }

// Add type annotation for FILTERS
const FILTERS: Array<'ALL' | 'EMERGENCY' | 'SUSPICIOUS' | 'NORMAL'> = ['ALL', 'EMERGENCY', 'SUSPICIOUS', 'NORMAL'];

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// Add type annotations to StatCard
function StatCard({ label, value, valueClass }: StatCardProps) {
  return (
    <div className="bg-gray-100 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-widest font-mono mb-1">{label}</p>
      <p className={`text-2xl font-medium ${valueClass}`}>{value}</p>
    </div>
  );
}

// Add type annotations to DeviceCard
function DeviceCard({ device }: DeviceCardProps) {
  const s = STATUS_STYLES[device.status] ?? STATUS_STYLES.NORMAL;
  const isPendingAlert = device.alertStatus === 'PENDING';
  const isMissingAlert = device.status === 'EMERGENCY' && device.alertStatus === 'NONE';

  return (
    <div
      className={`bg-white border border-gray-200 border-l-4 ${s.border} rounded-xl px-4 py-3 grid grid-cols-[28px_1fr_auto_auto] items-center gap-3`}
    >
      <div
        className={`w-7 h-7 rounded-full ${s.indicator} flex items-center justify-center flex-shrink-0`}
      >
        <svg className={`w-4 h-4 ${s.icon}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM19 17H5v-5h14v5z" />
          <circle cx="7.5" cy="14.5" r="1.5" />
          <circle cx="16.5" cy="14.5" r="1.5" />
        </svg>
      </div>

      <div>
        <p className="font-mono text-sm font-medium text-gray-900">{device.deviceId}</p>
        <p className="font-mono text-xs text-gray-400">{device.eventId}</p>
        {isMissingAlert && (
          <p className="text-xs text-red-600 mt-0.5">⚠ Emergency with no alert dispatched</p>
        )}
      </div>

      <div className="flex flex-col gap-1 items-end">
        <span className={`font-mono text-xs font-medium px-2 py-0.5 rounded ${s.badge}`}>
          {device.status}
        </span>
        <span
          className={`font-mono text-xs px-2 py-0.5 rounded border ${
            isPendingAlert
              ? 'border-amber-400 text-amber-700 bg-amber-50'
              : 'border-gray-200 text-gray-400'
          }`}
        >
          {device.alertStatus}
        </span>
      </div>

      <p className="font-mono text-xs text-gray-400 text-right">{timeAgo(device.timestamp)}</p>
    </div>
  );
}

// Update state types in ScooterDashboard
export default function ScooterDashboard() {
  const [devices, setDevices] = useState<Device[]>(MOCK_DATA);
  const [filter, setFilter] = useState<string>('ALL');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/events`);
      const data: Device[] = await res.json();
      setDevices(data);
      setLastUpdated(new Date());
    };

    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = devices
    .filter((d) => filter === 'ALL' || d.status === filter)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const emergency = devices.filter((d) => d.status === 'EMERGENCY').length;
  const suspicious = devices.filter((d) => d.status === 'SUSPICIOUS').length;
  const normal = devices.filter((d) => d.status === 'NORMAL').length;

  return (
    <div className="p-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
        <div>
          <h1 className="font-mono text-sm font-medium tracking-widest text-gray-900">SCOOTERWATCH</h1>
          <p className="text-xs text-gray-400 mt-0.5">Fleet Crash Detection System</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-700 animate-pulse" />
          <span className="font-mono text-xs text-gray-400">LIVE</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <StatCard label="Total" value={devices.length} valueClass="text-gray-900" />
        <StatCard
          label="Emergency"
          value={emergency}
          valueClass={emergency > 0 ? 'text-red-600' : 'text-green-700'}
        />
        <StatCard
          label="Suspicious"
          value={suspicious}
          valueClass={suspicious > 0 ? 'text-amber-600' : 'text-green-700'}
        />
        <StatCard label="Normal" value={normal} valueClass="text-green-700" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-mono text-xs px-3 py-1.5 rounded border transition-colors ${
              filter === f
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-300 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Device list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No devices match this filter.</p>
        ) : (
          filtered.map((d) => <DeviceCard key={d.eventId} device={d} />)
        )}
      </div>

      {/* Footer */}
      {lastUpdated && (
        <p className="font-mono text-xs text-gray-400 text-right mt-4">
          Last refreshed: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
