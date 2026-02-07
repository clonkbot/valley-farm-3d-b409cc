import { useState, useRef, Suspense, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sky, Float, Html, ContactShadows, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

// Game State Types
interface CropData {
  id: string
  x: number
  z: number
  type: 'carrot' | 'tomato' | 'corn' | 'turnip'
  stage: number // 0 = seed, 1 = sprout, 2 = growing, 3 = ready
  plantedDay: number
}

interface GameState {
  day: number
  season: 'Spring' | 'Summer' | 'Fall' | 'Winter'
  gold: number
  energy: number
  selectedTool: 'hoe' | 'water' | 'seed' | 'harvest'
  crops: CropData[]
  tiledPlots: Set<string>
}

const CROP_COLORS = {
  carrot: '#FF7F50',
  tomato: '#FF6347',
  corn: '#FFD700',
  turnip: '#DDA0DD'
}

const CROP_PRICES = {
  carrot: 35,
  tomato: 60,
  corn: 50,
  turnip: 40
}

// Procedural Crop Component
function Crop({ crop, onClick }: { crop: CropData; onClick: () => void }) {
  const ref = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (crop.stage === 3) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 2 + crop.x + crop.z) * 0.1
    }
  })

  const color = CROP_COLORS[crop.type]

  return (
    <group
      ref={ref}
      position={[crop.x * 1.2 - 3.6, 0.15, crop.z * 1.2 - 3.6]}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      {crop.stage === 0 && (
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      )}
      {crop.stage === 1 && (
        <group>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#32CD32" />
          </mesh>
        </group>
      )}
      {crop.stage === 2 && (
        <group>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[Math.sin(i * 2.1) * 0.1, 0.3 + i * 0.1, Math.cos(i * 2.1) * 0.1]}>
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshStandardMaterial color="#32CD32" />
            </mesh>
          ))}
        </group>
      )}
      {crop.stage === 3 && (
        <Float speed={3} rotationIntensity={0.2} floatIntensity={0.3}>
          <group>
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
              <meshStandardMaterial color="#228B22" />
            </mesh>
            {crop.type === 'carrot' && (
              <mesh position={[0, 0.1, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.12, 0.35, 8]} />
                <meshStandardMaterial color={color} />
              </mesh>
            )}
            {crop.type === 'tomato' && (
              <mesh position={[0, 0.55, 0]}>
                <sphereGeometry args={[0.18, 12, 12]} />
                <meshStandardMaterial color={color} />
              </mesh>
            )}
            {crop.type === 'corn' && (
              <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.1, 0.08, 0.4, 8]} />
                <meshStandardMaterial color={color} />
              </mesh>
            )}
            {crop.type === 'turnip' && (
              <mesh position={[0, 0.25, 0]}>
                <sphereGeometry args={[0.15, 12, 12]} />
                <meshStandardMaterial color={color} />
              </mesh>
            )}
            {/* Sparkle effect for ready crops */}
            <pointLight color="#FFD700" intensity={0.5} distance={1} />
          </group>
        </Float>
      )}
    </group>
  )
}

// Farm Plot Grid
function FarmPlot({ x, z, isTilled, onClick }: { x: number; z: number; isTilled: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <group position={[x * 1.2 - 3.6, 0, z * 1.2 - 3.6]}>
      <RoundedBox
        args={[1, 0.2, 1]}
        radius={0.05}
        position={[0, 0.05, 0]}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={isTilled ? (hovered ? '#6B4423' : '#5D3A1A') : (hovered ? '#4A7C3F' : '#3D6B35')}
        />
      </RoundedBox>
      {isTilled && (
        <group>
          {[-0.3, 0, 0.3].map((pos, i) => (
            <mesh key={i} position={[pos, 0.16, 0]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.08, 0.02, 0.8]} />
              <meshStandardMaterial color="#4A3520" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

// Decorative Tree
function Tree({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null!)

  useFrame((state) => {
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05
  })

  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 1.2, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[0.8, 1.5, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <coneGeometry args={[0.6, 1.2, 8]} />
        <meshStandardMaterial color="#2E8B2E" />
      </mesh>
      <mesh position={[0, 3, 0]}>
        <coneGeometry args={[0.4, 0.8, 8]} />
        <meshStandardMaterial color="#32CD32" />
      </mesh>
    </group>
  )
}

// Barn
function Barn({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[3, 2, 2.5]} />
        <meshStandardMaterial color="#8B0000" />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <coneGeometry args={[1.8, 1.5, 4]} />
        <meshStandardMaterial color="#4A4A4A" />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.6, 1.26]}>
        <boxGeometry args={[0.8, 1.2, 0.1]} />
        <meshStandardMaterial color="#5D3A1A" />
      </mesh>
      {/* Windows */}
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, 1.3, 1.26]}>
          <boxGeometry args={[0.4, 0.4, 0.1]} />
          <meshStandardMaterial color="#87CEEB" />
        </mesh>
      ))}
    </group>
  )
}

