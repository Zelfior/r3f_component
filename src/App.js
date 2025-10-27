import * as React from "react";
import { createRoot } from "react-dom/client";
import { useControls } from 'leva'
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Grid, OrbitControls, Edges, Merged, Stats, PerformanceMonitor } from '@react-three/drei';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { Perf } from 'r3f-perf'

function CustomMesh({ vertices, indices, name, color, edge_color, value, isHovered }) {
  const positionArray = useMemo(() => new Float32Array(vertices.flat()), [vertices]);
  const indexArray = useMemo(() => new Uint16Array(indices.flat()), [indices]);

  return (
    <mesh name={name} userData={{ value, name }}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positionArray}
          count={positionArray.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="index"
          array={indexArray}
          count={indexArray.length}
          itemSize={1}
        />
      </bufferGeometry>
      <meshStandardMaterial color={color}
      // transparent={true}
      // opacity={0.5} 
      />
      <Edges
        linewidth={1}
        scale={1.}
        threshold={15}
        color={edge_color}
      />
    </mesh>
  );
}


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

function render({ model }) {
  let [vertices, pySetVertices] = model.useState("vertices");
  let [indices, pySetObjects] = model.useState("objects");
  let [colors, pySetColors] = model.useState("colors");
  let [edge_colors, pySetEdgeColors] = model.useState("edge_colors");
  let [values, pySetValues] = model.useState("values");
  let [names, pySetNames] = model.useState("names");

  // const { ...controlProps } = useControls('controls', {
  //   enablePerf: { label: 'Enable Performance', value: false },
  // })

  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, z: 0 });
  const [targetPosition, setTargetPosition] = useState(null);

  return (
    <div
      id="canvas-container"
      style={{ position: 'relative', width: '100vw', height: '100vh' }}
    >
      <Canvas camera={{ position: [0, 5, 10] }}>
        {/* <PerformanceMonitor> */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Grid infinite={true} cellSize={1} sectionSize={2} />
        <Scene setHoveredCell={setHoveredCell} setTargetPosition={setTargetPosition} setTooltipPos={setTooltipPos} />
        {/* <Merged geometries> */}
          {Array.from({ length: Math.floor(names.length/2) }, (_, i) => (
            <CustomMesh
              key={i}
              name={names[i]}
              vertices={vertices[i]}
              indices={indices[i]}
              color={colors[i]}
              edgeColor={edge_colors[i]}
              value={values[i]}
              isHovered={hoveredCell && hoveredCell.name === names[i]} // Replace with your logic
            />
          ))}
        {/* </Merged> */}
        <OrbitControls enableDamping={false} dampingFactor={0} />
        {/* <Stats /> */}
        {/* </PerformanceMonitor> */}
        {/* {controlProps.enablePerf ? <Perf position="bottom-left" showGraph={false} /> : <></>} */}
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

export default { render, React, createRoot };
