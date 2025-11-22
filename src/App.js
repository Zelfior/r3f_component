import * as React from "react";
import { createRoot } from "react-dom/client";
import { useControls } from 'leva'
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Grid, OrbitControls, Stats, PerformanceMonitor, GizmoHelper, GizmoViewport, PivotControls, Line } from '@react-three/drei';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { Perf } from 'r3f-perf'

import BufferGeometryUtils from './BufferGeometryUtils.js';
import { min } from "three/examples/jsm/nodes/Nodes.js";


function SliceSquare({ scale }) {
    const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
    const material = useMemo(() => new THREE.MeshBasicMaterial({
        color: 0xdddddd,
        // wireframe: true,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
    }), []);

    return (
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[scale, scale, scale]}>
            <primitive object={geometry} />
            <primitive object={material} />
        </mesh>
    );
}
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
        const edgesGeometries = [];
        const regionMap = [];

        let vertexOffset = 0;
        vertices.forEach((_, i) => {
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
                name: names[i],
                value: values[i],
                idOffset: vertexOffset,
                vertexCount: vertices[i].length,
            });

            vertexOffset += vertices[i].length; // increment by number of vertices
            geometries.push(geom);
            edgesGeometries.push(new THREE.EdgesGeometry(geom));
        });

        const mergedEdges = BufferGeometryUtils.mergeGeometries(edgesGeometries, false);

        const mergedEdgesColorArray = new Float32Array(mergedEdges.attributes.position.count * 3);
        let offset = 0;
        edgesGeometries.forEach((edgeGeom, i) => {
            const color = edge_colors[i];
            for (let j = 0; j < edgeGeom.attributes.position.count; j++) {
                mergedEdgesColorArray[(offset + j) * 3] = color[0];
                mergedEdgesColorArray[(offset + j) * 3 + 1] = color[1];
                mergedEdgesColorArray[(offset + j) * 3 + 2] = color[2];
            }
            offset += edgeGeom.attributes.position.count;
        });
        mergedEdges.setAttribute('color', new THREE.BufferAttribute(mergedEdgesColorArray, 3));

        const merged = BufferGeometryUtils.mergeGeometries(geometries, false);

        return { geometry: merged, mergedEdges: mergedEdges, regionMap };
    }, [vertices, indices, colors, names, values]);

    const { geometry, regionMap, mergedEdges } = mergedData;

    useEffect(() => {
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
        <group>
            <mesh geometry={geometry}>
                <meshStandardMaterial emissive vertexColors emissiveIntensity={20.5} />
            </mesh>
            <lineSegments geometry={mergedEdges}>
                <lineBasicMaterial vertexColors linewidth={1} />
            </lineSegments>
        </group>
    );
}