// Scarecrow
function Scarecrow({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null!)

  useFrame((state) => {
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1
  })

  return (
    <group position={position}>
      {/* Post */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 1.6, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Arms */}
      <mesh position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Head */}
      <group ref={ref}>
        <mesh position={[0, 1.8, 0]}>
          <sphereGeometry args={[0.25, 12, 12]} />
          <meshStandardMaterial color="#DEB887" />
        </mesh>
        {/* Hat */}
        <mesh position={[0, 2.1, 0]}>
          <coneGeometry args={[0.3, 0.4, 8]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
        <mesh position={[0, 1.95, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.05, 8]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
      </group>
      {/* Shirt */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.4, 0.5, 0.2]} />
        <meshStandardMaterial color="#FF6B35" />
      </mesh>
    </group>
  )
}

// Water Well
function Well({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.6, 12]} />
        <meshStandardMaterial color="#808080" />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 12]} />
        <meshStandardMaterial color="#1E90FF" />
      </mesh>
      {/* Roof posts */}
      {[[-0.35, 0], [0.35, 0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.9, z]}>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      ))}
      {/* Roof */}
      <mesh position={[0, 1.6, 0]}>
        <coneGeometry args={[0.6, 0.4, 4]} />
        <meshStandardMaterial color="#8B0000" />
      </mesh>
    </group>
  )
}

// Fence
function Fence({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) + Math.pow(end[2] - start[2], 2)
  )
  const angle = Math.atan2(end[2] - start[2], end[0] - start[0])
  const midX = (start[0] + end[0]) / 2
  const midZ = (start[2] + end[2]) / 2

  const postCount = Math.floor(length / 1.5) + 1
  const posts = useMemo(() => {
    const arr = []
    for (let i = 0; i < postCount; i++) {
      const t = i / (postCount - 1)
      arr.push({
        x: start[0] + (end[0] - start[0]) * t,
        z: start[2] + (end[2] - start[2]) * t
      })
    }
    return arr
  }, [start, end, postCount])

  return (
    <group>
      {/* Horizontal rail */}
      <mesh position={[midX, 0.35, midZ]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[length, 0.1, 0.08]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>
      <mesh position={[midX, 0.55, midZ]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[length, 0.08, 0.08]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>
      {/* Posts */}
      {posts.map((post, i) => (
        <mesh key={i} position={[post.x, 0.4, post.z]}>
          <boxGeometry args={[0.12, 0.8, 0.12]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      ))}
    </group>
  )
}

// Clouds
function Clouds() {
  const clouds = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      x: (Math.random() - 0.5) * 30,
      y: 8 + Math.random() * 4,
      z: (Math.random() - 0.5) * 30,
      scale: 0.5 + Math.random() * 1.5
    })), []
  )

  return (
    <>
      {clouds.map((cloud, i) => (
        <Float key={i} speed={0.5} floatIntensity={0.5}>
          <group position={[cloud.x, cloud.y, cloud.z]}>
            {[0, 1, 2].map((j) => (
              <mesh key={j} position={[(j - 1) * 0.8 * cloud.scale, Math.sin(j) * 0.3 * cloud.scale, 0]}>
                <sphereGeometry args={[0.8 * cloud.scale, 12, 12]} />
                <meshStandardMaterial color="#FFFFFF" transparent opacity={0.9} />
              </mesh>
            ))}
          </group>
        </Float>
      ))}
    </>
  )
}

