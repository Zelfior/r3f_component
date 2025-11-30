import * as React from "react";

function HoverTool({ hoveredCell, hoveredCellType, tooltipPos, targetPosition }) {
    if (!hoveredCell)
         return null;

    return (
        <div
            style={{
                position: "absolute",
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
    );
}

export { HoverTool };