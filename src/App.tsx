import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import { EffectComposer } from '@react-three/postprocessing'
import { useControls } from 'leva'
import { Sword } from './components/Sword'
import { Dithering } from './effects/Dithering'
import './App.css'

export default function App() {
  const { pixelSize, threshold, darkness, brightness, invert, autoRotate } =
    useControls('Dithering', {
      pixelSize: { value: 2, min: 1, max: 8, step: 1 },
      threshold: { value: 0.5, min: 0, max: 1, step: 0.01 },
      darkness: { value: 0.0, min: -0.5, max: 0.5, step: 0.01 },
      brightness: { value: 1.0, min: 0.5, max: 1.5, step: 0.01 },
      invert: false,
      autoRotate: true,
    })

  const { hoverRadius, hoverStrength, hoverScatter } = useControls('Hover scatter', {
    hoverRadius: { value: 0.16, min: 0, max: 0.6, step: 0.01 },
    hoverStrength: { value: 0.18, min: 0, max: 0.6, step: 0.01 },
    hoverScatter: { value: 1.4, min: 0, max: 4, step: 0.05 },
  })

  return (
    <div className="stage">
      <Canvas
        gl={{ antialias: false, alpha: true, preserveDrawingBuffer: false }}
        dpr={[1, 2]}
        camera={{ position: [4, 4, 4], fov: 35 }}
      >
        <color attach="background" args={['#ffffff']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 6, 3]} intensity={2.0} />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} />

        <Suspense fallback={null}>
          <group position={[0, 1.0, 0]}>
            <Sword autoRotate={autoRotate} />
          </group>
          <Environment preset="studio" environmentIntensity={0.5} />
        </Suspense>

        <OrbitControls makeDefault enablePan={false} target={[0, 1.0, 0]} />

        <EffectComposer enableNormalPass={false}>
          <Dithering
            pixelSize={pixelSize}
            threshold={threshold}
            darkness={darkness}
            brightness={brightness}
            invert={invert}
            hoverRadius={hoverRadius}
            hoverStrength={hoverStrength}
            hoverScatter={hoverScatter}
          />
        </EffectComposer>
      </Canvas>

    </div>
  )
}
