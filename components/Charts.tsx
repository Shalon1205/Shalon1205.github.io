
import React, { useState, useMemo, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line, 
  LabelList
} from 'recharts';
import { THEME } from '../constants';
import { TotalVolumeData, NodeProgressItem, FeedbackData, QualityMetric, UserMetric, ScenarioItem } from '../types';

// --- Helper Components ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-slate-200 shadow-lg rounded text-xs text-slate-600 z-50">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.payload.displayValue || entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// 1. Volume Donut Chart
export const VolumeDonutChart: React.FC<{ data: TotalVolumeData }> = ({ data }) => {
  const isPlaceholder = typeof data.new === 'string' || typeof data.history === 'string';

  // If placeholder, show grey segments (50/50 split). If real data, show real values and colors.
  // Order: New (Cyan) then History (Blue).
  const chartData = isPlaceholder
    ? [
        { name: '新增数据', value: 50, color: '#e2e8f0' }, // slate-200
        { name: '历史数据', value: 50, color: '#cbd5e1' }, // slate-300
      ]
    : [
        { name: '新增数据', value: data.new as number, color: THEME.charts.cyan },
        { name: '历史数据', value: data.history as number, color: THEME.charts.blue },
      ];

  // Custom Label to render text flush with center height on both sides
  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, value, name, fill } = props;
    
    // Do not render labels if placeholder
    if (isPlaceholder) return null;

    const RADIAN = Math.PI / 180;
    const radius = outerRadius;
    
    // Point on the donut edge
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Determine side based on angle (90 to 270 is Left side in Recharts standard if 0 is Right)
    const isLeft = midAngle > 90 && midAngle < 270;
    
    // Reduced offset to ensure it fits in the card width.
    const offset = 10; 
    const targetX = isLeft ? cx - radius - offset : cx + radius + offset;
    const targetY = cy; 

    const textAnchor = isLeft ? 'end' : 'start';

    return (
      <g>
        {/* Guide Line: From slice edge to target text position */}
        <path 
          d={`M${x},${y} L${targetX},${targetY}`} 
          stroke={fill} 
          strokeWidth={1.5} 
          fill="none" 
        />
        
        {/* Label Name */}
        <text 
          x={targetX + (isLeft ? -5 : 5)} 
          y={targetY - 4} 
          textAnchor={textAnchor} 
          fill={fill} 
          fontSize={10} 
          fontWeight="bold"
        >
          {name}
        </text>
        
        {/* Label Value */}
        <text 
          x={targetX + (isLeft ? -5 : 5)} 
          y={targetY + 12} 
          textAnchor={textAnchor} 
          fill={fill} 
          fontSize={12} 
          fontFamily="monospace"
          fontWeight="bold"
        >
          {value}万
        </text>
      </g>
    );
  };

  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            // significantly reduced size to fit in half-height container (approx 100px tall)
            innerRadius={20}
            outerRadius={30}
            paddingAngle={isPlaceholder ? 0 : 2}
            dataKey="value"
            startAngle={90}
            endAngle={450}
            cy="50%"
            stroke="none"
            labelLine={false}
            label={renderCustomLabel} 
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke={isPlaceholder ? 'none' : '#fff'} strokeWidth={2} />
            ))}
          </Pie>
          {!isPlaceholder && <Tooltip content={<CustomTooltip />} />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 2. Six Nodes Widget (Replaces NodeProgressChart)
export const SixNodesWidget: React.FC<{ data: NodeProgressItem[] }> = ({ data }) => {
  const [limit, setLimit] = useState<string>("50");

  // Calculate Totals
  const stats = useMemo(() => {
    const inProgress = data.reduce((sum, item) => sum + item.inProgress, 0);
    const completed = data.reduce((sum, item) => sum + item.completed, 0);
    return { inProgress, completed };
  }, [data]);

  // Calculate Max Node Value (InProgress + Completed) for default limit and min validation
  const maxNodeTotal = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map(item => item.inProgress + item.completed));
  }, [data]);

  // Update limit state if the data's max exceeds current limit (auto-expand)
  useEffect(() => {
    const current = parseInt(limit) || 0;
    if (maxNodeTotal > current) {
      setLimit(Math.ceil(maxNodeTotal).toString());
    }
  }, [maxNodeTotal]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        请上传数据以展示图表
      </div>
    );
  }

  // Ensure chart domain is at least the max value of data
  const numericLimit = Math.max(parseInt(limit) || 0, maxNodeTotal);

  const handleLimitBlur = () => {
    let val = parseInt(limit);
    // If empty or less than max data value, reset to max data value
    if (isNaN(val) || val < maxNodeTotal) {
      setLimit(Math.ceil(maxNodeTotal).toString());
    }
  };

  return (
    <div className="w-full h-full flex flex-row">
      {/* Left Chart Area - Expanded to 85% */}
      <div className="flex-grow h-full" style={{ width: '85%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 25 }}
            barSize={16}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" hide domain={[0, numericLimit]} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={70} 
              tick={{fontSize: 10, fill: '#64748b'}} 
              interval={0}
            />
            <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{
                fontSize: '10px',
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%'
              }} 
              verticalAlign="bottom" 
            />
            {/* Stacked Bars: stackId must be the same */}
            <Bar dataKey="inProgress" name="进行中数量" stackId="a" fill={THEME.charts.blue}>
                <LabelList dataKey="inProgress" position="center" fontSize={9} fill="#fff" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
            <Bar dataKey="completed" name="已完成数量" stackId="a" fill="#cbd5e1">
                <LabelList dataKey="completed" position="center" fontSize={9} fill="#475569" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Right Stats & Control Area - Reduced to 15% and Right Aligned */}
      <div className="flex flex-col justify-center gap-2 pl-1 items-center" style={{ width: '15%', minWidth: '70px' }}>
        <div className="bg-white rounded shadow-sm border border-slate-100 p-1 w-full text-center">
           <div className="text-[10px] text-slate-500 mb-0.5">进行中:</div>
           <div className="text-lg font-bold text-blue-600 leading-none">{stats.inProgress}</div>
        </div>

        <div className="bg-white rounded shadow-sm border border-slate-100 p-1 w-full text-center">
           <div className="text-[10px] text-slate-500 mb-0.5">已完成:</div>
           <div className="text-lg font-bold text-slate-600 leading-none">{stats.completed}</div>
        </div>

        <div className="mt-auto flex flex-col items-center w-full bg-white rounded shadow-sm border border-slate-100 p-0.5">
           <label className="text-[9px] text-slate-400 mb-0.5 text-center w-full">设定X轴上限</label>
           <input 
             type="number" 
             value={limit} 
             onChange={(e) => setLimit(e.target.value)}
             onBlur={handleLimitBlur}
             min={maxNodeTotal}
             className="w-full h-5 border border-slate-300 rounded px-0 text-center text-xs text-slate-700 focus:outline-none focus:border-blue-500"
           />
        </div>
      </div>
    </div>
  );
};