// Ground
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#7CBA5D" />
    </mesh>
  )
}

// Main Farm Scene
function FarmScene({ gameState, setGameState }: { gameState: GameState; setGameState: React.Dispatch<React.SetStateAction<GameState>> }) {

  const handlePlotClick = (x: number, z: number) => {
    const plotKey = `${x},${z}`
    const existingCrop = gameState.crops.find(c => c.x === x && c.z === z)

    if (gameState.selectedTool === 'hoe' && !gameState.tiledPlots.has(plotKey) && gameState.energy >= 5) {
      setGameState(prev => ({
        ...prev,
        tiledPlots: new Set([...prev.tiledPlots, plotKey]),
        energy: prev.energy - 5
      }))
    } else if (gameState.selectedTool === 'seed' && gameState.tiledPlots.has(plotKey) && !existingCrop && gameState.gold >= 20 && gameState.energy >= 2) {
      const types: CropData['type'][] = ['carrot', 'tomato', 'corn', 'turnip']
      const newCrop: CropData = {
        id: `${x}-${z}-${Date.now()}`,
        x,
        z,
        type: types[Math.floor(Math.random() * types.length)],
        stage: 0,
        plantedDay: gameState.day
      }
      setGameState(prev => ({
        ...prev,
        crops: [...prev.crops, newCrop],
        gold: prev.gold - 20,
        energy: prev.energy - 2
      }))
    } else if (gameState.selectedTool === 'water' && existingCrop && existingCrop.stage < 3 && gameState.energy >= 3) {
      setGameState(prev => ({
        ...prev,
        crops: prev.crops.map(c =>
          c.id === existingCrop.id ? { ...c, stage: Math.min(c.stage + 1, 3) } : c
        ),
        energy: prev.energy - 3
      }))
    }
  }

  const handleCropClick = (crop: CropData) => {
    if (gameState.selectedTool === 'harvest' && crop.stage === 3) {
      const earnedGold = CROP_PRICES[crop.type]
      setGameState(prev => ({
        ...prev,
        crops: prev.crops.filter(c => c.id !== crop.id),
        gold: prev.gold + earnedGold
      }))
    } else if (gameState.selectedTool === 'water' && crop.stage < 3 && gameState.energy >= 3) {
      setGameState(prev => ({
        ...prev,
        crops: prev.crops.map(c =>
          c.id === crop.id ? { ...c, stage: Math.min(c.stage + 1, 3) } : c
        ),
        energy: prev.energy - 3
      }))
    }
  }

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <hemisphereLight args={['#87CEEB', '#7CBA5D', 0.5]} />

      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={[100, 50, 100]}
        inclination={0.5}
        azimuth={0.25}
      />

      <Clouds />

      {/* Ground */}
      <Ground />

      {/* Farm border/box */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[9, 0.3, 9]} />
        <meshStandardMaterial color="#5D3A1A" />
      </mesh>

      {/* Farm plots */}
      {Array.from({ length: 7 }, (_, x) =>
        Array.from({ length: 7 }, (_, z) => (
          <FarmPlot
            key={`${x}-${z}`}
            x={x}
            z={z}
            isTilled={gameState.tiledPlots.has(`${x},${z}`)}
            onClick={() => handlePlotClick(x, z)}
          />
        ))
      )}

      {/* Crops */}
      {gameState.crops.map(crop => (
        <Crop key={crop.id} crop={crop} onClick={() => handleCropClick(crop)} />
      ))}

      {/* Decorations */}
      <Tree position={[-8, 0, -6]} />
      <Tree position={[-9, 0, -3]} />
      <Tree position={[-7, 0, 0]} />
      <Tree position={[8, 0, -5]} />
      <Tree position={[9, 0, -2]} />
      <Tree position={[7, 0, 3]} />
      <Tree position={[-6, 0, 8]} />
      <Tree position={[5, 0, 9]} />

      <Barn position={[8, 0, 8]} />
      <Scarecrow position={[-6, 0, -6]} />
      <Well position={[-7, 0, 5]} />

      {/* Fences */}
      <Fence start={[-5.5, 0, -5.5]} end={[5.5, 0, -5.5]} />
      <Fence start={[5.5, 0, -5.5]} end={[5.5, 0, 5.5]} />
      <Fence start={[5.5, 0, 5.5]} end={[-5.5, 0, 5.5]} />
      <Fence start={[-5.5, 0, 5.5]} end={[-5.5, 0, -5.5]} />

      <ContactShadows
        opacity={0.4}
        scale={20}
        blur={2}
        far={10}
        position={[0, 0, 0]}
      />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />
    </>
  )
}

