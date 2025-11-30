import React from 'react';

/**
 * Matplotlib-style Colorbar React component
 * ----------------------------------------
 * - Single-file, production-ready React component.
 * - Tailwind-friendly (no external CSS required).
 * - Supports common Matplotlib colormaps (viridis, plasma, inferno, magma, gray) with smooth gradients.
 * - Orientation: vertical or horizontal.
 * - Custom ticks, tick formatter, min/max values, label, and reversal.
 *
 * NOTE: Fixed SVG overlay sizing/positioning so tick marks align with the color bar.
 */

const COLORMAPS = {
  viridis: [
    '#440154', '#482878', '#3E4989', '#31688E', '#26828E', '#1F9E89', '#35B779', '#6DCD59', '#B4DE2C', '#FDE725', '#FFFFE0'
  ],
  plasma: [
    '#0d0887', '#41049d', '#6a00a8', '#8f0da4', '#b12a90', '#cc4778', '#e1645c', '#f2843b', '#fca636', '#f6c445', '#fde725'
  ],
  inferno: [
    '#000004', '#1b0c41', '#4f0a6d', '#81137a', '#b5367a', '#e8596a', '#fb9a6a', '#fecf6c', '#fefec4', '#ffffff', '#ffffff'
  ],
  magma: [
    '#000004', '#140b3a', '#3b0f6f', '#6a1f72', '#9a3a67', '#c75b6c', '#f07149', '#fb9a6a', '#f7c77e', '#fdf1c2', '#ffffff'
  ],
  gray: [
    '#000000', '#1c1c1c', '#383838', '#545454', '#707070', '#8c8c8c', '#a8a8a8', '#c4c4c4', '#e0e0e0', '#f8f8f8', '#ffffff'
  ]
};

function makeGradientCSS(colormap = 'viridis', color_list = null, reversed = false) {
  let stops = [];
  if (color_list) {
    stops = color_list;
  }
  else {
    stops = COLORMAPS[colormap] || COLORMAPS.viridis;
  }
  const arr = reversed ? [...stops].reverse() : stops;
  const step = 100 / (arr.length - 1);
  return arr.map((c, i) => `${c} ${Math.round(i * step)}%`).join(', ');
}

function formatTick(value, formatter) {
  if (!formatter) {
    return Number.isInteger(value) ? String(value) : String(parseFloat(value.toPrecision(4))).replace(/\.0+$|(?<=\.[0-9]*)0+$/, '');
  }
  return formatter(value);
}

function MatplotlibColorbar({
  colormap = 'viridis',
  color_list = null, // array of color strings to override colormap
  min = 0,
  max = 1,
  orientation = 'vertical', // 'vertical' | 'horizontal'
  height = typeof window !== 'undefined' ? window.innerHeight * 0.7 : 300,
  width = 24,
  ticks = null, // array of numbers in [min,max], or null to auto-generate
  tickCount = 5,
  tickFormatter = null, // function
  label = '',
  reversed = false,
  showTicks = true,
  className = '',
  style = {},
  tickOffset = 8
}) {
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  let generatedTicks = ticks;
  if (!generatedTicks) {
    generatedTicks = Array.from({ length: tickCount }, (_, i) => min + (i / (tickCount - 1)) * (max - min));
  }

  const valueToPct = v => {
    const t = (clamp(v, min, max) - min) / (max - min || 1);
    return reversed ? (1 - t) * 100 : t * 100;
  };

  const gradientStops = makeGradientCSS(colormap, color_list, reversed);

  // Create explicit pixel sizes for the SVG so coordinates line up exactly with the bar.
  // For vertical orientation, reserve extra width to the right for ticks and labels.
  const padding = 20;

  // compute bar dimensions first
  const barH = orientation === 'vertical' ? height : width;
  const barW = orientation === 'vertical' ? width : height;

  // create explicit pixel sizes for the SVG
  const svgWidth = orientation === 'vertical' ? width + 80 : height;
  const svgHeight = orientation === 'vertical' ? barH + padding * 2 : width + 60;

  // barRect: where the gradient bar is drawn
  const barX = 0;
  const barY = orientation === 'vertical' ? padding : 0;

  const colorbarStyle = {
    position: 'absolute',
    left: barX,
    top: barY,
    width: barW,
    height: barH,
    borderRadius: barW / 2,
    background: orientation === 'vertical' ? `linear-gradient(to top, ${gradientStops})` : `linear-gradient(to right, ${gradientStops})`
  };

  return (
    <div className={`flex items-center gap-3 ${orientation === 'vertical' ? 'flex-row' : 'flex-col'} ${className}`} style={style}>

      {/* {label && orientation === 'vertical' && (
        <div className="text-sm text-gray-700 pr-2 select-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{label}</div>
      )} */}

      {/* Use an SVG overlay with exact pixel dimensions for perfect alignment. */}
      <div style={{ position: 'relative', width: svgWidth, height: svgHeight, pointerEvents: 'none' }}>
        {/* Draw the bar as a div for crisp CSS gradient rendering, positioned to match the SVG coordinates */}
        <div style={colorbarStyle} />

        {/* SVG overlay to draw ticks and text exactly aligned with the bar */}
        {showTicks && (
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="xMinYMin"
            style={{ position: 'absolute', left: 0, top: 0 }}
          >
            <defs>
              <style>{`text { font-family: sans-serif; font-size: 12px; fill: #374151; }`}</style>
            </defs>

            {generatedTicks.map((t, i) => {
              const pct = valueToPct(t);
              if (orientation === 'vertical') {
                // SVG coordinates: y=0 at top, so convert pct to y
                const y = (100 - pct) / 100 * barH + barY;
                const xLine1 = barX + barW + 6; // small tick start
                const xLine2 = barX + barW + 14; // small tick end
                const textX = xLine2 + tickOffset;
                const textY = y + 4; // approx baseline
                return (
                  <g key={i}>
                    <line x1={xLine1} x2={xLine2} y1={y} y2={y} stroke="#4b5563" strokeWidth={1} />
                    <text x={textX} y={textY}>{formatTick(t, tickFormatter)}</text>
                  </g>
                );
              } else {
                // horizontal: x grows left->right
                const x = pct / 100 * barW + barX;
                const yLine1 = barY + barH + 6;
                const yLine2 = barY + barH + 14;
                const textY = yLine2 + 16;
                return (
                  <g key={i}>
                    <line x1={x} x2={x} y1={yLine1} y2={yLine2} stroke="#4b5563" strokeWidth={1} />
                    <text x={x} y={textY} textAnchor="middle">{formatTick(t, tickFormatter)}</text>
                  </g>
                );
              }
            })}

            {/* Optional label for horizontal orientation, centered */}
            {label && orientation === 'horizontal' && (
              <text x={barW / 2} y={barY + barH + 44} textAnchor="middle">{label}</text>
            )}
          </svg>
        )}
      </div>

      {/* {label && orientation === 'horizontal' && (
        <div className="text-sm text-gray-700 select-none">{label}</div>
      )} */}

    </div>
  );
}

export { MatplotlibColorbar };