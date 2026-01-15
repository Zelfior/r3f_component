import * as React from "react";
import { useThree, useFrame } from '@react-three/fiber';
import { Line, Text } from '@react-three/drei';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

function drawLine(direction, center, halfLength, tickLocationHalfLength, halfTickLength, tickDirection, label, lineColor = "lightgray", labelColor = "gray", lineWidth = 1.5, axesNameSize = 0.5, axesLabelDistance = 1.) {
    const textRef = useRef()
    const firstTickRef = useRef()
    const secondTickRef = useRef()
    const { camera } = useThree();

    useFrame(() => {
        let axText;
        if (textRef.current) {
            axText = textRef.current;
            axText.setRotationFromQuaternion(camera.quaternion);
            axText.updateMatrix();
        }
        if (firstTickRef.current) {
            axText = firstTickRef.current;
            axText.setRotationFromQuaternion(camera.quaternion);
            axText.updateMatrix();
        }
        if (secondTickRef.current) {
            axText = secondTickRef.current;
            axText.setRotationFromQuaternion(camera.quaternion);
            axText.updateMatrix();
        }
    });

    const first_tick_center = [
        center[0] - direction[0] * tickLocationHalfLength,
        center[1] - direction[1] * tickLocationHalfLength,
        center[2] - direction[2] * tickLocationHalfLength
    ]

    const second_tick_center = [
        center[0] + direction[0] * tickLocationHalfLength,
        center[1] + direction[1] * tickLocationHalfLength,
        center[2] + direction[2] * tickLocationHalfLength
    ]

    const axAxis = useMemo(() => (
        <>
            {/* X-axis line */}
            <Line
                points={[
                    [center[0] - direction[0] * halfLength, center[1] - direction[1] * halfLength, center[2] - direction[2] * halfLength],
                    [center[0] + direction[0] * halfLength, center[1] + direction[1] * halfLength, center[2] + direction[2] * halfLength],
                ]}
                color={lineColor}
                lineWidth={lineWidth}
            />
            {/* Small ticks at the extremities of the X-axis */}
            <Line
                points={[
                    [first_tick_center[0] - tickDirection[0] * halfTickLength, first_tick_center[1] - tickDirection[1] * halfTickLength, first_tick_center[2] - tickDirection[2] * halfTickLength],
                    [first_tick_center[0] + tickDirection[0] * halfTickLength, first_tick_center[1] + tickDirection[1] * halfTickLength, first_tick_center[2] + tickDirection[2] * halfTickLength],
                ]}
                color={lineColor}
                lineWidth={lineWidth}
            />
            <Line
                points={[
                    [second_tick_center[0] - tickDirection[0] * halfTickLength, second_tick_center[1] - tickDirection[1] * halfTickLength, second_tick_center[2] - tickDirection[2] * halfTickLength],
                    [second_tick_center[0] + tickDirection[0] * halfTickLength, second_tick_center[1] + tickDirection[1] * halfTickLength, second_tick_center[2] + tickDirection[2] * halfTickLength],
                ]}
                color={lineColor}
                lineWidth={lineWidth}
            />
            <Text
                ref={textRef}
                position={[center[0] - tickDirection[0] * axesNameSize * 1.2 * axesLabelDistance, center[1] - tickDirection[1] * axesNameSize * 1.2 * axesLabelDistance, center[2] - tickDirection[2] * axesNameSize * 1.2 * axesLabelDistance]}
                color={labelColor}
                fontSize={axesNameSize*0.8}
                lookAt={camera.position}
            >
                {label}
            </Text>
            <Text
                ref={firstTickRef}
                position={[first_tick_center[0] - tickDirection[0] * axesNameSize * 1.2 * axesLabelDistance, first_tick_center[1] - tickDirection[1] * axesNameSize * 1.2 * axesLabelDistance, first_tick_center[2] - tickDirection[2] * axesNameSize * 1.2 * axesLabelDistance]}
                color={labelColor}
                fontSize={axesNameSize*0.8}
                lookAt={camera.position}
            >
                {first_tick_center[direction.indexOf(1)].toFixed(2)}
            </Text>
            <Text
                ref={secondTickRef}
                position={[second_tick_center[0] - tickDirection[0] * axesNameSize * 1.2 * axesLabelDistance, second_tick_center[1] - tickDirection[1] * axesNameSize * 1.2 * axesLabelDistance, second_tick_center[2] - tickDirection[2] * axesNameSize * 1.2 * axesLabelDistance]}
                color={labelColor}
                fontSize={axesNameSize*0.8}
                lookAt={camera.position}
            >
                {second_tick_center[direction.indexOf(1)].toFixed(2)}
            </Text>
        </>
    ), [center, direction, lineWidth, axesNameSize, label, textRef, camera.position, halfTickLength, tickDirection, tickLocationHalfLength, first_tick_center, second_tick_center]);

    return axAxis;
}

