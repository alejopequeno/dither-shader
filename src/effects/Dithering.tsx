import { forwardRef, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector2 } from 'three'
import { DitheringEffect, type DitheringEffectOptions } from './DitheringEffect'

export const Dithering = forwardRef<DitheringEffect, DitheringEffectOptions>(
  function Dithering(props, ref) {
    const effect = useMemo(() => new DitheringEffect(props), [])

    if (props.pixelSize !== undefined) effect.pixelSize = props.pixelSize
    if (props.threshold !== undefined) effect.threshold = props.threshold
    if (props.darkness !== undefined) effect.darkness = props.darkness
    if (props.brightness !== undefined) effect.brightness = props.brightness
    if (props.invert !== undefined) effect.invert = props.invert
    if (props.hoverRadius !== undefined) effect.hoverRadius = props.hoverRadius
    if (props.hoverStrength !== undefined) effect.hoverStrength = props.hoverStrength
    if (props.hoverScatter !== undefined) effect.hoverScatter = props.hoverScatter

    const target = useRef(new Vector2(-2, -2))
    const lastPos = useRef(new Vector2(-2, -2))
    const lastMoveAt = useRef(0)
    const speed = useRef(0)
    const revealStart = useRef<number | null>(null)
    const REVEAL_DURATION = 1.1
    const gl = useThree((s) => s.gl)

    useEffect(() => {
      const el = gl.domElement
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect()
        const u = (e.clientX - r.left) / r.width
        const v = 1.0 - (e.clientY - r.top) / r.height
        const dx = u - lastPos.current.x
        const dy = v - lastPos.current.y
        speed.current = Math.min(1, Math.hypot(dx, dy) * 25)
        lastPos.current.set(u, v)
        target.current.set(u, v)
        lastMoveAt.current = performance.now()
      }
      const onLeave = () => {
        target.current.set(-2, -2)
        speed.current = 0
      }
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerleave', onLeave)
      return () => {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerleave', onLeave)
      }
    }, [gl])

    useFrame((state, dt) => {
      effect.hoverPoint.lerp(target.current, 0.25)

      const idleMs = performance.now() - lastMoveAt.current
      if (idleMs > 40) speed.current *= Math.max(0, 1 - dt * 8)
      const targetActivity = speed.current
      const a = effect.hoverActivity
      const k = Math.min(1, dt * (targetActivity > a ? 18 : 4))
      effect.hoverActivity = a + (targetActivity - a) * k

      // Photographic reveal: as soon as the scene actually has meshes
      // (i.e. Suspense resolved the GLB), start ramping revealProgress
      // 0 -> 1 with an ease-out cubic.
      if (revealStart.current === null) {
        let meshCount = 0
        state.scene.traverse((o) => {
          if ((o as { isMesh?: boolean }).isMesh) meshCount++
        })
        if (meshCount > 0) revealStart.current = state.clock.elapsedTime
      }
      let p = 0
      if (revealStart.current !== null) {
        const t = (state.clock.elapsedTime - revealStart.current) / REVEAL_DURATION
        const c = Math.min(1, Math.max(0, t))
        p = 1 - Math.pow(1 - c, 3)
      }
      effect.revealProgress = p
    })

    return <primitive ref={ref} object={effect} dispose={null} />
  },
)
