import * as React from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from '@react-three/fiber';
import { Grid, Stats } from '@react-three/drei';
import { useState, useMemo, useRef } from 'react';

import * as THREE from 'three';

import { Scene } from './scene.js';
import { MatplotlibColorbar } from "./colorbar.js";
import { HoverTool } from "./hoverTool.js";
import { MultiBlockData } from "./data_block.js";
import { UnstructuredGridData } from "./unstructured_grid.js";


function render({ model }) {
    let [intensity, pyIntensity] = model.useState("intensity");

    let [data_dict, pySetDataDict] = model.useState("data_dict");
    let [matrix, pySetMatrix] = model.useState("matrix");

    let [displayAxesGizmo, pySetDisplayAxesGizmo] = model.useState("display_axes_gizmo");
    let [displaySliceTool, pySetDisplaySliceTool] = model.useState("slice_tool_visible");
    let [sliceToolScale, pySetSliceToolScale] = model.useState("slice_tool_scale");

    let [box, setBox] = model.useState("axes_range");
    let [dataBox, setDataBox] = model.useState("axes_data_box");
    let [axesVisible, pySetAxesVisible] = model.useState("axes_visible");

    const [hoveredCell, setHoveredCell] = useState(null);
    const [hoveredCellType, setHoveredCellType] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, z: 0 });
    const [targetPosition, setTargetPosition] = useState(null);

    const [regionMap, setRegionMap] = useState([]);

    const axesBoundingBox = useMemo(() => {
        return {
            min: new THREE.Vector3(box[0], box[2], box[4]),
            max: new THREE.Vector3(box[1], box[3], box[5]),
        };
    }, [box]);

    const dataBoundingBox = useMemo(() => {
        return {
            min: new THREE.Vector3(dataBox[0], dataBox[2], dataBox[4]),
            max: new THREE.Vector3(dataBox[1], dataBox[3], dataBox[5]),
        };
    }, [dataBox]);

    const [displayColorBar, pySetdisplayColorBar] = model.useState("display_color_map");
    const [colorMapColors, pySetcolorMapColors] = model.useState("color_map_colors");
    const [colorBarBounds, pySetColorBarBounds] = model.useState("color_bar_bounds");

    const colorBar = useMemo(() => (
        <div
            style={{
                position: "absolute",
                right: 20,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none"
            }}
        >
            <MatplotlibColorbar
                color_list={colorMapColors}
                min={colorBarBounds[0]}
                max={colorBarBounds[1]}
                orientation="vertical"
                width={24}
            // ticks={[0, 0.25, 0.5, 0.75, 1]}
            // label="Field name"
            />
        </div>
    ), [colorMapColors, colorBarBounds]);

    const boolTargetRef = useRef(null);

    const renderedObjects = useMemo(() => {
        return data_dict.map((objectDict, i) => {
            const {
                type,
                vertices,
                indices,
                colors,
                edge_colors,
                values,
                names,
            } = objectDict;

            if (type === "MultiBlock") {
                return (
                    <MultiBlockData
                        key={`multiblock-${i}`}
                        vertices={vertices}
                        indices={indices}
                        colors={colors}
                        edge_colors={edge_colors}
                        values={values}
                        names={names}
                        hoveredName={hoveredCell && hoveredCell.name}
                        setRegionInfo={setRegionMap}
                        boolTargetRef={boolTargetRef}
                    />
                );
            }
            else if (type === "UnstructuredGrid") {
                return (
                    <UnstructuredGridData
                        key={`unstructured_grid-${i}`}
                        vertices={vertices}
                        indices={indices}
                        colors={colors}
                        edge_colors={edge_colors}
                        values={values}
                        names={names}
                        hoveredName={hoveredCell && hoveredCell.name}
                        setRegionInfo={setRegionMap}
                        boolTargetRef={boolTargetRef}
                    />
                );
            }
            else{
                console.error("Given type not implemented :", type);
                
            }

            return null;
        });
    }, [data_dict, hoveredCell, setRegionMap]);


    return (
        <div
            id="canvas-container"
            style={{ position: "relative", width: "100%", height: "100%" }}
        >
            <Canvas camera={{ position: [0, 5, 10], up: [0, 0, 1] }} linear flat>
                <ambientLight intensity={intensity} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <Grid infinite={true} cellSize={1} sectionSize={2} />
                <Scene
                    setHoveredCell={setHoveredCell}
                    setHoveredCellType={setHoveredCellType}
                    setTargetPosition={setTargetPosition}
                    setTooltipPos={setTooltipPos}
                    regionMap={regionMap} // <-- Pass regionMap
                    pySetMatrix={pySetMatrix}
                    displayAxesGizmo={displayAxesGizmo}
                    displaySliceTool={displaySliceTool}
                    squareScale={sliceToolScale}
                    displayAxes={axesVisible}
                    axesBoundingBox={axesBoundingBox}
                    dataBoundingBox={dataBoundingBox}
                    boolTargetRef={boolTargetRef}
                />
                {renderedObjects}
                {/* <Stats /> */}
            </Canvas>
            <HoverTool
                hoveredCell={hoveredCell}
                tooltipPos={tooltipPos}
                targetPosition={targetPosition}
            />
            {displayColorBar && colorBar}
        </div>
    );
}

export default { render, React, createRoot };
