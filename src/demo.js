import * as React from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges, Html } from '@react-three/drei';

// 3D Scene Component
function CubeScene({ cubeCount, cubeColor, counter, color_selector }) {
  return (
    <Canvas camera={{ position: [0, 2.5, 10], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <OrbitControls />
      {Array(cubeCount).fill().map((_, i) => (
        <mesh key={i} position={[0, 1.1 * i, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={cubeColor || `hsl(${i * 60}, 100%, 50%)`} />
          <Edges color={cubeColor} />
        </mesh>
      ))}
      <Html position={[1.5, 5 / 2, 0]}
      >
        <div style={{
          backgroundColor: 'white',
          border: '1px solid gray',
          padding: '10px',
          borderRadius: '5px',
          display: 'inline-block'
        }}>
          {counter}
          {color_selector}
        </div>
      </Html>
    </Canvas>
  );
}

function render({ model }) {
  let [cube_count,] = model.useState("cube_count"); // param.Integer()
  let [cube_color,] = model.useState("cube_color"); // param.String()
  let counter = model.get_child("counter"); // Child()
  let color_selector = model.get_child("color_selector"); // Child()

  return (
    <div
      id="canvas-container"
      style={{ position: 'relative', width: '100vw', height: '100vh' }}
    >
      <CubeScene cubeCount={cube_count} cubeColor={cube_color} counter={counter} color_selector={color_selector} />

    </div>
  );
}

export default { render, React, createRoot };
