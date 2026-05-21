import { useState, useEffect, Fragment } from 'react'

interface Device {
  eventId: string
  deviceId: string
  alertStatus: string
  status: 'EMERGENCY' | 'SUSPICIOUS' | 'SAFE'
  timestamp: number
  acceleration?: number
  tilt?: number
  gyro?: number
  humidity?: number
  rainStatus?: 'RAIN' | 'NO_RAIN'
  lastRainNotification?: number
}

interface StatCardProps {
  label: string;
  value: string | number;
  valueClass: string;
  sub?: string;
}

interface DeviceCardProps {
  device: Device;
}

const MOCK_DATA: Device[] = [
  { eventId: 'loading...', deviceId: 'SCANNING', alertStatus: 'NONE', status: 'SAFE', timestamp: Date.now() },
]

const STATUS_STYLES = {
  EMERGENCY: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-700',
    iconBg: 'bg-red-50',
    icon: 'text-red-500',
  },
  SUSPICIOUS: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    iconBg: 'bg-amber-50',
    icon: 'text-amber-500',
  },
  SAFE: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    iconBg: 'bg-emerald-50',
    icon: 'text-emerald-500',
  },
}

const STATUS_ORDER = { EMERGENCY: 0, SUSPICIOUS: 1, SAFE: 2 }

const FILTERS: Array<'ALL' | 'EMERGENCY' | 'SUSPICIOUS' | 'SAFE' | 'RAIN' | 'DRY'> = ['ALL', 'EMERGENCY', 'SUSPICIOUS', 'SAFE', 'RAIN', 'DRY']

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function RainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
      <line x1="8" y1="16" x2="8" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
      <line x1="16" y1="16" x2="16" y2="20" />
    </svg>
  )
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function StatCard({ label, value, valueClass, sub }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-400 uppercase tracking-widest font-mono mb-2">{label}</p>
      <p className={`text-2xl font-semibold font-mono ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function RainBadge({ rainStatus }: { rainStatus?: 'RAIN' | 'NO_RAIN' }) {
  const isRaining = rainStatus === 'RAIN'
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-semibold ${
        isRaining
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-500 border border-gray-200'
      }`}
    >
      {isRaining ? (
        <RainIcon className="w-4 h-4" />
      ) : (
        <SunIcon className="w-4 h-4" />
      )}
      {isRaining ? 'RAINING' : 'DRY'}
    </div>
  )
}