const AxesHelper = ({ boundingBox }) => {
    const { min, max } = boundingBox;
    const center = [(min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2];
    const size = [max.x - min.x, max.y - min.y, max.z - min.z];

    const lineWidth = 1.5;
    return (
        <>
            {/* X-axis */}
            <Line
                points={[
                    [center[0] - size[0] / 2, center[1] - size[1] / 2, center[2] - size[2] / 2],
                    [center[0] + size[0] / 2, center[1] - size[1] / 2, center[2] - size[2] / 2],
                ]}
                color="gray"
                lineWidth={lineWidth}
            />
            {/* Y-axis */}
            <Line
                points={[
                    [center[0] - size[0] / 2, center[1] - size[1] / 2, center[2] - size[2] / 2],
                    [center[0] - size[0] / 2, center[1] + size[1] / 2, center[2] - size[2] / 2],
                ]}
                color="gray"
                lineWidth={lineWidth}
            />
            {/* Z-axis */}
            <Line
                points={[
                    [center[0] - size[0] / 2, center[1] - size[1] / 2, center[2] - size[2] / 2],
                    [center[0] - size[0] / 2, center[1] - size[1] / 2, center[2] + size[2] / 2],
                ]}
                color="gray"
                lineWidth={lineWidth}
            />
        </>
    );
};

function Scene({ setHoveredCell, setTargetPosition, setTooltipPos, regionMap, pySetMatrix, displayAxesGizmo, displaySliceTool, squareScale, displayAxes, axesBoundingBox }) {
    const { scene, camera, pointer, size } = useThree();
    const [isMouseMoving, setIsMouseMoving] = useState(false);


    // Inside your component
    const [isDraggingGizmo, setIsDraggingGizmo] = useState(false);

    useEffect(() => {
        const handleMouseMove = () => {
            setIsMouseMoving(true);
            const timer = setTimeout(() => setIsMouseMoving(false), 50);
            return () => clearTimeout(timer);
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    useFrame((state) => {
        if (!isMouseMoving) return;

        const x = ((pointer.x + 1) / 2) * size.width;
        const y = ((1 - pointer.y) / 2) * size.height;
        setTooltipPos({ x, y });

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        const intersectedObject = intersects.find(
            ({ object }) => object.geometry && object.geometry.attributes.regionId
        );

        if (intersectedObject) {
            const { object, face, point } = intersectedObject;
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

    const controlRef = useRef();
    // const matrix = new THREE.Matrix4()

    return (
        <>
            <OrbitControls
                enableDamping={false}
                dampingFactor={0}
                enabled={!isDraggingGizmo} // Disable when dragging gizmo
            />
            {displayAxesGizmo && (
                <GizmoHelper
                    alignment="bottom-right"
                    margin={[80, 80]}
                // Optional: Use a callback to detect drag state
                >
                    <GizmoViewport
                        axisColors={['red', 'green', 'blue']}
                        labelColor="black"
                    />
                </GizmoHelper>
            )}
            {displaySliceTool && (
                <PivotControls
                    ref={controlRef}
                    onDragStart={() => setIsDraggingGizmo(true)}
                    onDragEnd={() => {
                        setIsDraggingGizmo(false);
                        pySetMatrix(controlRef.current.matrix.toArray());
                    }}
                    disableScaling={true}
                >
                    <SliceSquare scale={squareScale} />
                </PivotControls>
            )}
            {displayAxes && (
                <AxesHelper boundingBox={axesBoundingBox} />
            )}
        </>
    );
}

function render({ model }) {
    let [intensity, pyIntensity] = model.useState("intensity");

    let [vertices, pySetVertices] = model.useState("vertices");
    let [indices, pySetObjects] = model.useState("objects");
    let [colors, pySetColors] = model.useState("colors");
    let [edge_colors, pySetEdgeColors] = model.useState("edge_colors");
    let [values, pySetValues] = model.useState("values");
    let [names, pySetNames] = model.useState("names");
    let [matrix, pySetMatrix] = model.useState("matrix");

    let [displayAxesGizmo, pySetDisplayAxesGizmo] = model.useState("display_axes_gizmo");
    let [displaySliceTool, pySetDisplaySliceTool] = model.useState("slice_tool_visible");
    let [sliceToolScale, pySetSliceToolScale] = model.useState("slice_tool_scale");
    
    let [box, setBox] = model.useState("axes_range");

    const [hoveredCell, setHoveredCell] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, z: 0 });
    const [targetPosition, setTargetPosition] = useState(null);

    const [regionMap, setRegionMap] = useState([]);

    const axesBoundingBox = useMemo(() => {
        return {
            min: new THREE.Vector3(box[0], box[2], box[4]),
            max: new THREE.Vector3(box[1], box[3], box[5]),
        };
    }, [box]);

    return (
        <div
            id="canvas-container"
            style={{ position: "relative", width: "100%", height: "100%" }}
        >
            <Canvas camera={{ position: [0, 5, 10] }} linear flat>
                <ambientLight intensity={intensity} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <Grid infinite={true} cellSize={1} sectionSize={2} />
                <Scene
                    setHoveredCell={setHoveredCell}
                    setTargetPosition={setTargetPosition}
                    setTooltipPos={setTooltipPos}
                    regionMap={regionMap} // <-- Pass regionMap
                    pySetMatrix={pySetMatrix}
                    displayAxesGizmo={displayAxesGizmo}
                    displaySliceTool={displaySliceTool}
                    squareScale={sliceToolScale}
                    displayAxes={true}
                    axesBoundingBox={axesBoundingBox}
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
                <Stats />
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
