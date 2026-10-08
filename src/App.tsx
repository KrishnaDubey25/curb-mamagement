import {useEffect, useMemo, useState} from 'react';
import {motion} from 'framer-motion';
import {
  ArrowRight,
  CalendarCheck,
  Camera,
  ChevronRight,
  Clock3,
  LocateFixed,
  LogOut,
  MapPin,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Route,
  Search,
  ShieldAlert,
  Layers,
  Info
} from 'lucide-react';
import {StreetScene, Schematic} from './visuals';
import {BAYS, KIND_LABEL, COLORS, cleanPlate, statusFor, type Kind, type Booking, type Vehicle, type Bay} from './parking/core';
import './style.css';

type RequestKind = 'ambulance' | 'hospital' | 'transit' | 'delivery' | 'general';
type Request = {
  id: string;
  owner: string;
  plate: string;
  reason: RequestKind;
  kind: Kind;
  duration: number;
  created: number;
  status: 'pending' | 'allocated' | 'waitlisted';
  bayId?: string;
};
type AppData = { bookings: Booking[]; vehicles: Vehicle[]; requests: Request[]; minute: number };
type Screen = 'login' | 'home' | 'curbs' | 'map' | 'history';

const DEFAULT: AppData = {
  bookings: [],
  vehicles: [
    {id: 'demo-bus', bayId: 'R06', plate: 'DL1PB4021', arrived: 540, source: 'booking'},
    {id: 'demo-delivery', bayId: 'L02', plate: 'DL01CV8162', arrived: 540, source: 'booking'}
  ],
  requests: [],
  minute: 540
};

const KEY = 'smartcurb-ai-user-v6';
const priority: Record<RequestKind, number> = {ambulance: 0, hospital: 1, transit: 2, delivery: 3, general: 4};
const reasonLabel: Record<RequestKind, string> = {
  ambulance: 'Emergency / ambulance',
  hospital: 'Hospital visit',
  transit: 'Public transport',
  delivery: 'Commercial delivery',
  general: 'Personal vehicle'
};
const roads = [
  {name: 'Connaught Road', detail: 'Illustrative managed corridor · 9 zones', distance: 'Demo area', active: true},
  {name: 'Connaught Place — Inner Circle', detail: 'Future corridor · coverage preview', distance: 'Demo area', active: false},
  {name: 'Janpath Connector', detail: 'Future corridor · coverage preview', distance: 'Demo area', active: false}
];

const fmt = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
const historyDate = (ts: number) => new Date(ts).toLocaleString('en-IN', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});

function readData(): AppData {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Array.isArray(s.bookings) && Array.isArray(s.vehicles) && Array.isArray(s.requests) && Number.isFinite(s.minute)) return s;
  } catch {}
  return DEFAULT;
}

function compatible(req: Request, bay: Bay) {
  if (bay.bookable === false) return false;
  if (req.reason === 'ambulance') return bay.kind === 'parking';
  if (req.reason === 'hospital') return bay.kind === 'parking';
  return bay.kind === req.kind;
}

export function allocateRequests(requests: Request[], bookings: Booking[], vehicles: Vehicle[], now: number) {
  const nextBookings = [...bookings];
  const out = [...requests];
  const ordered = out
    .filter((x) => x.status === 'pending' || x.status === 'waitlisted')
    .sort((a, b) => priority[a.reason] - priority[b.reason] || a.created - b.created || a.id.localeCompare(b.id));

  for (const request of ordered) {
    const bay = BAYS
      .filter((b) => compatible(request, b) && statusFor(b, nextBookings, vehicles, now) === 'available')
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))[0];
    const idx = out.findIndex((r) => r.id === request.id);
    if (bay) {
      out[idx] = {...request, bayId: bay.id, status: 'allocated'};
      nextBookings.push({
        id: request.id,
        bayId: bay.id,
        plate: request.plate,
        name: request.owner,
        start: now,
        duration: request.duration,
        status: 'reserved'
      });
    } else {
      out[idx] = {...request, status: 'waitlisted'};
    }
  }
  return {requests: out, bookings: nextBookings};
}

