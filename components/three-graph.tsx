"use client"

import { useRef, useEffect, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

interface ThreeGraphProps {
  className?: string
}

export function ThreeGraph({ className }: ThreeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()

    // Camera setup - use orthographic camera to avoid perspective distortion
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
    const frustumSize = 10
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000,
    )
    camera.position.z = 5

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(window.devicePixelRatio) // Improve rendering quality
    containerRef.current.appendChild(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enableZoom = false
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.5

    // Create nodes
    const nodes: THREE.Mesh[] = []
    const nodeCount = 30

    // Create glass material for nodes
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x888888,
      metalness: 0.1,
      roughness: 0.2,
      transmission: 0.9, // Glass transparency
      thickness: 0.5, // Glass thickness
      envMapIntensity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.6,
    })

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Add point lights with different colors for reflections
    const pointLight1 = new THREE.PointLight(0x51faaa, 1, 10)
    pointLight1.position.set(2, 2, 2)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xff81ff, 1, 10)
    pointLight2.position.set(-2, -2, -2)
    scene.add(pointLight2)

    // Create environment map for reflections
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256)
    cubeRenderTarget.texture.type = THREE.HalfFloatType
    const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRenderTarget)
    scene.add(cubeCamera)

    // Create nodes at random positions
    for (let i = 0; i < nodeCount; i++) {
      // Create a higher-poly sphere for better glass effect
      const nodeGeometry = new THREE.SphereGeometry(0.12, 32, 32)
      const node = new THREE.Mesh(nodeGeometry, glassMaterial.clone())

      // Random position within a sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 2 + Math.random() * 1

      node.position.x = radius * Math.sin(phi) * Math.cos(theta)
      node.position.y = radius * Math.sin(phi) * Math.sin(theta)
      node.position.z = radius * Math.cos(phi)

      scene.add(node)
      nodes.push(node)
    }

    // Create edges between nodes
    const edgeCount = 40
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x616083,
      transparent: true,
      opacity: 0.2,
    })

    for (let i = 0; i < edgeCount; i++) {
      const sourceIndex = Math.floor(Math.random() * nodeCount)
      const targetIndex = Math.floor(Math.random() * nodeCount)

      if (sourceIndex !== targetIndex) {
        const sourceNode = nodes[sourceIndex]
        const targetNode = nodes[targetIndex]

        const points = [
          new THREE.Vector3(sourceNode.position.x, sourceNode.position.y, sourceNode.position.z),
          new THREE.Vector3(targetNode.position.x, targetNode.position.y, targetNode.position.z),
        ]

        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
        const line = new THREE.Line(lineGeometry, edgeMaterial)
        scene.add(line)
      }
    }

    // Handle mouse movement
    const handleMouseMove = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      // Calculate normalized mouse position (-1 to 1)
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      setMousePosition({ x, y })
    }

    window.addEventListener("mousemove", handleMouseMove)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)

      // Update environment map for reflections
      cubeCamera.update(renderer, scene)
      nodes.forEach((node) => {
        ;(node.material as THREE.MeshPhysicalMaterial).envMap = cubeRenderTarget.texture
      })

      // Rotate based on mouse position
      scene.rotation.y += 0.001
      scene.rotation.x += 0.0005

      // Apply subtle movement based on mouse position
      scene.rotation.y += mousePosition.x * 0.0005
      scene.rotation.x += mousePosition.y * 0.0005

      // Animate point lights
      const time = Date.now() * 0.001
      pointLight1.position.x = Math.sin(time * 0.7) * 3
      pointLight1.position.y = Math.cos(time * 0.5) * 3
      pointLight1.position.z = Math.cos(time * 0.3) * 3

      pointLight2.position.x = Math.sin(time * 0.3) * 3
      pointLight2.position.y = Math.cos(time * 0.7) * 3
      pointLight2.position.z = Math.sin(time * 0.5) * 3

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return

      const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight

      // Update orthographic camera on resize
      camera.left = (frustumSize * aspect) / -2
      camera.right = (frustumSize * aspect) / 2
      camera.top = frustumSize / 2
      camera.bottom = frustumSize / -2
      camera.updateProjectionMatrix()

      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }

    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return <div ref={containerRef} className={className} />
}
