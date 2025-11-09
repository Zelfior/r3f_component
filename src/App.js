import * as React from "react";
import { createRoot } from "react-dom/client";
import { useControls } from 'leva'
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Grid, OrbitControls, Edges, Merged, Stats, PerformanceMonitor } from '@react-three/drei';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { Perf } from 'r3f-perf'

import BufferGeometryUtils from './BufferGeometryUtils.js';

function MergedMesh({
    vertices,
    indices,
    colors,
    edge_colors,
    values,
    names,
    hoveredName,
    setRegionInfo,
}) {

    const mergedData = useMemo(() => {
        const geometries = [];
        const regionMap = [];

        let vertexOffset = 0;
        console.log(colors);
        names.forEach((name, i) => {
            const geom = new THREE.BufferGeometry();
            const positionArray = new Float32Array(vertices[i].flat());
            const indexArray = new Uint16Array(indices[i].flat());

            geom.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));
            geom.setIndex(new THREE.BufferAttribute(indexArray, 1));

            // Optional: region id
            const regionIdArray = new Float32Array(vertices[i].length).fill(i);
            geom.setAttribute("regionId", new THREE.BufferAttribute(regionIdArray, 1));

            // ✅ Assign per-vertex color
            const color = hoveredName === names[i] ? edge_colors[i] : colors[i];
            const colorArray = new Float32Array(vertices[i].length * 3);
            for (let j = 0; j < vertices[i].length; j++) {
                colorArray[j * 3] = color[0];
                colorArray[j * 3 + 1] = color[1];
                colorArray[j * 3 + 2] = color[2];
            }
            geom.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));

            regionMap.push({
            id: i,
            name,
            value: values[i],
            idOffset: vertexOffset,
            vertexCount: vertices[i].length,
            });

            vertexOffset += vertices[i].length; // increment by number of vertices
            geometries.push(geom);
        });

        const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
        return { geometry: merged, regionMap };
    }, [vertices, indices, colors, names, values]);

    const { geometry, regionMap } = mergedData;

    useEffect(() => {
        console.log(hoveredName, geometry);
        if (!geometry) return;

        const colorAttr = geometry.getAttribute("color");
        if (!colorAttr) return;

        const newColorArray = new Float32Array(colorAttr.array.length);

        // Build the whole new array from scratch
        regionMap.forEach((region, i) => {
            const color = hoveredName === names[i] ? edge_colors[i] : colors[i];
            for (let j = 0; j < region.vertexCount; j++) {
            const idx = (region.idOffset + j) * 3;
            newColorArray[idx] = color[0];
            newColorArray[idx + 1] = color[1];
            newColorArray[idx + 2] = color[2];
            }
        });

        // 🔁 Overwrite the buffer
        geometry.setAttribute("color", new THREE.BufferAttribute(newColorArray, 3));
        geometry.getAttribute("color").needsUpdate = true;

        colorAttr.needsUpdate = true;
    }, [colors, hoveredName]);


    if (setRegionInfo) setRegionInfo(regionMap);

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial
                vertexColors={true}
            />
            <Edges linewidth={1} scale={1} threshold={15} color={edge_colors[0]} />
        </mesh>
    );
}


function Scene({ setHoveredCell, setTargetPosition, setTooltipPos, regionMap }) {
    const { scene, camera, pointer, size } = useThree();
    const [isMouseMoving, setIsMouseMoving] = useState(false);

    useEffect(() => {
        const handleMouseMove = () => {
            setIsMouseMoving(true);
            const timer = setTimeout(() => setIsMouseMoving(false), 50);
            return () => clearTimeout(timer);
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    useFrame(() => {
        if (!isMouseMoving) return;
        const x = ((pointer.x + 1) / 2) * size.width;
        const y = ((1 - pointer.y) / 2) * size.height;
        setTooltipPos({ x, y });

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            const { object, face, point } = intersects[0];
            setTargetPosition(point);

            if (object.geometry && object.geometry.attributes.regionId) {
                const regionIdAttr = object.geometry.attributes.regionId;
                const regionId = regionIdAttr.getX(face.a);
                const region = regionMap.find((r) => r.id === regionId);
                if (region) setHoveredCell(region);
            }
        } else {
            setHoveredCell(null);
            setTargetPosition(null);
        }
    });

    return null;
}

function render({ model }) {
    let [vertices, pySetVertices] = model.useState("vertices");
    let [indices, pySetObjects] = model.useState("objects");
    let [colors, pySetColors] = model.useState("colors");
    let [edge_colors, pySetEdgeColors] = model.useState("edge_colors");
    let [values, pySetValues] = model.useState("values");
    let [names, pySetNames] = model.useState("names");


    const { ...controlProps } = useControls("controls", {
        enablePerf: { label: "Enable Performance", value: false },
    });

    const [hoveredCell, setHoveredCell] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, z: 0 });
    const [targetPosition, setTargetPosition] = useState(null);

    const [regionMap, setRegionMap] = useState([]);

    return (
        <div
            id="canvas-container"
            style={{ position: "relative", width: "100vw", height: "100vh" }}
        >
            <Canvas camera={{ position: [0, 5, 10] }}>
                <PerformanceMonitor>
                    <ambientLight intensity={1.} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <Grid infinite={true} cellSize={1} sectionSize={2} />
                    <Scene
                        setHoveredCell={setHoveredCell}
                        setTargetPosition={setTargetPosition}
                        setTooltipPos={setTooltipPos}
                        regionMap={regionMap} // <-- Pass regionMap
                    />
                    <MergedMesh
                        vertices={vertices}
                        indices={indices}
                        names={names}
                        colors={colors}
                        edge_colors={edge_colors}
                        values={values}
                        hoveredName={hoveredCell && hoveredCell.name} // Replace with your logic
                        setRegionInfo={setRegionMap}
                    />
                    <OrbitControls enableDamping={false} dampingFactor={0} />
                    <Stats />
                </PerformanceMonitor>
                {controlProps.enablePerf ? (
                    <Perf position="bottom-left" showGraph={false} />
                ) : (
                    <></>
                )}
            </Canvas>
            {hoveredCell && (
                <div
                    style={{
                        position: "fixed",
                        pointerEvents: "none",
                        left: tooltipPos.x + 10,
                        top: tooltipPos.y + 10,
                        background: "rgba(0,0,0,0.7)",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontFamily: "sans-serif",
                        whiteSpace: "nowrap",
                    }}
                >
                    <div>Cell : {hoveredCell.name}</div>
                    <div>
                        Location : {targetPosition.x.toFixed(2)},{" "}
                        {targetPosition.y.toFixed(2)}, {targetPosition.z.toFixed(2)}
                    </div>
                    <div>Value : {hoveredCell.value}</div>
                </div>
            )}
        </div>
    );
}

export default { render, React, createRoot };