function DeviceCard({ device }: DeviceCardProps) {
  const s = STATUS_STYLES[device.status] ?? STATUS_STYLES.SAFE
  const isPendingAlert = device.alertStatus === 'PENDING'
  const isMissingAlert = device.status === 'EMERGENCY' && device.alertStatus === 'NONE'

  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${s.border} rounded-xl p-4 flex flex-col gap-3`}>
      {/* Top row: icon + device info + badges + time */}
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <svg className={`w-4 h-4 ${s.icon}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM19 17H5v-5h14v5z" />
            <circle cx="7.5" cy="14.5" r="1.5" />
            <circle cx="16.5" cy="14.5" r="1.5" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-semibold text-gray-900">{device.deviceId}</p>
          <p className="font-mono text-xs text-gray-400 truncate">{device.eventId}</p>
          {isMissingAlert && (
            <p className="text-xs text-red-600 mt-1 font-medium">No alert dispatched for emergency</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex gap-1.5">
            <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-md ${s.badge}`}>
              {device.status}
            </span>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded-md border ${
                isPendingAlert
                  ? 'border-amber-300 text-amber-700 bg-amber-50'
                  : 'border-gray-200 text-gray-400 bg-gray-50'
              }`}
            >
              {device.alertStatus}
            </span>
          </div>
          <p className="font-mono text-xs text-gray-400">{timeAgo(device.timestamp)}</p>
        </div>
      </div>

      {/* Bottom row: rain badge + sensor readings */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100 flex-wrap">
        <RainBadge rainStatus={device.rainStatus} />
        <div className="flex gap-4 flex-wrap">
          {device.acceleration !== undefined && (
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Accel</span>
              <span className="font-mono text-xs font-medium text-gray-700">{device.acceleration.toFixed(1)} m/s²</span>
            </div>
          )}
          {device.tilt !== undefined && (
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Tilt</span>
              <span className="font-mono text-xs font-medium text-gray-700">{device.tilt}°</span>
            </div>
          )}
          {device.gyro !== undefined && (
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Gyro</span>
              <span className="font-mono text-xs font-medium text-gray-700">{device.gyro}</span>
            </div>
          )}
          {device.humidity !== undefined && (
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Humidity</span>
              <span className="font-mono text-xs font-medium text-gray-700">{device.humidity}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ScooterDashboardProps {
  onLogout?: () => void
}

export default function ScooterDashboard({ onLogout }: ScooterDashboardProps) {
  const [devices, setDevices] = useState<Device[]>(MOCK_DATA)
  const [filter, setFilter] = useState<string>('ALL')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDevices = async () => {
      if (document.hidden) return

      try {
        const apiUrl = import.meta.env.VITE_API_URL ?? ''

        const res = await fetch(`${apiUrl}/events`)

        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`)

        const contentType = res.headers.get('content-type') ?? ''
        if (!contentType.includes('application/json')) throw new Error('Backend not ready')

        const raw = await res.json()
        const data: Device[] = (Array.isArray(raw) ? raw : raw.body ? JSON.parse(raw.body) : [])
          .map((d: Device) => ({
            ...d,
            rainStatus: d.rainStatus === ('DRY' as string) ? 'NO_RAIN' : d.rainStatus,
          }))

        if (Array.isArray(data)) {
          // Sort by timestamp desc, then keep only the latest event per device
          const sortedData = data.sort((a, b) => b.timestamp - a.timestamp)
          const uniqueDevicesMap = new Map<string, Device>()
          sortedData.forEach((device) => {
            if (!uniqueDevicesMap.has(device.deviceId)) {
              uniqueDevicesMap.set(device.deviceId, device)
            }
          })
          setDevices(Array.from(uniqueDevicesMap.values()))
          setLastUpdated(new Date())
          setError(null)
        }
      } catch (err: any) {
        console.error('Fetch error:', err.message)
        setError('API Connection Failed')
      }
    }

    fetchDevices()
    const interval = setInterval(fetchDevices, 30000)
    return () => clearInterval(interval)
  }, [])

  const filtered = devices
    .filter((d) => {
      if (filter === 'ALL') return true
      if (filter === 'RAIN') return d.rainStatus === 'RAIN'
      if (filter === 'DRY') return d.rainStatus === 'NO_RAIN'
      return d.status === filter
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])

  const emergency = devices.filter((d) => d.status === 'EMERGENCY').length
  const suspicious = devices.filter((d) => d.status === 'SUSPICIOUS').length
  const safe = devices.filter((d) => d.status === 'SAFE').length
  const raining = devices.filter((d) => d.rainStatus === 'RAIN').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div>
            <h1 className="font-mono text-base font-bold tracking-widest text-gray-900">SCOOTERWATCH</h1>
            <p className="text-xs text-gray-400 mt-0.5">Fleet Crash Detection System</p>
          </div>
          <div className="flex items-center gap-2">
            {error ? (
              <span className="font-mono text-xs text-red-500 font-bold">● {error}</span>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-xs text-emerald-700 font-medium">LIVE</span>
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="font-mono text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Sign out
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" value={devices.length} valueClass="text-gray-900" />
          <StatCard
            label="Emergency"
            value={emergency}
            valueClass={emergency > 0 ? 'text-red-600' : 'text-gray-400'}
          />
          <StatCard
            label="Suspicious"
            value={suspicious}
            valueClass={suspicious > 0 ? 'text-amber-600' : 'text-gray-400'}
          />
          <StatCard label="Safe" value={safe} valueClass="text-emerald-600" />
        </div>

        {/* Rain summary banner */}
        <div
          className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-5 border ${
            raining > 0
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-gray-200 text-gray-500'
          }`}
        >
          {raining > 0 ? (
            <RainIcon className="w-5 h-5 flex-shrink-0" />
          ) : (
            <SunIcon className="w-5 h-5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-mono text-sm font-semibold">
              {raining > 0
                ? `Rain detected on ${raining} of ${devices.length} scooters`
                : 'No rain detected across fleet'}
            </p>
          </div>
          <span className="font-mono text-sm font-bold opacity-80">{raining}/{devices.length}</span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          {FILTERS.map((f, i) => {
            const isRainFilter = f === 'RAIN' || f === 'DRY'
            const active = filter === f
            let activeClass = 'bg-gray-900 text-white border-gray-900'
            if (active && f === 'RAIN') activeClass = 'bg-blue-600 text-white border-blue-600'
            if (active && f === 'DRY') activeClass = 'bg-amber-500 text-white border-amber-500'
            return (
              <Fragment key={f}>
                {i === FILTERS.indexOf('RAIN') && (
                  <span className="w-px h-5 bg-gray-200 mx-1" />
                )}
                <button
                  onClick={() => setFilter(f)}
                  className={`font-mono text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                    active
                      ? activeClass
                      : isRainFilter
                        ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {f === 'RAIN' && <RainIcon className="w-3 h-3" />}
                  {f === 'DRY' && <SunIcon className="w-3 h-3" />}
                  {f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              </Fragment>
            )
          })}
        </div>

        {/* Device list */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No devices match this filter.</p>
          ) : (
            filtered.map((d) => <DeviceCard key={d.eventId} device={d} />)
          )}
        </div>

        {/* Footer */}
        {lastUpdated && (
          <p className="font-mono text-xs text-gray-400 text-right mt-5">
            Last refreshed: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  )
}