const AxesHelper = ({ boundingBox, dataBox, axesLabelDistance, axesFontSize }) => {

    const { min, max } = boundingBox;
    const center = useMemo(() => [(min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2], [min, max]);
    const size = useMemo(() => [max.x - min.x, max.y - min.y, max.z - min.z], [min, max]);

    const { min: dataMin, max: dataMax } = dataBox;

    const dataCenter = useMemo(() => [(dataMin.x + dataMax.x) / 2, (dataMin.y + dataMax.y) / 2, (dataMin.z + dataMax.z) / 2], [dataMin, dataMax]);
    const dataSize = useMemo(() => [dataMax.x - dataMin.x, dataMax.y - dataMin.y, dataMax.z - dataMin.z], [dataMin, dataMax]);

    const lineWidth = 1.5;
    const axesNameSize = 0.5 * axesFontSize;
    const tickSize = 0.1;
    const tickSpacing = 0.2;
    const smallTickLength = 0.1; // Length of the small ticks at each extremity
    const { camera } = useThree();

    const vectorCenter = new THREE.Vector3(center[0], center[1], center[2]);
    
    // const direction_to_camera = new THREE.Vector3(camera.position.x - vectorCenter.x, camera.position.y - vectorCenter.y, camera.position.z - vectorCenter.z).normalize();
    const camera_angle = camera.rotation;
    const direction_to_camera = new THREE.Vector3( 0, 0, 1 );
    direction_to_camera.applyEuler(camera_angle);

    let displayX = Math.abs(direction_to_camera.z) >= 0.02 || Math.abs(direction_to_camera.y) >= 0.02;
    let displayY = Math.abs(direction_to_camera.x) >= 0.02 || Math.abs(direction_to_camera.z) >= 0.02;
    let displayZ = Math.abs(direction_to_camera.y) >= 0.02 || Math.abs(direction_to_camera.x) >= 0.02;
    
    let xAxisCenter, yAxisCenter, zAxisCenter;
    let tickDirectionX, tickDirectionY, tickDirectionZ;
    
    if (!displayX){
        tickDirectionX = [0, 0, 1];
        tickDirectionY = [0, 0, 1];
        tickDirectionZ = [0, 1, 0];

        let x_val = direction_to_camera.x > 0 ? max.x : min.x;
        let y_val = direction_to_camera.y > 0 ? max.y : min.y;
        let z_val = direction_to_camera.z > 0 ? max.z : min.z;

        xAxisCenter = [center[0], y_val, z_val];
        yAxisCenter = [x_val, center[1], z_val];
        zAxisCenter = [x_val, y_val, center[2]];
    }
    else if (!displayY){
        tickDirectionX = [0, 0, 1];
        tickDirectionY = [0, 0, 1];
        tickDirectionZ = [1, 0, 0];

        let x_val = direction_to_camera.x > 0 ? max.x : min.x;
        let y_val = direction_to_camera.y > 0 ? max.y : min.y;
        let z_val = direction_to_camera.z > 0 ? max.z : min.z;

        xAxisCenter = [center[0], y_val, z_val];
        yAxisCenter = [x_val, center[1], z_val];
        zAxisCenter = [x_val, y_val, center[2]];
    }
    else if (!displayZ){
        tickDirectionX = [0, 1, 0];
        tickDirectionY = [1, 0, 0];
        tickDirectionZ = [0, 1, 0];

        let x_val = direction_to_camera.x > 0 ? max.x : min.x;
        let y_val = direction_to_camera.y > 0 ? max.y : min.y;
        let z_val = direction_to_camera.z > 0 ? max.z : min.z;

        xAxisCenter = [center[0], y_val, z_val];
        yAxisCenter = [x_val, center[1], z_val];
        zAxisCenter = [x_val, y_val, center[2]];
        
    }
    else{
        let isMinX = direction_to_camera.x < 0;
        let isMinY = direction_to_camera.y < 0;

        let zFactorX = direction_to_camera.y * direction_to_camera.x < 0 ? isMinX : !isMinX;
        let zFactorY = direction_to_camera.x * direction_to_camera.y < 0 ? isMinY : !isMinY;

        isMinX = direction_to_camera.z < 0 ? !isMinX : isMinX;
        isMinY = direction_to_camera.z < 0 ? !isMinY : isMinY;

        xAxisCenter = [center[0], (isMinY ? min.y : max.y), min.z];
        yAxisCenter = [(isMinX ? min.x : max.x), center[1], min.z];
        zAxisCenter = [(!zFactorX ? min.x : max.x), (zFactorY ? min.y : max.y), center[2]];

        tickDirectionX = Math.abs(direction_to_camera.y) > Math.abs(direction_to_camera.z) ? [0, 0, 1] : [0, 1, 0];
        tickDirectionY = Math.abs(direction_to_camera.x) > Math.abs(direction_to_camera.z) ? [0, 0, 1] : [1, 0, 0];
        tickDirectionZ = Math.abs(direction_to_camera.x) > Math.abs(direction_to_camera.y) ? [0, 1, 0] : [1, 0, 0];

    }
    
    // Memoize the X-axis lines, ticks, and small ticks
    const xAxis = drawLine([1, 0, 0], xAxisCenter, size[0] / 2, dataSize[0] / 2, smallTickLength, tickDirectionX, 'X', "lightgray", "gray", lineWidth, axesNameSize, axesLabelDistance);

    // Memoize the Y-axis lines, ticks, and small ticks
    const yAxis = drawLine([0, 1, 0], yAxisCenter, size[1] / 2, dataSize[1] / 2, smallTickLength, tickDirectionY, 'Y', "lightgray", "gray", lineWidth, axesNameSize, axesLabelDistance);

    // Memoize the Z-axis lines, ticks, and small ticks
    const zAxis = drawLine([0, 0, 1], zAxisCenter, size[2] / 2, dataSize[2] / 2, smallTickLength, tickDirectionZ, 'Z', "lightgray", "gray", lineWidth, axesNameSize, axesLabelDistance);

    return (
        <>
            {displayX && xAxis}
            {displayY && yAxis}
            {displayZ && zAxis}
        </>
    );
};

export { AxesHelper };