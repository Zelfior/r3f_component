import * as React from "react";
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import BufferGeometryUtils from './BufferGeometryUtils.js';


function MultiBlockData({
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
                cellType: "MultiBlock",
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


    if (setRegionInfo) {
        setRegionInfo(regionMap);
    }

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
export { MultiBlockData };