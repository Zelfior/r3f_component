import * as React from "react";
import { AxesHelper } from './axis.js';

import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, PivotControls } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';


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

function Scene({ setHoveredCell, setTargetPosition, setTooltipPos, regionMap, pySetMatrix, displayAxesGizmo, displaySliceTool, squareScale, displayAxes, axesBoundingBox, dataBoundingBox }) {
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

    return (
        <>
            <OrbitControls
                enableDamping={false}
                dampingFactor={0}
                enabled={!isDraggingGizmo} // Disable when dragging gizmo
            />
            {displayAxesGizmo && (
                <GizmoHelper
                    alignment="bottom-left"
                    margin={[80, 80]}
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
                <AxesHelper boundingBox={axesBoundingBox} dataBox={dataBoundingBox} />
            )}
        </>
    );
}

export { Scene };