// Tool Button Component
function ToolButton({
  tool,
  icon,
  label,
  selected,
  onClick
}: {
  tool: string
  icon: string
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center
        w-14 h-14 md:w-16 md:h-16
        rounded-lg border-4 transition-all duration-200
        ${selected
          ? 'bg-amber-400 border-amber-600 shadow-lg shadow-amber-500/50 scale-110 -translate-y-1'
          : 'bg-amber-200 border-amber-400 hover:bg-amber-300 hover:scale-105'
        }
      `}
    >
      <span className="text-xl md:text-2xl">{icon}</span>
      <span className="text-[8px] md:text-[10px] font-bold text-amber-900 mt-0.5">{label}</span>
    </button>
  )
}

// Stat Badge Component
function StatBadge({ icon, value, color }: { icon: string; value: string | number; color: string }) {
  return (
    <div className={`
      flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg
      border-3 md:border-4 shadow-lg
      ${color}
    `}>
      <span className="text-base md:text-lg">{icon}</span>
      <span className="font-bold text-xs md:text-sm">{value}</span>
    </div>
  )
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    day: 1,
    season: 'Spring',
    gold: 500,
    energy: 100,
    selectedTool: 'hoe',
    crops: [],
    tiledPlots: new Set()
  })

  const nextDay = () => {
    setGameState(prev => {
      const newDay = prev.day + 1
      const seasons: GameState['season'][] = ['Spring', 'Summer', 'Fall', 'Winter']
      const seasonIndex = Math.floor((newDay - 1) / 28) % 4

      return {
        ...prev,
        day: newDay,
        season: seasons[seasonIndex],
        energy: 100
      }
    })
  }

  return (
    <div className="w-screen h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(180deg, #87CEEB 0%, #98D1A8 50%, #7CBA5D 100%)'
    }}>
      {/* Game Title */}
      <div className="absolute top-3 md:top-4 left-1/2 -translate-x-1/2 z-20">
        <h1
          className="text-2xl md:text-4xl lg:text-5xl text-amber-900 drop-shadow-lg"
          style={{
            fontFamily: "'Press Start 2P', cursive",
            textShadow: '3px 3px 0 #FFD93D, 6px 6px 0 rgba(0,0,0,0.2)'
          }}
        >
          Valley Farm 3D
        </h1>
      </div>

      {/* Top Stats Bar */}
      <div className="absolute top-14 md:top-20 left-1/2 -translate-x-1/2 z-20 flex flex-wrap justify-center gap-2 md:gap-3 px-2">
        <StatBadge icon="📅" value={`Day ${gameState.day}`} color="bg-amber-100 border-amber-400 text-amber-900" />
        <StatBadge icon="🌸" value={gameState.season} color="bg-green-100 border-green-400 text-green-900" />
        <StatBadge icon="⚡" value={gameState.energy} color="bg-blue-100 border-blue-400 text-blue-900" />
        <StatBadge icon="💰" value={`${gameState.gold}g`} color="bg-yellow-100 border-yellow-500 text-yellow-900" />
      </div>

      {/* Tools Panel */}
      <div className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-amber-800/90 backdrop-blur-sm rounded-xl p-2 md:p-3 border-4 border-amber-600 shadow-2xl">
          <div className="flex gap-2 md:gap-3">
            <ToolButton
              tool="hoe"
              icon="⛏️"
              label="HOE"
              selected={gameState.selectedTool === 'hoe'}
              onClick={() => setGameState(prev => ({ ...prev, selectedTool: 'hoe' }))}
            />
            <ToolButton
              tool="water"
              icon="💧"
              label="WATER"
              selected={gameState.selectedTool === 'water'}
              onClick={() => setGameState(prev => ({ ...prev, selectedTool: 'water' }))}
            />
            <ToolButton
              tool="seed"
              icon="🌱"
              label="SEED"
              selected={gameState.selectedTool === 'seed'}
              onClick={() => setGameState(prev => ({ ...prev, selectedTool: 'seed' }))}
            />
            <ToolButton
              tool="harvest"
              icon="🧺"
              label="HARVEST"
              selected={gameState.selectedTool === 'harvest'}
              onClick={() => setGameState(prev => ({ ...prev, selectedTool: 'harvest' }))}
            />
          </div>
        </div>
      </div>

      {/* Next Day Button */}
      <div className="absolute bottom-20 md:bottom-24 right-3 md:right-6 z-20">
        <button
          onClick={nextDay}
          className="
            px-4 md:px-6 py-2 md:py-3 rounded-xl
            bg-gradient-to-b from-orange-400 to-orange-600
            border-4 border-orange-700
            text-white font-bold text-xs md:text-sm
            shadow-lg hover:shadow-xl
            hover:from-orange-300 hover:to-orange-500
            active:scale-95 transition-all duration-150
          "
          style={{ fontFamily: "'Press Start 2P', cursive" }}
        >
          SLEEP 💤
        </button>
      </div>

      {/* Instructions Panel */}
      <div className="absolute top-28 md:top-36 right-2 md:right-4 z-20 max-w-[140px] md:max-w-[180px]">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 md:p-3 border-2 border-amber-300 shadow-lg">
          <h3 className="text-[10px] md:text-xs font-bold text-amber-800 mb-1.5 md:mb-2" style={{ fontFamily: "'Press Start 2P', cursive" }}>HOW TO PLAY</h3>
          <ul className="text-[8px] md:text-[10px] text-amber-900 space-y-0.5 md:space-y-1" style={{ fontFamily: "'Quicksand', sans-serif" }}>
            <li>⛏️ Hoe to till soil</li>
            <li>🌱 Plant seeds (20g)</li>
            <li>💧 Water to grow</li>
            <li>🧺 Harvest when ready!</li>
            <li>💤 Sleep to restore ⚡</li>
          </ul>
        </div>
      </div>

      {/* Crop Prices Panel */}
      <div className="absolute top-28 md:top-36 left-2 md:left-4 z-20">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 md:p-3 border-2 border-amber-300 shadow-lg">
          <h3 className="text-[10px] md:text-xs font-bold text-amber-800 mb-1.5 md:mb-2" style={{ fontFamily: "'Press Start 2P', cursive" }}>PRICES</h3>
          <div className="text-[8px] md:text-[10px] text-amber-900 space-y-0.5 md:space-y-1" style={{ fontFamily: "'Quicksand', sans-serif" }}>
            <div className="flex justify-between gap-2 md:gap-4">
              <span>🥕 Carrot</span>
              <span className="font-bold">35g</span>
            </div>
            <div className="flex justify-between gap-2 md:gap-4">
              <span>🍅 Tomato</span>
              <span className="font-bold">60g</span>
            </div>
            <div className="flex justify-between gap-2 md:gap-4">
              <span>🌽 Corn</span>
              <span className="font-bold">50g</span>
            </div>
            <div className="flex justify-between gap-2 md:gap-4">
              <span>🥬 Turnip</span>
              <span className="font-bold">40g</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [12, 10, 12], fov: 50 }}
        className="absolute inset-0"
      >
        <Suspense fallback={null}>
          <FarmScene gameState={gameState} setGameState={setGameState} />
        </Suspense>
      </Canvas>

      {/* Footer */}
      <div className="absolute bottom-2 md:bottom-3 left-1/2 -translate-x-1/2 z-20">
        <p
          className="text-[9px] md:text-xs text-amber-900/60"
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          Requested by @0xPaulius · Built by @clonkbot
        </p>
      </div>
    </div>
  )
}