export default function App() {
  const [data, setData] = useState<AppData>(readData);
  const [screen, setScreen] = useState<Screen>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loc, setLoc] = useState('Demo location: Connaught Place, New Delhi');
  const [position, setPosition] = useState<{lat: number; lon: number} | null>(null);
  const [gpsStatus, setGpsStatus] = useState('Demo location selected');
  const [origin, setOrigin] = useState('Connaught Place, New Delhi');
  const [destination, setDestination] = useState('Connaught Road, New Delhi');
  const [selected, setSelected] = useState('L01');
  const [mode, setMode] = useState<'3d' | '2d'>('3d');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [reason, setReason] = useState<RequestKind>('general');
  const [duration, setDuration] = useState(15);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'quick' | 'bookable'>('all');

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }, [data]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setData((d) => ({...d, minute: d.minute + 1})), 1000);
    return () => clearInterval(id);
  }, [playing]);

  const available = BAYS.filter((b) => statusFor(b, data.bookings, data.vehicles, data.minute) === 'available').length;
  const bay = BAYS.find((b) => b.id === selected) || BAYS[0];
  const currentStatus = statusFor(bay, data.bookings, data.vehicles, data.minute);
  const items = useMemo(
    () => BAYS.filter((b) =>
      filter === 'all' ||
      (filter === 'available' && statusFor(b, data.bookings, data.vehicles, data.minute) === 'available') ||
      (filter === 'quick' && b.kind === 'pickup') ||
      (filter === 'bookable' && b.bookable !== false)
    ),
    [filter, data]
  );
  const userBookings = useMemo(() => data.bookings.filter((b) => b.name === username), [data.bookings, username]);
  const userRequests = useMemo(() => data.requests.filter((r) => r.owner === username), [data.requests, username]);
  const activeVehicleCount = data.vehicles.filter((v) => userBookings.some((b) => b.bayId === v.bayId && b.plate === v.plate)).length;

  function login() {
    if (!username.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setLoginError('Enter a name and valid email to continue.');
      return;
    }
    setLoginError('');
    setScreen('home');
  }

  function detect() {
    if (!navigator.geolocation) {
      setGpsStatus('GPS unavailable — continuing in demo mode');
      return;
    }
    setGpsStatus('Requesting location permission…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const v = {lat: p.coords.latitude, lon: p.coords.longitude};
        setPosition(v);
        setLoc(`${v.lat.toFixed(4)}, ${v.lon.toFixed(4)} (GPS)`);
        setOrigin(`${v.lat.toFixed(5)},${v.lon.toFixed(5)}`);
        setGpsStatus('GPS detected. Roadside data below remains an example, not verified nearby results.');
      },
      () => setGpsStatus('Location unavailable or denied — using demo area'),
      {timeout: 7500}
    );
  }

  function directions() {
    const start = position ? `${position.lat},${position.lon}` : '28.6315,77.2167';
    const end = '28.6315,77.2167';
    window.open(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(start + ';' + end)}`, '_blank', 'noopener,noreferrer');
  }

  function submit() {
    const plate = cleanPlate(vehiclePlate);
    if (plate.length < 6) {
      setMessage('Please enter a valid vehicle number.');
      return;
    }
    const kind: Kind = reason === 'transit' ? 'bus' : reason === 'delivery' ? 'loading' : 'parking';
    const request: Request = {
      id: `REQ-${Date.now()}`,
      owner: username.trim(),
      plate,
      reason,
      kind,
      duration,
      created: Date.now(),
      status: 'pending'
    };
    setData((d) => {
      const result = allocateRequests([...d.requests, request], d.bookings, d.vehicles, d.minute);
      const own = result.requests.find((x) => x.id === request.id)!;
      setMessage(own.status === 'allocated' ? `${own.bayId} allocated for ${plate}. Select View 3D Location to inspect it.` : 'No suitable curb free right now. Added to priority waitlist.');
      if (own.bayId) setSelected(own.bayId);
      return {...d, ...result};
    });
    setVehiclePlate('');
  }

  function checkin(id: string) {
    setData((d) => {
      const bk = d.bookings.find((b) => b.id === id);
      if (!bk || d.vehicles.some((v) => v.bayId === bk.bayId)) return d;
      return {
        ...d,
        vehicles: [...d.vehicles, {id: `V-${id}`, bayId: bk.bayId, plate: bk.plate, arrived: d.minute, source: 'booking'}],
        bookings: d.bookings.map((b) => (b.id === id ? {...b, status: 'arrived'} : b))
      };
    });
  }

  function checkout(id: string) {
    setData((d) => {
      const bk = d.bookings.find((b) => b.id === id);
      if (!bk) return d;
      return {
        ...d,
        vehicles: d.vehicles.filter((v) => !(v.bayId === bk.bayId && v.plate === bk.plate)),
        bookings: d.bookings.map((b) => (b.id === id ? {...b, status: 'complete'} : b))
      };
    });
  }

  function advance() {
    setData((d) => {
      const minute = d.minute + 5;
      const released = d.bookings.filter((b) => b.status === 'reserved' && minute > b.start + b.duration);
      const bookings = d.bookings.map((b) => (released.some((x) => x.id === b.id) ? {...b, status: 'complete' as const} : b));
      const result = allocateRequests(d.requests, bookings, d.vehicles, minute);
      return {...d, ...result, minute};
    });
  }

  if (screen === 'login') {
    return (
      <div className="new-login">
        <div className="new-login-background" />
        <div className="new-login-top">
          <span className="new-wordmark">SMARTCURB<span> AI</span></span>
          <span>URBAN MOBILITY EXPERIENCE</span>
        </div>
        <div className="new-login-body">
          <motion.div initial={{opacity: 0, y: 18}} animate={{opacity: 1, y: 0}} transition={{duration: 0.5}} className="new-login-copy">
            <span className="new-kicker">CONNECTED CURBS. CLEARER ROADS.</span>
            <h1>Move through the city.<br /><em>Stop in the right place.</em></h1>
            <p>Explore available curb zones, navigate to a designated stopping point, view booking history, and understand how roadside CCTV scanning could verify arriving vehicles in a future deployment.</p>
            <div className="new-glass-stat"><span>01 / Discover curbs</span><span>02 / Reserve responsibly</span><span>03 / Review booking history</span></div>
          </motion.div>
          <div className="new-login-card">
            <span className="new-kicker">WELCOME TO SMARTCURB</span>
            <h2>Sign in to explore</h2>
            <p>Academic demo access. No password or authentication server is used.</p>
            <label>Your name<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter full name" /></label>
            <label>Email address<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" onKeyDown={(e) => e.key === 'Enter' && login()} /></label>
            {loginError && <p className="new-error">{loginError}</p>}
            <button className="new-primary" onClick={login}>Enter SmartCurb <ArrowRight size={18} /></button>
            <small>By continuing, you enter a simulated smart-city demonstration.</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="new-shell">
      <header className="new-nav">
        <button className="new-logo" onClick={() => setScreen('home')}>SMARTCURB <b>AI</b></button>
        <nav>
          <button className={screen === 'home' ? 'chosen' : ''} onClick={() => setScreen('home')}>Overview</button>
          <button className={screen === 'curbs' ? 'chosen' : ''} onClick={() => setScreen('curbs')}>Nearby curbs</button>
          <button className={screen === 'map' ? 'chosen' : ''} onClick={() => setScreen('map')}>3D road map</button>
          <button className={screen === 'history' ? 'chosen' : ''} onClick={() => setScreen('history')}>Booking history</button>
        </nav>
        <div className="new-account"><span>{username}</span><button aria-label="Sign out" title="Sign out" onClick={() => setScreen('login')}><LogOut size={17} /></button></div>
      </header>

      <main className="new-main">
        {screen === 'home' && <>
          <section className="new-hero">
            <div>
              <span className="new-kicker">YOUR CITY, IN MOTION</span>
              <h1>Find the right curb.<br /><em>Keep traffic moving.</em></h1>
              <p>Discover designated stopping zones along your route, review simulated availability, reserve an eligible curb, and later check your booking history.</p>
              <div className="new-hero-actions">
                <button className="new-primary" onClick={() => setScreen('curbs')}>Explore nearby curb spaces <ArrowRight size={17} /></button>
                <button className="new-outline" onClick={() => setScreen('map')}>Explore 3D street</button>
              </div>
            </div>
            <div className="new-hero-map">
              <div className="new-map-line" />
              <span className="new-map-chip one">PARKING · AVAILABLE</span>
              <span className="new-map-chip two">QUICK STOP · 5 MIN</span>
              <span className="new-map-chip three">CCTV · PLATE SCAN</span>
              <div className="new-route-pin">SC</div>
            </div>
          </section>
          <section className="new-split">
            <div className="new-white-card">
              <div className="new-section-eyebrow">NAVIGATION</div>
              <h2>Where do you need to stop?</h2>
              <p>Enter your route, then inspect the managed curbs near the destination.</p>
              <div className="new-location-row"><MapPin size={18} /><input aria-label="Start location" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Current location" /></div>
              <div className="new-location-row"><Navigation size={18} /><input aria-label="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" /></div>
              <div className="new-button-row">
                <button className="new-outline" onClick={detect}><LocateFixed size={16} /> Detect location</button>
                <button className="new-primary" onClick={directions}><Route size={16} /> Open real directions</button>
              </div>
              <small className="new-note">{gpsStatus} Directions open in OpenStreetMap. The preset is Connaught Place; custom text is not geocoded in this offline prototype.</small>
            </div>
            <div className="new-white-card">
              <div className="new-section-eyebrow">NEARBY MANAGED CORRIDOR</div>
              <h2>Connaught Road <span className="new-demo-label">DEMO STREET</span></h2>
              <p>See which curb areas are usable right now. Other corridor cards are future coverage previews.</p>
              <div className="new-stats"><div><strong>{BAYS.length}</strong><span>Managed zones</span></div><div><strong>{available}</strong><span>Available</span></div><div><strong>{userBookings.length}</strong><span>My bookings</span></div></div>
              <button className="new-link" onClick={() => setScreen('curbs')}>View curb availability <ArrowRight size={16} /></button>
            </div>
          </section>
          <section className="new-how">
            <span className="new-kicker">THE SMARTCURB JOURNEY</span>
            <div className="new-process">
              <div><span>01</span><b>Set your destination</b><p>Search the route and choose a managed corridor.</p></div>
              <div><span>02</span><b>Find a usable curb</b><p>Filter parking, loading, bus and quick-stop zones.</p></div>
              <div><span>03</span><b>Track your booking</b><p>Review booking history and find your assigned curb in 3D.</p></div>
            </div>
          </section>
        </>}

        {screen === 'curbs' && <>
          <div className="new-page-heading">
            <div>
              <span className="new-kicker">CURB DISCOVERY</span>
              <h1>Nearby curb spaces</h1>
              <p>Illustrative Connaught Road curb inventory. Availability below is simulated, not sensor data.</p>
            </div>
            <button className="new-outline" onClick={detect}><LocateFixed size={16} /> Detect my location</button>
          </div>
          <p className="new-gps-caption">{loc} — {gpsStatus}</p>
          <div className="new-roads">{roads.map((r) => <button className={'new-road ' + (r.active ? 'active' : '')} key={r.name} onClick={() => r.active ? setScreen('map') : setMessage(`${r.name} is a preview corridor. Connaught Road is the only active demo map.`)}><MapPin size={20} /><span><b>{r.name}</b><small>{r.detail}</small></span><span className="new-road-right">{r.active ? 'Explore map →' : 'Preview'}</span></button>)}</div>
          <div className="new-section-head">
            <div><h2>Available zones</h2><p>Tap a segment to locate it in the road model.</p></div>
            <div className="new-filters">{(['all', 'available', 'quick', 'bookable'] as const).map((f) => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'quick' ? 'Quick Stop' : f === 'bookable' ? 'Bookable' : 'Available'}</button>)}</div>
          </div>
          <div className="new-curb-grid">{items.map((b) => { const st = statusFor(b, data.bookings, data.vehicles, data.minute); return <button key={b.id} className="new-curb-card" onClick={() => { setSelected(b.id); setScreen('map'); }}><span className="new-curb-band" style={{background: COLORS[b.kind]}} /><div className="new-curb-title"><strong>{b.id}</strong><span className={'new-status ' + st}>{st}</span></div><b>{KIND_LABEL[b.kind]}</b><p>{b.length} ft · {b.side} side · {b.note}</p><span className="new-curb-bottom">View on 3D map <ChevronRight size={16} /></span></button>; })}</div>
          {message && <p className="new-inline-alert">{message}</p>}
        </>}

        {screen === 'map' && <>
          <div className="new-page-heading">
            <div>
              <span className="new-kicker">3D STREET DIGITAL TWIN</span>
              <h1>Connaught Road</h1>
              <p>Illustrative modeled street with category-colored curb areas, roadside CCTV points, and simulated plate-scan overlays. Not a surveyed or live 3D map.</p>
            </div>
            <button className="new-outline" onClick={() => setScreen('curbs')}>← Back to curb list</button>
          </div>
          <div className="new-map-grid">
            <div className="new-map-column">
              <div className="new-map-toolbar"><span><Layers size={16} /> Curb occupancy and camera scan visualization</span><div className="new-mode"><button className={mode === '3d' ? 'active' : ''} onClick={() => setMode('3d')}>3D view</button><button className={mode === '2d' ? 'active' : ''} onClick={() => setMode('2d')}>2D view</button></div></div>
              <div className="new-canvas">{mode === '3d' ? <StreetScene selected={selected} onSelect={setSelected} bookings={data.bookings} vehicles={data.vehicles} minute={data.minute} /> : <Schematic selected={selected} onSelect={setSelected} bookings={data.bookings} vehicles={data.vehicles} minute={data.minute} />}</div>
              <div className="new-legend">{Object.entries(KIND_LABEL).map(([key, label]) => <span key={key}><i style={{background: COLORS[key as Kind]}} />{label}</span>)}</div>
              <div className="new-timer"><span><Clock3 size={16} /> Simulation {fmt(data.minute)}</span><button onClick={() => setPlaying((v) => !v)}>{playing ? <Pause size={16} /> : <Play size={16} />} {playing ? 'Pause' : 'Play'}</button><button onClick={advance}>+5 min</button><button onClick={() => { setPlaying(false); setData(DEFAULT); setMessage('Demo simulation reset.'); }}><RotateCcw size={16} /> Reset</button></div>
            </div>
            <aside className="new-map-aside">
              <div className="new-selected">
                <span className="new-section-eyebrow">SELECTED CURB</span>
                <div className="new-curb-title"><strong>{bay.id}</strong><span className={'new-status ' + currentStatus}>{currentStatus}</span></div>
                <h3>{KIND_LABEL[bay.kind]}</h3>
                <div className="new-attribute"><span>Segment length</span><b>{bay.length} ft</b></div>
                <div className="new-attribute"><span>Street side</span><b>{bay.side}</b></div>
                <div className="new-attribute"><span>Allowed stopping</span><b>{bay.bookable === false ? '2–5 minutes' : 'By reservation'}</b></div>
                <div className="new-attribute"><span>Current vehicle</span><b>{data.vehicles.find((v) => v.bayId === bay.id)?.plate || 'None'}</b></div>
                <div className="new-warning"><ShieldAlert size={16} /><span>Stopping outside authorized areas or exceeding permitted time can lead to enforcement. Fine determination here is illustrative only.</span></div>
                <button className="new-outline full" onClick={directions}><Navigation size={16} /> Directions to demo road</button>
              </div>

              <div className="new-selected">
                <span className="new-section-eyebrow">PRIORITY RESERVATION</span>
                <h3>Request a curb space</h3>
                <p>Safety-first priority: ambulance, hospital, public transport, delivery, then general parking. Requests are processed deterministically; reservations are not official road permits.</p>
                <label>Vehicle registration<input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())} placeholder="DL01AB1234" /></label>
                <label>Purpose of stop<select value={reason} onChange={(e) => setReason(e.target.value as RequestKind)}>{Object.entries(reasonLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                <label>Requested duration<select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>{[5, 10, 15, 20, 30].map((v) => <option key={v} value={v}>{v} min</option>)}</select></label>
                <button className="new-primary full" onClick={submit}>Request compatible space <ArrowRight size={16} /></button>
                {message && <p className="new-inline-alert">{message}</p>}
              </div>

              <div className="new-selected">
                <span className="new-section-eyebrow">LIVE PLATE SCAN PREVIEW</span>
                <h3>How roadside CCTV could recognise vehicles</h3>
                <p><Camera size={16} /> The scene shows CCTV poles continuously scanning the road and curb approach. Floating scan cards indicate how number plates could be read and matched with booked vehicles in a future authorised deployment.</p>
                <div className="scan-list">
                  {data.vehicles.map((v) => <div className="scan-row" key={v.id}><b>{v.plate}</b><span>{v.source === 'booking' ? 'Booking matched' : 'Curb detection'}</span></div>)}
                  <div className="scan-row"><b>DL2CAP2711</b><span>Roadside scan</span></div>
                  <div className="scan-row"><b>DL4CAF9921</b><span>Roadside scan</span></div>
                </div>
              </div>

              <div className="new-selected">
                <span className="new-section-eyebrow">MY CURRENT BOOKINGS</span>
                {userBookings.length === 0 ? <p>No reservations yet.</p> : userBookings.map((b) => <div className="new-booking" key={b.id}><b>{b.bayId} · {b.plate}</b><small>{b.status} · {b.duration} min · Start {fmt(b.start)}</small><div>{b.status === 'reserved' && <button onClick={() => checkin(b.id)}>Simulate arrival</button>}{b.status === 'arrived' && <button onClick={() => checkout(b.id)}>Simulate exit</button>}<button onClick={() => setSelected(b.bayId)}>Locate</button></div></div>)}
                <button className="new-outline full history-shortcut" onClick={() => setScreen('history')}><CalendarCheck size={16} /> Open full booking history</button>
              </div>
            </aside>
          </div>
        </>}

        {screen === 'history' && <>
          <div className="new-page-heading">
            <div>
              <span className="new-kicker">BOOKING HISTORY</span>
              <h1>My reservation record</h1>
              <p>See your allocated curb requests, completed bookings, and current reservation status.</p>
            </div>
            <button className="new-outline" onClick={() => setScreen('map')}><Search size={16} /> View on map</button>
          </div>
          <div className="new-history-summary">
            <div className="new-white-card compact"><strong>{userBookings.length}</strong><span>Total bookings</span></div>
            <div className="new-white-card compact"><strong>{userBookings.filter((b) => b.status === 'complete').length}</strong><span>Completed</span></div>
            <div className="new-white-card compact"><strong>{userRequests.filter((r) => r.status === 'waitlisted').length}</strong><span>Waitlisted</span></div>
            <div className="new-white-card compact"><strong>{activeVehicleCount}</strong><span>Active on curb</span></div>
          </div>
          <div className="new-history-grid">
            <div className="new-selected">
              <span className="new-section-eyebrow">BOOKINGS</span>
              <h3>Reserved and completed curb stays</h3>
              {userBookings.length === 0 ? <p>No booking history yet.</p> : userBookings.slice().sort((a, b) => b.start - a.start).map((b) => (
                <div className="history-item" key={b.id}>
                  <div className="history-top"><b>{b.plate}</b><span className={'new-status ' + (b.status === 'complete' ? 'available' : b.status === 'arrived' ? 'occupied' : 'reserved')}>{b.status}</span></div>
                  <small>{b.bayId} · {KIND_LABEL[(BAYS.find((x) => x.id === b.bayId)?.kind ?? 'parking') as Kind]}</small>
                  <div className="history-meta"><span>Start</span><b>{fmt(b.start)}</b></div>
                  <div className="history-meta"><span>Duration</span><b>{b.duration} min</b></div>
                  <div className="row-actions"><button onClick={() => { setSelected(b.bayId); setScreen('map'); }}>Locate curb</button>{b.status === 'reserved' && <button onClick={() => checkin(b.id)}>Simulate arrival</button>}{b.status === 'arrived' && <button onClick={() => checkout(b.id)}>Simulate exit</button>}</div>
                </div>
              ))}
            </div>
            <div className="new-selected">
              <span className="new-section-eyebrow">REQUEST LOG</span>
              <h3>Priority request history</h3>
              {userRequests.length === 0 ? <p>No request records yet.</p> : userRequests.slice().sort((a, b) => b.created - a.created).map((r) => (
                <div className="history-item" key={r.id}>
                  <div className="history-top"><b>{r.plate}</b><span className={'new-status ' + (r.status === 'allocated' ? 'reserved' : 'occupied')}>{r.status}</span></div>
                  <small>{reasonLabel[r.reason]} · {historyDate(r.created)}</small>
                  <div className="history-meta"><span>Requested use</span><b>{KIND_LABEL[r.kind]}</b></div>
                  <div className="history-meta"><span>Assigned curb</span><b>{r.bayId ?? 'Waitlist'}</b></div>
                </div>
              ))}
              <div className="new-inline-alert"><Info size={14} /> Booking history is stored locally in this browser using LocalStorage for the demo.</div>
            </div>
          </div>
        </>}
      </main>
      <footer className="new-footer">SmartCurb AI · Academic simulation · Illustrative road geometry and availability · CCTV recognition shown as a conceptual visual, not live ANPR</footer>
    </div>
  );
}
