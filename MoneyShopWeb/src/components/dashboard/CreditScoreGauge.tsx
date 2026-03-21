interface CreditScoreGaugeProps {
  score: number | null;
  size?: number;
}

export function CreditScoreGauge({ score, size = 180 }: CreditScoreGaugeProps) {
  const MIN = 300;
  const MAX = 850;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = size / 2 - 16;
  const strokeWidth = 14;

  // Semicircle from 180° to 0° (left to right, top half)
  const startAngle = Math.PI;
  const endAngle = 0;

  const arcPath = (startA: number, endA: number, r: number) => {
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy - r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy - r * Math.sin(endA);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  // Color segments (angles in terms of fraction of semicircle)
  const segments = [
    { from: 0, to: 0.33, color: '#ef4444' },   // Red: 300-480
    { from: 0.33, to: 0.50, color: '#f97316' }, // Orange: 480-575
    { from: 0.50, to: 0.67, color: '#eab308' }, // Yellow: 575-670
    { from: 0.67, to: 0.82, color: '#84cc16' }, // Light green: 670-753
    { from: 0.82, to: 1.0, color: '#22c55e' },  // Green: 753-850
  ];

  // Score to angle
  const scoreToAngle = (s: number) => {
    const fraction = Math.max(0, Math.min(1, (s - MIN) / (MAX - MIN)));
    return startAngle - fraction * (startAngle - endAngle);
  };

  // Needle position
  const needleAngle = score !== null ? scoreToAngle(score) : startAngle - Math.PI / 2; // center if null
  const needleLength = radius - 20;
  const needleX = cx + needleLength * Math.cos(needleAngle);
  const needleY = cy - needleLength * Math.sin(needleAngle);

  // Score label
  const getScoreLabel = (s: number | null) => {
    if (s === null) return 'Indisponibil';
    if (s < 580) return 'Slab';
    if (s < 670) return 'Mediu';
    if (s < 740) return 'Bun';
    return 'Excelent';
  };

  const getScoreColor = (s: number | null) => {
    if (s === null) return '#9ca3af';
    if (s < 580) return '#ef4444';
    if (s < 670) return '#f97316';
    if (s < 740) return '#eab308';
    return '#22c55e';
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* Background arc segments */}
        {score !== null ? (
          segments.map((seg, i) => {
            const sa = startAngle - seg.from * Math.PI;
            const ea = startAngle - seg.to * Math.PI;
            return (
              <path
                key={i}
                d={arcPath(sa, ea, radius)}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={0.25}
              />
            );
          })
        ) : (
          <path
            d={arcPath(startAngle, endAngle, radius)}
            fill="none"
            stroke="#d1d5db"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Active arc up to score */}
        {score !== null && (
          <path
            d={arcPath(startAngle, scoreToAngle(score), radius)}
            fill="none"
            stroke={getScoreColor(score)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Needle */}
        {score !== null && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={needleX}
              y2={needleY}
              stroke="#1f2937"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r={5} fill="#1f2937" />
          </>
        )}

        {/* Score text */}
        <text
          x={cx}
          y={cy - 15}
          textAnchor="middle"
          className="font-bold"
          fontSize={score !== null ? 28 : 22}
          fill={getScoreColor(score)}
        >
          {score !== null ? score : '?'}
        </text>

        {/* Label */}
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fontSize={11}
          fill="#9ca3af"
        >
          {getScoreLabel(score)}
        </text>

        {/* Min/Max labels */}
        <text x={16} y={cy + 18} textAnchor="start" fontSize={10} fill="#9ca3af">
          {MIN}
        </text>
        <text x={size - 16} y={cy + 18} textAnchor="end" fontSize={10} fill="#9ca3af">
          {MAX}
        </text>
      </svg>
    </div>
  );
}
