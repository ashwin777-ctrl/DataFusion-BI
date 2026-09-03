"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as THREE from "three";

export interface TopologyNode {
  id: string;
  name: string;
  rowCount: number;
  columns: string[];
  type: "fact" | "dimension" | "target";
}

interface TopologyUniverseProps {
  nodes?: TopologyNode[];
  className?: string;
  onSelectNode?: (nodeId: string) => void;
}

const DEFAULT_NODES: TopologyNode[] = [
  { id: "orders", name: "fact_orders", rowCount: 10000, columns: ["order_id", "customer_id", "product_id", "amount", "order_date"], type: "fact" },
  { id: "products", name: "dim_products", rowCount: 48, columns: ["product_id", "category", "price", "margin"], type: "dimension" },
  { id: "customers", name: "dim_customers", rowCount: 320, columns: ["customer_id", "region", "segment", "country"], type: "dimension" },
  { id: "targets", name: "fact_targets", rowCount: 12, columns: ["month", "target_revenue", "target_margin"], type: "target" },
];

export function TopologyUniverse({ nodes = DEFAULT_NODES, className = "", onSelectNode }: TopologyUniverseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      setWebglSupported(false);
      return;
    }
    setWebglSupported(true);

    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 3, 11);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // Ambient & Directional Lights
    const ambient = new THREE.AmbientLight(0xffffff, resolvedTheme === "dark" ? 0.7 : 0.95);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    // Group for nodes
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // Node Meshes
    const meshMap: { mesh: THREE.Mesh; nodeData: TopologyNode; basePos: THREE.Vector3 }[] = [];

    const positions: [number, number, number][] = [
      [0, 0.2, 0],       // fact_orders (center)
      [-3.4, 1.8, -1.2], // dim_products (upper left)
      [3.4, 1.4, -1.0],  // dim_customers (upper right)
      [0, -2.2, 0.8],    // fact_targets (bottom)
    ];

    nodes.forEach((node, idx) => {
      const pos = positions[idx % positions.length] ?? [0, 0, 0];
      const isFact = node.type === "fact";
      const geo = isFact ? new THREE.OctahedronGeometry(1.0, 0) : new THREE.BoxGeometry(1.2, 0.8, 1.2);

      let color = 0x2563eb;
      if (node.type === "dimension") color = 0x10b981;
      if (node.type === "target") color = 0xa855f7;

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.2,
        metalness: 0.8,
        emissive: color,
        emissiveIntensity: 0.35,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.userData = { node };
      graphGroup.add(mesh);
      meshMap.push({ mesh, nodeData: node, basePos: mesh.position.clone() });
    });

    // Edges (Relations to central fact)
    if (meshMap.length > 1 && meshMap[0]) {
      const centerPos = meshMap[0].mesh.position;
      for (let i = 1; i < meshMap.length; i++) {
        const targetMesh = meshMap[i]?.mesh;
        if (targetMesh) {
          const edgePoints = [centerPos, targetMesh.position];
          const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
          const edgeMat = new THREE.LineBasicMaterial({
            color: resolvedTheme === "dark" ? 0x00f0ff : 0x2563eb,
            transparent: true,
            opacity: 0.5,
          });
          const edge = new THREE.Line(edgeGeo, edgeMat);
          graphGroup.add(edge);
        }
      }
    }

    // Interactive Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(meshMap.map((m) => m.mesh));
      if (hits.length > 0 && hits[0]) {
        const selected = hits[0].object.userData.node as TopologyNode;
        setSelectedNode(selected);
        if (onSelectNode) onSelectNode(selected.id);
      }
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("click", onClick);

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      graphGroup.rotation.y += 0.003;
      meshMap.forEach((m, idx) => {
        m.mesh.rotation.y += 0.01;
        m.mesh.position.y = m.basePos.y + Math.sin(Date.now() * 0.0018 + idx) * 0.1;
      });

      // Pointer glow
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(meshMap.map((m) => m.mesh));
      container.style.cursor = hits.length > 0 ? "pointer" : "default";

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("click", onClick);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [nodes, resolvedTheme, onSelectNode]);

  if (webglSupported === false) {
    return (
      <div className={`rounded-xl border border-border bg-card p-6 ${className}`}>
        <h4 className="text-sm font-bold text-foreground">Dataset Topological Graph</h4>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {nodes.map((node) => (
            <div key={node.id} className="rounded-lg border border-border/80 bg-surface-sunken p-3">
              <span className="text-xs font-mono font-bold text-primary">{node.name}</span>
              <p className="text-[11px] text-muted-foreground">{node.rowCount.toLocaleString()} rows</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur ${className}`}>
      <div ref={containerRef} className="h-[360px] w-full" aria-hidden="true" />

      {/* 3D Topology HUD Overlay */}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-semibold backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
        <span>3D JOIN TOPOLOGY · DUCKDB ENGINE</span>
      </div>

      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border bg-card/95 p-3.5 backdrop-blur shadow-lg transition-all animate-in fade-in sm:left-auto sm:right-4 sm:w-80">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-primary">{selectedNode.name}</span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent uppercase">
              {selectedNode.type}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedNode.rowCount.toLocaleString()} indexed rows · {selectedNode.columns.length} columns
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedNode.columns.slice(0, 4).map((col) => (
              <span key={col} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {col}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