// 3. Feedback Pie Chart
export const FeedbackPieChart: React.FC<{ data: FeedbackData[] }> = ({ data }) => {
  // Check if data contains placeholder flag
  const isPlaceholder = data.some(d => d.isPlaceholder);

  return (
    <div className="h-full w-full relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            // Shift center up slightly (45%) to allow more space for legend at bottom
            cx="50%"
            cy="45%"
            // Reduced size from 84 to 60 to prevent overflow and allow space for labels
            outerRadius={60}
            dataKey="value"
            stroke="white"
            strokeWidth={2}
            // Hide guide lines and labels if placeholder is true
            labelLine={!isPlaceholder}
            label={isPlaceholder ? false : ({name, value, payload}) => {
              return payload.displayValue || value;
            }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {!isPlaceholder && <Tooltip content={<CustomTooltip />} />}
          
          {/* Only show Legend if NOT placeholder */}
          {!isPlaceholder && (
            <Legend 
              verticalAlign="bottom" 
              iconType="square"
              iconSize={8}
              // Ensure legend text matches other widgets and has spacing
              wrapperStyle={{ fontSize: '10px', bottom: 0 }} 
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 4. Quality Report Combo Chart
const QUALITY_BAR_CONFIG: Record<string, { name: string, color: string }> = {
  exploration: { name: '勘探', color: '#3b82f6' },
  reserves: { name: '储量', color: '#67e8f9' },
  development: { name: '开发', color: '#f472b6' },
  production: { name: '生产', color: '#06b6d4' },
  engineering: { name: '工程', color: '#93c5fd' },
  drilling: { name: '钻完井', color: '#fb923c' },
};

export const QualityChart: React.FC<{ data: QualityMetric[] }> = ({ data }) => {
  const [yMin, setYMin] = useState<string>("");
  const [barOrder, setBarOrder] = useState<string[]>([
    'exploration', 'reserves', 'development', 'production', 'engineering', 'drilling'
  ]);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Calculate the absolute minimum value from the dataset to set dynamic defaults
  const minDataValue = useMemo(() => {
    if (!data || data.length === 0) return 0;
    
    let minVal = 100;
    data.forEach(item => {
      const scores = [
        item.exploration, item.reserves, item.development, 
        item.production, item.engineering, item.drilling, item.averageScore
      ];
      const validScores = scores.filter(s => typeof s === 'number');
      if (validScores.length > 0) {
        const localMin = Math.min(...validScores);
        if (localMin < minVal) minVal = localMin;
      }
    });
    return parseFloat(minVal.toFixed(2));
  }, [data]);

  // Dynamically set yMin default when data loads or changes
  useEffect(() => {
    if (data && data.length > 0) {
      // Default to 97, but if data has values < 97, default to that min value
      const defaultVal = minDataValue < 97 ? minDataValue : 97;
      setYMin(defaultVal.toString());
    } else {
      setYMin("0");
    }
  }, [minDataValue, data]);

  // Calculate dynamic bar size based on number of data points (months/quarters)
  const barSize = useMemo(() => {
    if (!data || data.length === 0) return 6;
    if (data.length <= 3) return 20;
    if (data.length <= 6) return 12;
    return 6;
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        请上传数据以展示图表
      </div>
    );
  }

  const handleYMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYMin(e.target.value);
  };

  const numericYMin = parseFloat(yMin) || 0;

  // Custom label renderer to place Average Score at fixed height (top of chart)
  const renderCustomLabel = (props: any) => {
    const { x, value } = props;
    // If hidden, don't render label
    if (hiddenSeries.includes('averageScore')) return null;
    return (
      <text 
        x={x} 
        y={15} // Fixed Y position near top of chart area
        fill="#10b981" 
        textAnchor="middle" 
        fontSize={9}
        fontWeight="bold"
      >
        {value}
      </text>
    );
  };

  // Toggle visibility handler
  const toggleVisibility = (key: string) => {
    setHiddenSeries(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, key: string) => {
    setDraggedItem(key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === key) return;
  };

  const onDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetKey) return;

    const newOrder = [...barOrder];
    const draggedIdx = newOrder.indexOf(draggedItem);
    const targetIdx = newOrder.indexOf(targetKey);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedItem);
      setBarOrder(newOrder);
    }
    setDraggedItem(null);
  };

  // Custom Legend Content with Drag and Drop & Click Toggle
  const renderCustomLegend = (props: any) => {
    const avgScoreEntry = { name: '总平均分', color: '#10b981', key: 'averageScore' };
    const isAvgHidden = hiddenSeries.includes(avgScoreEntry.key);

    return (
      <div className="flex items-center justify-center w-full pt-1 gap-4">
        {/* Left Group: Draggable & Toggleable Bars */}
        <div className="flex items-center gap-2">
          {barOrder.map((key) => {
            const entry = QUALITY_BAR_CONFIG[key];
            const isDragging = draggedItem === key;
            const isHidden = hiddenSeries.includes(key);
            return (
              <div 
                key={key} 
                draggable
                onDragStart={(e) => onDragStart(e, key)}
                onDragOver={(e) => onDragOver(e, key)}
                onDrop={(e) => onDrop(e, key)}
                onClick={() => toggleVisibility(key)}
                className={`flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer select-none transition-all
                  ${isDragging ? 'opacity-50' : 'opacity-100'}
                  ${isHidden ? 'opacity-40 grayscale' : ''}
                `}
                title="拖动调整顺序，点击显示/隐藏"
              >
                <span className="block w-2 h-2" style={{ backgroundColor: entry.color }}></span>
                <span>{entry.name}</span>
              </div>
            );
          })}
        </div>

        {/* Right Group: Average Score (Fixed but Toggleable) */}
        <div 
          onClick={() => toggleVisibility(avgScoreEntry.key)}
          className={`flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer select-none transition-all
            ${isAvgHidden ? 'opacity-40 grayscale' : 'opacity-100'}
          `}
          title="点击显示/隐藏"
        >
           <div className="flex items-center justify-center w-3 relative">
              <div className="w-full h-[2px]" style={{ backgroundColor: avgScoreEntry.color }}></div>
              <div className="w-1 h-1 rounded-full absolute" style={{ backgroundColor: avgScoreEntry.color }}></div>
           </div>
           <span>{avgScoreEntry.name}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          // Reduced margins to maximize visual area while leaving space for custom legend at bottom
          margin={{ top: 25, right: 10, bottom: 25, left: 10 }}
          barGap={0}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
          <YAxis 
            yAxisId="left" 
            domain={[numericYMin, 100]} 
            tick={{fontSize: 10, fill: '#94a3b8'}} 
            axisLine={false} 
            tickLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            content={renderCustomLegend}
            verticalAlign="bottom"
            // Position absolutely to align with other charts' legends and avoid input box overlap
            wrapperStyle={{ 
              position: 'absolute',
              bottom: 0,
              left: 85, // Offset to clear the 'Set Y-Axis' input
              right: 0,
              width: 'auto'
            }} 
          />
          
          {/* Dynamic Bars based on drag order and visibility */}
          {barOrder.map(key => {
            const config = QUALITY_BAR_CONFIG[key];
            return (
              <Bar 
                key={key}
                yAxisId="left" 
                dataKey={key} 
                name={config.name} 
                fill={config.color} 
                barSize={barSize} 
                radius={[2, 2, 0, 0]} 
                hide={hiddenSeries.includes(key)}
              />
            );
          })}
          
          {/* Line comes last: 总平均分 */}
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="averageScore" 
            name="总平均分" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#fff'}} 
            label={renderCustomLabel} 
            hide={hiddenSeries.includes('averageScore')}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Y-Axis Min Control */}
      <div className="absolute bottom-0 left-0 z-10 w-20 bg-white/90 rounded shadow-sm border border-slate-100 p-0.5 flex flex-col items-center backdrop-blur-[2px]">
         <label className="text-[9px] text-slate-400 mb-0.5 text-center w-full">设定Y轴下限</label>
         <input 
            type="number" 
            step="0.05"
            min="0"
            max={minDataValue}
            value={yMin}
            onChange={handleYMinChange}
            className="w-full h-5 border border-slate-300 rounded px-0 text-center text-xs text-slate-700 focus:outline-none focus:border-blue-500"
           />
      </div>
    </div>
  );
};

// 5. User Gauge Chart (Speedometer Style)
export const UserGaugeChart: React.FC<{ data: UserMetric }> = ({ data }) => {
  if (!data || data.isEmpty) return null;

  // Create segmented track
  const trackData = Array(30).fill({ value: 1 });

  // We render the needle via a custom label function on a secondary invisible Pie.
  // This guarantees that 'cx' and 'cy' are passed correctly by Recharts.
  const renderNeedle = (props: any) => {
    const { cx, cy } = props; 
    const { active: value, total, percentage: pct } = data;
    
    // Gauge Geometry Config
    const iR = 65; 
    const oR = 85; 
    const startAngle = 210;
    const endAngle = -30;
    const totalAngle = startAngle - endAngle;

    // Calculate pointer angle
    const ratio = total > 0 ? Math.min(value / total, 1) : 0;
    // Recharts angles: 0 is Right, Positive is Counter-Clockwise.
    // 210 (Bottom-Left) -> -30 (Bottom-Right) clockwise.
    const currentAngle = startAngle - (ratio * totalAngle);
    
    const RADIAN = Math.PI / 180;

    // Needle Tip Position
    const needleLen = oR - 5;
    const tipX = cx + needleLen * Math.cos(-currentAngle * RADIAN);
    const tipY = cy + needleLen * Math.sin(-currentAngle * RADIAN);

    // Needle Base (Triangle width 10px total)
    const baseW = 5;
    const baseX1 = cx + baseW * Math.cos(-(currentAngle - 90) * RADIAN);
    const baseY1 = cy + baseW * Math.sin(-(currentAngle - 90) * RADIAN);
    const baseX2 = cx + baseW * Math.cos(-(currentAngle + 90) * RADIAN);
    const baseY2 = cy + baseW * Math.sin(-(currentAngle + 90) * RADIAN);

    // Active User Label (Outside the tip)
    const labelDist = oR + 25;
    const labelX = cx + labelDist * Math.cos(-currentAngle * RADIAN);
    const labelY = cy + labelDist * Math.sin(-currentAngle * RADIAN);

    // Text Anchor based on side
    let anchor: 'middle' | 'end' | 'start' = 'middle';
    if (currentAngle > 100) anchor = 'end';
    else if (currentAngle < 80) anchor = 'start';

    return (
      <g pointerEvents="none">
        {/* Needle Triangle */}
        <path 
          d={`M${baseX1},${baseY1} L${tipX},${tipY} L${baseX2},${baseY2} Z`} 
          fill="#dc2626" 
          stroke="#991b1b" 
          strokeWidth={1}
        />
        {/* Center Pin */}
        <circle cx={cx} cy={cy} r={5} fill="#1e293b" />
        <circle cx={cx} cy={cy} r={2} fill="#dc2626" />

        {/* Active Users Dynamic Label */}
        <text 
          x={labelX} 
          y={labelY - 5} 
          textAnchor={anchor} 
          fill="#dc2626" 
          fontSize={12} 
          fontWeight="bold"
        >
          {`活跃:${value}`}
        </text>
        <text 
          x={labelX} 
          y={labelY + 8} 
          textAnchor={anchor} 
          fill="#dc2626" 
          fontSize={10}
        >
          ({pct}%)
        </text>

        {/* Total Users Label (Bottom Center) */}
        <text x={cx} y={cy + 30} textAnchor="middle" fill="#64748b" fontSize={12}>
          用户总数
        </text>
        <text x={cx} y={cy + 48} textAnchor="middle" fill="#0f172a" fontSize={16} fontWeight="bold">
          {total}
        </text>

        {/* Scale Limits (0 and Total) */}
        {/* 0 at Start Angle */}
        <text 
          x={cx + (oR + 15) * Math.cos(-startAngle * RADIAN)} 
          y={cy + (oR + 15) * Math.sin(-startAngle * RADIAN)} 
          textAnchor="end" 
          fill="#94a3b8" 
          fontSize={10}
        >
          0
        </text>
        {/* Total at End Angle */}
        <text 
          x={cx + (oR + 15) * Math.cos(-endAngle * RADIAN)} 
          y={cy + (oR + 15) * Math.sin(-endAngle * RADIAN)} 
          textAnchor="start" 
          fill="#94a3b8" 
          fontSize={10}
        >
          {total}
        </text>
      </g>
    );
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Background Track Pie (Segmented Blue Arc) */}
          <Pie
            data={trackData}
            cx="50%"
            cy="60%"
            startAngle={210}
            endAngle={-30}
            innerRadius={65}
            outerRadius={85}
            dataKey="value"
            stroke="#fff"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {trackData.map((_, i) => (
                <Cell key={`cell-${i}`} fill="#3b82f6" />
            ))}
          </Pie>

          {/* 
             Invisible Pie used strictly to position the Needle via 'label' prop.
             This ensures Recharts passes the correct cx/cy coordinates to the renderer.
          */}
          <Pie
            data={[{ value: 1 }]}
            cx="50%"
            cy="60%"
            innerRadius={0}
            outerRadius={0}
            dataKey="value"
            stroke="none"
            fill="none"
            labelLine={false}
            label={renderNeedle}
            isAnimationActive={false}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 7. Scenario Bar Chart
export const ScenarioBarChart: React.FC<{ data: ScenarioItem[] }> = ({ data }) => {
  const [limit, setLimit] = useState<string>("50");

  // Calculate Totals for side stats
  const stats = useMemo(() => {
    const unfinished = data.reduce((sum, item) => sum + item.unfinished, 0);
    const finished = data.reduce((sum, item) => sum + item.finished, 0);
    return { unfinished, finished };
  }, [data]);

  // Calculate Max Total (Unfinished + Finished) for default limit and min validation
  const maxScenarioTotal = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map(item => item.unfinished + item.finished));
  }, [data]);

  // Set limit to the max total whenever data updates to ensure best fit by default
  useEffect(() => {
    if (maxScenarioTotal > 0) {
      setLimit(maxScenarioTotal.toString());
    }
  }, [maxScenarioTotal]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        请上传数据以展示图表
      </div>
    );
  }

  const numericLimit = Math.max(parseFloat(limit) || 0, maxScenarioTotal);

  const handleLimitBlur = () => {
    let val = parseFloat(limit);
    if (isNaN(val) || val < maxScenarioTotal) {
      setLimit(maxScenarioTotal.toString());
    }
  };

  return (
    <div className="w-full h-full flex flex-row">
      {/* Left Chart Area - Expanded to 85% */}
      <div className="flex-grow h-full" style={{ width: '85%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            barSize={12}
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" hide domain={[0, numericLimit]} />
            <YAxis 
              type="category" 
              dataKey="category" 
              width={40} 
              tick={{fontSize: 11, fill: '#64748b'}} 
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '10px' }} verticalAlign="bottom" />
            {/* 
              Colors & Order swapped to match SixNodesWidget logic:
              - Unfinished (Blue) comes first (like In Progress)
              - Finished (Grey) comes second (like Completed)
            */}
            <Bar dataKey="unfinished" name="未完成" stackId="a" fill={THEME.charts.blue} radius={[0, 2, 2, 0]}>
                <LabelList dataKey="unfinished" position="center" fontSize={9} fill="#fff" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
            <Bar dataKey="finished" name="已完成" stackId="a" fill="#cbd5e1" radius={[0, 2, 2, 0]}>
                <LabelList dataKey="finished" position="center" fontSize={9} fill="#475569" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Right Stats & Control Area - 15% */}
      <div className="flex flex-col justify-center gap-2 pl-1 items-center" style={{ width: '15%', minWidth: '70px' }}>
        <div className="bg-white rounded shadow-sm border border-slate-100 p-1 w-full text-center">
           <div className="text-[10px] text-slate-500 mb-0.5">未完成:</div>
           <div className="text-lg font-bold text-blue-600 leading-none">{stats.unfinished}</div>
        </div>

        <div className="bg-white rounded shadow-sm border border-slate-100 p-1 w-full text-center">
           <div className="text-[10px] text-slate-500 mb-0.5">已完成:</div>
           <div className="text-lg font-bold text-slate-600 leading-none">{stats.finished}</div>
        </div>

        <div className="mt-auto flex flex-col items-center w-full bg-white rounded shadow-sm border border-slate-100 p-0.5">
           <label className="text-[9px] text-slate-400 mb-0.5 text-center w-full">设定X轴上限</label>
           <input 
             type="number" 
             value={limit}
             step="1.0"
             onChange={(e) => setLimit(e.target.value)}
             onBlur={handleLimitBlur}
             min={maxScenarioTotal}
             className="w-full h-5 border border-slate-300 rounded px-0 text-center text-xs text-slate-700 focus:outline-none focus:border-blue-500"
           />
        </div>
      </div>
    </div>
  );
};
