import * as React from "react";

function HoverTool({ hoveredCell, tooltipPos, targetPosition }) {
    if (!hoveredCell)
         return null;

    const hoveredCellType = hoveredCell.cellType;
    const hoveredLabelStyle = {position: "absolute",
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
            }

    let displayedCell;
    let displayedLocation;
    let displayedValue;

    switch (hoveredCellType) {
        case 'MultiBlock':
            displayedCell = hoveredCell.name;
            break;
        // Add more cases as needed
        default:
            displayedCell = undefined;
    }

    switch (hoveredCellType) {
        case 'MultiBlock':
            displayedLocation = targetPosition.x.toFixed(2)+", "+targetPosition.y.toFixed(2)+", "+targetPosition.z.toFixed(2);
            break;
        // Add more cases as needed
        default:
            displayedLocation = undefined;
    }

    switch (hoveredCellType) {
        case 'MultiBlock':
            displayedValue = hoveredCell.value;
            break;
        // Add more cases as needed
        default:
            displayedValue = undefined;
    }

    return (
        <div style={hoveredLabelStyle}>
            {displayedCell !== undefined && <div>Cell : {displayedCell}</div>}
            {displayedLocation !== undefined && (
                <div>Location : ({displayedLocation})</div>
            )}
            {displayedValue !== undefined && <div>Value : {displayedValue}</div>}
        </div>
    );
}

export { HoverTool };