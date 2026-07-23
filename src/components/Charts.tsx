import { TrendingUp, TrendingDown } from 'lucide-react';

interface ChartDataPoint {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

export function SimpleBarChart({
  data,
  height = 200,
  color = 'bg-blue-500',
  formatValue = (v) => String(v),
}: SimpleBarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end justify-between gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div className="relative w-full flex items-end justify-center" style={{ height: height - 30 }}>
            <div
              className={`w-full max-w-[40px] ${color} rounded-t-md transition-all duration-300 hover:opacity-80 cursor-pointer relative`}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '4px' : '0' }}
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap z-10">
                {formatValue(d.value)}
              </div>
            </div>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

interface LineChartProps {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

export function SimpleLineChart({
  data,
  height = 200,
  color = '#3b82f6',
  formatValue = (v) => String(v),
}: LineChartProps) {
  if (data.length === 0) return <div style={{ height }} className="flex items-center justify-center text-gray-400 text-sm">No data</div>;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const width = 100;
  const step = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = i * step;
    const y = height - 30 - ((d.value - min) / range) * (height - 50);
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1]?.x ?? 0} ${height - 30} L 0 ${height - 30} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#chartGradient)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={color} className="opacity-0 hover:opacity-100" />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-gray-500 dark:text-gray-400">{d.label}</span>
        ))}
      </div>
      <div className="hidden">{formatValue(0)}</div>
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  max: number;
  label: string;
  color?: string;
  size?: number;
}

export function ProgressRing({
  value,
  max,
  label,
  color = '#3b82f6',
  size = 120,
}: ProgressRingProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(percentage)}%</span>
        </div>
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

interface TrendCardProps {
  label: string;
  value: number;
  isPositive: boolean;
}

export function TrendIndicator({ label, value, isPositive }: TrendCardProps) {
  return (
    <div className="flex items-center gap-1 text-xs">
      {isPositive ? (
        <TrendingUp className="w-3 h-3 text-green-500" />
      ) : (
        <TrendingDown className="w-3 h-3 text-red-500" />
      )}
      <span className={isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
        {value}%
      </span>
      <span className="text-gray-400">{label}</span>
    </div>
  );
}
