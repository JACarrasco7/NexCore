type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
  className?: string;
};

export function Sparkline({
  data,
  width = 120,
  height = 36,
  color = "#e05a2b",
  fill = "rgba(224,90,43,0.12)",
  className = "",
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height} className={className}>
        <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.2)">
          —
        </text>
      </svg>
    );
  }

  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = width - pad * 2;
  const H = height - pad * 2;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * W;
    const y = pad + H - ((v - min) / range) * H;
    return [x, y] as [number, number];
  });

  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fillPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${(pad + H).toFixed(1)} L${pts[0][0].toFixed(1)},${(pad + H).toFixed(1)} Z`;

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <path d={fillPath} fill={fill} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}
