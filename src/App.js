import * as React from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Grid, OrbitControls, Edges } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';


function Scene({ setHoveredCell, setTargetPosition, setTooltipPos }) {
  const { scene, camera, pointer, size } = useThree();
  const [isMouseMoving, setIsMouseMoving] = useState(false);

  
  useEffect(() => {
    const handleMouseMove = () => {
      setIsMouseMoving(true);
      const timer = setTimeout(() => setIsMouseMoving(false), 50);
      return () => clearTimeout(timer);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    if (!isMouseMoving) {
      return;
    }
    // Update tooltip position every frame
    const x = (pointer.x + 1) / 2 * size.width;
    const y = (1 - pointer.y) / 2 * size.height; // flip Y
    setTooltipPos({ x, y });


    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      const { object, point } = intersects[0];
      setTargetPosition(point);
      if (object.userData && object.userData.name) {
        setHoveredCell(object.userData);
      }
    } else {
      setHoveredCell(null);
      setTargetPosition(null);
    }
  });

  return null;
}

function InstancedCells({ cells, hoveredCell }) {
  const meshRef = useRef();
  const color = new THREE.Color();

  useEffect(() => {
    cells.forEach((cell, i) => {
      const matrix = new THREE.Matrix4();
      matrix.setPosition(...cell.pos);
      meshRef.current.setMatrixAt(i, matrix);

      // Set color per instance
      color.set(cell.base_color);
      meshRef.current.setColorAt(i, color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor.needsUpdate = true;
  }, [cells]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ vertexColors: true }), cells.length]}
    />
  );
}


function Cell({ position, name, base_color, edge_color, isHovered, value }) {
  const meshRef = useRef();
  return (
    <mesh position={position} ref={meshRef} userData={{ name, value }}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={isHovered ? edge_color : base_color} />
      <Edges
        linewidth={3}
        scale={1.}
        threshold={15}
        color={edge_color}
      />
    </mesh>
  );
}

function App() {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, z: 0 });
  const [targetPosition, setTargetPosition] = useState(null);

  const cells = [];
  const size = 8;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        cells.push({
          pos: [x, y, z],
          name: `(${x}, ${y}, ${z})`,
          base_color: `rgb(${Math.round((x / (size - 1)) * 255)}, ${Math.round((y / (size - 1)) * 255)}, ${Math.round((z / (size - 1)) * 255)})`,
          edge_color: `rgb(
            ${Math.max(0, Math.round((x / (size - 1)) * 255) - 20)},
            ${Math.max(0, Math.round((y / (size - 1)) * 255) - 20)},
            ${Math.max(0, Math.round((z / (size - 1)) * 255) - 20)}
          )`,
          value: x + y * size + z * size * size,
        });
      }
    }
  }

  return (
    <div
      id="canvas-container"
      style={{ position: 'relative', width: '100vw', height: '100vh' }}
    >
      <Canvas camera={{ position: [0, 5, 10], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Grid infinite={true} cellSize={1} sectionSize={2} />
        <Scene setHoveredCell={setHoveredCell} setTargetPosition={setTargetPosition} setTooltipPos={setTooltipPos}/>
        {cells.map((cell, i) => (
          <Cell
            key={i}
            position={cell.pos}
            name={cell.name}
            value={cell.value}
            base_color={cell.base_color}
            edge_color={cell.edge_color}
            isHovered={hoveredCell?.name === cell.name}
          />
        ))}
        <OrbitControls enableDamping={false} dampingFactor={0} />
      </Canvas>
      {hoveredCell && (
        <div
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            left: tooltipPos.x + 10,
            top: tooltipPos.y + 10,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          <div>
            Cell : {hoveredCell.name}
          </div>
          <div>
            Location : {targetPosition.x.toFixed(2)}, {targetPosition.y.toFixed(2)}, {targetPosition.z.toFixed(2)}
          </div>
          <div>
            Value : {hoveredCell.value}
          </div>
        </div>
      )}
    </div>
  );
}

export default { render: () => <App />, React, createRoot };
