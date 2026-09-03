"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as THREE from "three";

interface HeroDataCoreProps {
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export function HeroDataCore({ onNodeClick, className = "" }: HeroDataCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    // Check WebGL availability
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      setWebglSupported(false);
      return;
    }
    setWebglSupported(true);

    if (!containerRef.current) return;
    const container = containerRef.current;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- 1. Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.2, 14);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // --- 2. Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, resolvedTheme === "dark" ? 0.6 : 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    keyLight.position.set(10, 12, 10);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x818cf8, 2.0, 30);
    rimLight.position.set(-10, -8, -6);
    scene.add(rimLight);

    // --- 3. Central Data Intelligence Core ---
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Inner Icosahedron
    const coreGeo = new THREE.IcosahedronGeometry(1.7, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x2563eb,
      emissiveIntensity: 0.45,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);

    // Outer Wireframe Cage
    const cageGeo = new THREE.IcosahedronGeometry(2.1, 1);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    coreGroup.add(cageMesh);

    // Orbiting Rings
    const ringGeo1 = new THREE.TorusGeometry(2.6, 0.03, 16, 80);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    coreGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(3.0, 0.025, 16, 80);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.5 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    coreGroup.add(ring2);

    // --- 4. Source & Destination Peripheral Nodes ---
    const nodes: { mesh: THREE.Mesh; id: string; label: string; basePos: THREE.Vector3 }[] = [];

    const nodeSpecs = [
      { id: "excel", label: "Excel (.xlsx)", color: 0x10b981, pos: new THREE.Vector3(-4.8, 2.2, 0) },
      { id: "postgres", label: "PostgreSQL", color: 0x3b82f6, pos: new THREE.Vector3(-5.2, -0.4, 0) },
      { id: "csv", label: "CSV / Parquet", color: 0xf59e0b, pos: new THREE.Vector3(-4.6, -2.6, 0) },
      { id: "analytics", label: "OLAP Analytics", color: 0x06b6d4, pos: new THREE.Vector3(5.0, 1.8, 0) },
      { id: "insights", label: "Automated Insights", color: 0xa855f7, pos: new THREE.Vector3(4.8, -1.8, 0) },
    ];

    nodeSpecs.forEach((spec) => {
      const geo = new THREE.DodecahedronGeometry(0.55);
      const mat = new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.color,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.7,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(spec.pos);
      mesh.userData = { id: spec.id, label: spec.label, color: spec.color };
      scene.add(mesh);
      nodes.push({ mesh, id: spec.id, label: spec.label, basePos: spec.pos.clone() });

      // Connection beam to Core
      const points = [spec.pos, new THREE.Vector3(0, 0, 0)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.4,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
    });

    // --- 5. Data Flow Particles (Streams into/out of Core) ---
    const particleCount = 650;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleTargets = new Float32Array(particleCount * 3);
    const particleProgress = new Float32Array(particleCount);
    const particleSpeed = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const isInput = i % 2 === 0;
      const nodeIdx = i % (isInput ? 3 : 2) + (isInput ? 0 : 3);
      const srcNode = nodeSpecs[nodeIdx] ?? nodeSpecs[0]!;

      if (isInput) {
        // From source to core
        particlePositions[i * 3 + 0] = srcNode.pos.x;
        particlePositions[i * 3 + 1] = srcNode.pos.y;
        particlePositions[i * 3 + 2] = srcNode.pos.z;
        particleTargets[i * 3 + 0] = 0;
        particleTargets[i * 3 + 1] = 0;
        particleTargets[i * 3 + 2] = 0;
      } else {
        // From core to destination
        particlePositions[i * 3 + 0] = 0;
        particlePositions[i * 3 + 1] = 0;
        particlePositions[i * 3 + 2] = 0;
        particleTargets[i * 3 + 0] = srcNode.pos.x;
        particleTargets[i * 3 + 1] = srcNode.pos.y;
        particleTargets[i * 3 + 2] = srcNode.pos.z;
      }

      particleProgress[i] = Math.random();
      particleSpeed[i] = 0.006 + Math.random() * 0.008;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: resolvedTheme === "dark" ? 0x00f0ff : 0x2563eb,
      size: 0.12,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // --- 6. Raycasting & Mouse Interaction ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let targetCameraX = 0;
    let targetCameraY = 1.2;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      targetCameraX = mouse.x * 1.2;
      targetCameraY = 1.2 + mouse.y * 0.8;
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodes.map((n) => n.mesh));
      if (intersects.length > 0 && intersects[0]) {
        const hit = intersects[0].object;
        if (hit.userData.id && onNodeClick) {
          onNodeClick(hit.userData.id);
        }
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("click", handleClick);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // --- 7. Animation Loop ---
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!reducedMotion) {
        // Gentle rotation of core
        coreMesh.rotation.y += 0.008;
        coreMesh.rotation.x += 0.004;
        cageMesh.rotation.y -= 0.005;
        ring1.rotation.z += 0.012;
        ring2.rotation.z -= 0.009;

        // Camera gentle lerp
        camera.position.x += (targetCameraX - camera.position.x) * 0.05;
        camera.position.y += (targetCameraY - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0);

        // Nodes hover/float
        const time = Date.now() * 0.002;
        nodes.forEach((n, idx) => {
          n.mesh.position.y = n.basePos.y + Math.sin(time + idx) * 0.15;
          n.mesh.rotation.y += 0.01;
        });

        // Flow particles along paths
        const posAttr = particleGeo.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < particleCount; i++) {
          const currentSpeed = particleSpeed[i] ?? 0.006;
          const currentProg = (particleProgress[i] ?? 0) + currentSpeed;
          particleProgress[i] = currentProg > 1 ? 0 : currentProg;

          const p = particleProgress[i] ?? 0;
          const isInput = i % 2 === 0;
          const nodeIdx = i % (isInput ? 3 : 2) + (isInput ? 0 : 3);
          const srcNode = nodeSpecs[nodeIdx] ?? nodeSpecs[0]!;

          if (isInput) {
            posAttr.setXYZ(
              i,
              THREE.MathUtils.lerp(srcNode.pos.x, 0, p),
              THREE.MathUtils.lerp(srcNode.pos.y, 0, p) + Math.sin(p * Math.PI) * 0.2,
              THREE.MathUtils.lerp(srcNode.pos.z, 0, p)
            );
          } else {
            posAttr.setXYZ(
              i,
              THREE.MathUtils.lerp(0, srcNode.pos.x, p),
              THREE.MathUtils.lerp(0, srcNode.pos.y, p) + Math.sin(p * Math.PI) * 0.2,
              THREE.MathUtils.lerp(0, srcNode.pos.z, p)
            );
          }
        }
        posAttr.needsUpdate = true;
      }

      // Check hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodes.map((n) => n.mesh));
      if (intersects.length > 0 && intersects[0]) {
        setHoveredNode(intersects[0].object.userData.label);
        container.style.cursor = "pointer";
      } else {
        setHoveredNode(null);
        container.style.cursor = "default";
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleClick);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [resolvedTheme, onNodeClick]);

  if (webglSupported === false) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl border border-border bg-card/60 p-8 backdrop-blur ${className}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-primary">
            ⚡
          </div>
          <h3 className="text-base font-bold text-foreground">Data Intelligence Core</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Ingesting Excel, CSV, and PostgreSQL into in-process columnar DuckDB storage.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Excel (.xlsx)</span>
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">PostgreSQL 16</span>
            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400">DuckDB OLAP</span>
            <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">AI Signals</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="h-full w-full" aria-hidden="true" />
      {hoveredNode && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card/90 px-4 py-1.5 text-xs font-semibold text-foreground backdrop-blur shadow-lg transition-opacity animate-in fade-in">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
          {hoveredNode}
        </div>
      )}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-1 text-[11px] font-mono text-muted-foreground backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>THREE.JS WEBGL PIPELINE</span>
      </div>
    </div>
  );
}
