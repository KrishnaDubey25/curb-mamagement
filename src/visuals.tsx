import {Canvas} from '@react-three/fiber';
import {Html, OrbitControls} from '@react-three/drei';
import {BAYS, COLORS, KIND_LABEL, statusFor, type Booking, type Vehicle} from './parking/core';

function Box3({position, size, color}: {position: [number, number, number]; size: [number, number, number]; color: string}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </mesh>
  );
}

function Tree({x, z}: {x: number; z: number}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 2.2, 10]} />
        <meshStandardMaterial color="#7a5a3c" />
      </mesh>
      <mesh position={[0, 2.65, 0]}>
        <sphereGeometry args={[0.85, 10, 10]} />
        <meshStandardMaterial color="#6d9b5c" />
      </mesh>
    </group>
  );
}

function ModelVehicle({x, z, color = '#4f7095', bus = false}: {x: number; z: number; color?: string; bus?: boolean}) {
  return (
    <group position={[x, 0, z]}>
      <Box3 position={[0, 0.42, 0]} size={[bus ? 2.25 : 1.6, 0.65, bus ? 5.2 : 2.95]} color={color} />
      <Box3 position={[0, 0.88, -0.08]} size={[bus ? 2.02 : 1.25, 0.46, bus ? 3.8 : 1.6]} color={bus ? '#dbe9ef' : '#bfd0dd'} />
      {[-0.68, 0.68].map((w, i) => (
        <mesh key={i} position={[w, 0.15, bus ? 1.55 : 0.95]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.18, 12]} />
          <meshStandardMaterial color="#283748" />
        </mesh>
      ))}
    </group>
  );
}

function CameraPole({x, z, rotation = 0}: {x: number; z: number; rotation?: number}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 5.2, 10]} />
        <meshStandardMaterial color="#7f8e9b" />
      </mesh>
      <mesh position={[0.38, 4.95, 0]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.75, 0.28, 0.35]} />
        <meshStandardMaterial color="#324a5f" />
      </mesh>
      <mesh position={[0.78, 4.88, 0.12]} rotation={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.18, 16]} />
        <meshStandardMaterial color="#9fd3ff" emissive="#65bdf5" emissiveIntensity={1.3} />
      </mesh>
      <mesh position={[2.05, 2.45, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.9, 4, 4, 1, true]} />
        <meshStandardMaterial color="#74c2ff" transparent opacity={0.12} side={2} />
      </mesh>
      <Html position={[0.9, 5.45, 0]} center distanceFactor={26} occlude={false}>
        <div className="scan-tag">CCTV · ANPR ACTIVE</div>
      </Html>
    </group>
  );
}

function PlateScan({x, z, plate, status}: {x: number; z: number; plate: string; status: string}) {
  return (
    <Html position={[x, 1.85, z]} center distanceFactor={18} occlude={false}>
      <div className="scan-card">
        <b>{plate}</b>
        <span>{status}</span>
      </div>
    </Html>
  );
}

