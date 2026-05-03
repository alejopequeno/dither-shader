import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Box3, Vector3, type Group } from 'three'

useGLTF.preload('/sword.glb')

interface SwordProps {
  autoRotate?: boolean
  rotateSpeed?: number
}

export function Sword({ autoRotate = true, rotateSpeed = 0.15 }: SwordProps) {
  const ref = useRef<Group>(null)
  const { scene } = useGLTF('/sword.glb')

  // Centre and normalise the model size once the GLB is loaded.
  const cloned = useMemo(() => {
    const s = scene.clone(true)
    const box = new Box3().setFromObject(s)
    const size = new Vector3()
    const center = new Vector3()
    box.getSize(size)
    box.getCenter(center)
    const maxAxis = Math.max(size.x, size.y, size.z) || 1
    const scale = 3.5 / maxAxis
    s.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
    s.scale.setScalar(scale)
    return s
  }, [scene])

  useEffect(() => {
    cloned.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
  }, [cloned])

  useFrame((_, dt) => {
    if (autoRotate && ref.current) ref.current.rotation.y += dt * rotateSpeed
  })

  return (
    <group ref={ref}>
      <primitive object={cloned} />
    </group>
  )
}