export function StreetScene({selected, onSelect, bookings, vehicles, minute}: {selected: string; onSelect: (value: string) => void; bookings: Booking[]; vehicles: Vehicle[]; minute: number}) {
  return (
    <Canvas shadows camera={{position: [28, 33, 48], fov: 46}} gl={{antialias: true}}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[20, 42, 22]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <color attach="background" args={['#dbe6f1']} />

      <Box3 position={[0, -0.18, 9]} size={[46, 0.14, 95]} color="#dae3d8" />
      <Box3 position={[0, 0, 9]} size={[14.5, 0.12, 78]} color="#656d74" />
      <Box3 position={[-10.05, 0.1, 9]} size={[5.55, 0.2, 78]} color="#eeede6" />
      <Box3 position={[10.05, 0.1, 9]} size={[5.55, 0.2, 78]} color="#eeede6" />
      {Array.from({length: 15}, (_, i) => (
        <Box3 key={i} position={[0, 0.08, -23 + i * 4.8]} size={[0.18, 0.04, 2.2]} color="#f6d04f" />
      ))}
      <Box3 position={[-2.8, 0.08, 39]} size={[5.2, 0.04, 1.05]} color="#f5f5f5" />
      <Box3 position={[-2.8, 0.08, 45]} size={[5.2, 0.04, 1.05]} color="#f5f5f5" />
      <Box3 position={[-2.8, 0.08, 51]} size={[5.2, 0.04, 1.05]} color="#f5f5f5" />

      {Array.from({length: 6}, (_, i) => (
        <group key={i}>
          <Box3 position={[-18.5, 2.35, -21 + i * 12]} size={[7.2, 4.7, 8]} color={i % 2 ? '#2f3f50' : '#565d6a'} />
          <Box3 position={[18.5, 2.8, -21 + i * 12]} size={[7.5, 5.5, 8]} color={i % 2 ? '#8f918d' : '#404a58'} />
        </group>
      ))}

      {[-24, -12, 0, 12, 24, 36].flatMap((z) => [<Tree key={`l${z}`} x={-8.8} z={z} />, <Tree key={`r${z}`} x={8.8} z={z} />])}
      <CameraPole x={-11.8} z={-3} rotation={0.15} />
      <CameraPole x={11.7} z={19} rotation={Math.PI} />

      {BAYS.map((bay) => {
        const depth = bay.kind === 'bus' ? 13 : bay.length >= 60 ? 9.8 : bay.length >= 40 ? 6.5 : 4.6;
        const x = bay.side === 'left' ? -5.7 : 5.7;
        const state = statusFor(bay, bookings, vehicles, minute);
        const vehicle = vehicles.find((v) => v.bayId === bay.id);
        return (
          <group key={bay.id}>
            <mesh position={[x, 0.15, bay.z]} onClick={(e) => { e.stopPropagation(); onSelect(bay.id); }}>
              <boxGeometry args={[2.8, 0.14, depth]} />
              <meshStandardMaterial transparent opacity={selected === bay.id ? 0.96 : 0.72} color={COLORS[bay.kind]} />
            </mesh>
            {selected === bay.id && <Box3 position={[x, 0.28, bay.z]} size={[3.02, 0.05, depth + 0.25]} color="#2d6fb5" />}
            {vehicle && <>
              <ModelVehicle x={x} z={bay.z} bus={bay.kind === 'bus'} color={bay.kind === 'bus' ? '#4381b6' : '#6d8794'} />
              <PlateScan x={x + (bay.side === 'left' ? -1.6 : 1.6)} z={bay.z} plate={vehicle.plate} status={vehicle.source === 'booking' ? 'Booking matched' : 'Detected on curb'} />
            </>}
            <Html position={[x + (bay.side === 'left' ? -5.9 : 5.9), 1.0, bay.z]} center distanceFactor={25} occlude={false}>
              <button className="map-label" onClick={() => onSelect(bay.id)}>
                <b>{KIND_LABEL[bay.kind]}</b>
                <span>{bay.id} · {bay.length} ft · {state}</span>
              </button>
            </Html>
          </group>
        );
      })}

      <Html position={[0, 5, -31]} center distanceFactor={28}><div className="street-title">Connaught Road</div></Html>
      <Html position={[8.5, 0.7, 42]} center distanceFactor={28}><div className="paint-label bus-paint">BUS STOP</div></Html>
      <Html position={[-8.7, 0.7, -1]} center distanceFactor={26}><div className="driveway-label">Driveway</div></Html>

      {[-8, 5, 15].map((z, i) => (
        <group key={i}>
          <ModelVehicle x={i % 2 ? 1.9 : -1.9} z={z} color={['#dedfe2', '#95b4d4', '#f1c874'][i]} />
          <PlateScan x={(i % 2 ? 1.9 : -1.9) + 1.5} z={z} plate={['DL2CAP2711', 'DL4CAF9921', 'DL3CT1172'][i]} status="Roadside scan" />
        </group>
      ))}

      <OrbitControls makeDefault enablePan maxPolarAngle={Math.PI / 2.2} minDistance={18} maxDistance={96} target={[0, 0, 10]} />
    </Canvas>
  );
}

export function Schematic({selected, onSelect, bookings, vehicles, minute}: {selected: string; onSelect: (value: string) => void; bookings: Booking[]; vehicles: Vehicle[]; minute: number}) {
  return (
    <div className="schematic">
      <div className="schem-buildings">BUILDINGS · SIDEWALK</div>
      <div className="schem-road">
        <div className="lane">NORTHBOUND</div>
        <div className="lane">SOUTHBOUND</div>
        {BAYS.map((bay) => (
          <button
            key={bay.id}
            onClick={() => onSelect(bay.id)}
            className={`schem-bay ${bay.side} ${selected === bay.id ? 'active' : ''}`}
            style={{top: `${((bay.z + 24) / 70) * 76 + 9}%`, background: COLORS[bay.kind]}}
          >
            {bay.id} · {vehicles.some((v) => v.bayId === bay.id) ? 'vehicle' : statusFor(bay, bookings, vehicles, minute)}
          </button>
        ))}
      </div>
      <div className="schem-buildings">SIDEWALK · BUILDINGS</div>
    </div>
  );
}
