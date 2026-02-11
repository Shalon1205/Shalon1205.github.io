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

// 1. Volume Donut Chart（空数据时显示完全空白的环形，取消50/50占位）
export const VolumeDonutChart: React.FC<{ data: TotalVolumeData }> = ({ data }) => {
  const isPlaceholder = typeof data.new === 'string' || typeof data.history === 'string';

  // 🌟 修改：空数据时value设为0，显示完全空白的环形框架
  const chartData = isPlaceholder
    ? [
        { name: '新增数据', value: 0, color: '#e2e8f0' }, // slate-200（空白）
        { name: '历史数据', value: 0, color: '#cbd5e1' }, // slate-300（空白）
      ]
    : [
        { name: '新增数据', value: data.new as number, color: THEME.charts.cyan },
        { name: '历史数据', value: data.history as number, color: THEME.charts.blue },
      ];

  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, value, name, fill } = props;
    if (isPlaceholder || value === 0) return null; // 空数据/占位时不显示标签

    const RADIAN = Math.PI / 180;
    const radius = outerRadius;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const isLeft = midAngle > 90 && midAngle < 270;
    const offset = 10; 
    const targetX = isLeft ? cx - radius - offset : cx + radius + offset;
    const targetY = cy; 
    const textAnchor = isLeft ? 'end' : 'start';

    return (
      <g>
        <path 
          d={`M${x},${y} L${targetX},${targetY}`} 
          stroke={fill} 
          strokeWidth={1.5} 
          fill="none" 
        />
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

// 2. Six Nodes Widget（🌟 核心修改：移除空数据提示，始终渲染空白框架）
export const SixNodesWidget: React.FC<{ data: NodeProgressItem[] }> = ({ data }) => {
  // 🌟 修改：空数据时limit默认设为0，取消50的硬限制
  const [limit, setLimit] = useState<string>("0");

  const stats = useMemo(() => {
    const inProgress = data.reduce((sum, item) => sum + item.inProgress, 0);
    const completed = data.reduce((sum, item) => sum + item.completed, 0);
    return { inProgress, completed };
  }, [data]);

  const maxNodeTotal = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map(item => item.inProgress + item.completed));
  }, [data]);

  useEffect(() => {
    const current = parseInt(limit) || 0;
    // 🌟 修改：仅当有数据时自动调整上限，空数据保持0
    if (maxNodeTotal > current && data.length > 0) {
      setLimit(Math.ceil(maxNodeTotal).toString());
    }
  }, [maxNodeTotal, data.length]);

  // 🌟 删除：移除空数据时的提示返回，始终渲染图表框架
  // if (!data || data.length === 0) { ... }

  const numericLimit = Math.max(parseInt(limit) || 0, maxNodeTotal);

  const handleLimitBlur = () => {
    let val = parseInt(limit);
    if (isNaN(val) || (val < maxNodeTotal && data.length > 0)) {
      setLimit(Math.ceil(maxNodeTotal).toString());
    } else if (data.length === 0) {
      setLimit("0"); // 空数据重置为0
    }
  };

  return (
    <div className="w-full h-full flex flex-row">
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
            <Bar dataKey="inProgress" name="进行中数量" stackId="a" fill={THEME.charts.blue}>
                <LabelList dataKey="inProgress" position="center" fontSize={9} fill="#fff" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
            <Bar dataKey="completed" name="已完成数量" stackId="a" fill="#cbd5e1">
                <LabelList dataKey="completed" position="center" fontSize={9} fill="#475569" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

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
             min={0} // 🌟 修改：空数据允许0，取消maxNodeTotal限制
             className="w-full h-5 border border-slate-300 rounded px-0 text-center text-xs text-slate-700 focus:outline-none focus:border-blue-500"
           />
        </div>
      </div>
    </div>
  );
};

// 3. Feedback Pie Chart（🌟 修改：空数据时显示空白饼图框架）
export const FeedbackPieChart: React.FC<{ data: FeedbackData[] }> = ({ data }) => {
  const isPlaceholder = data.some(d => d.isPlaceholder);
  // 🌟 新增：空数据时生成空白饼图数据
  const chartData = useMemo(() => {
    if (!data.length || isPlaceholder) {
      return [{ name: '', value: 0, color: '#e2e8f0', isPlaceholder: true }];
    }
    return data;
  }, [data, isPlaceholder]);

  return (
    <div className="h-full w-full relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            outerRadius={60}
            dataKey="value"
            stroke="white"
            strokeWidth={2}
            labelLine={!isPlaceholder}
            label={isPlaceholder ? false : ({name, value, payload}) => {
              return payload.displayValue || value;
            }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {!isPlaceholder && <Tooltip content={<CustomTooltip />} />}
          {!isPlaceholder && (
            <Legend 
              verticalAlign="bottom" 
              iconType="square"
              iconSize={8}
              wrapperStyle={{ fontSize: '10px', bottom: 0 }} 
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 4. Quality Report Combo Chart（🌟 核心修改：移除3个月默认空数据，取消数据限制）
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

  // 🌟 删除：移除自定义的3个月默认空数据，直接使用传入的data
  const chartData = useMemo(() => data || [], [data]);

  const minDataValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    
    let minVal = 100;
    chartData.forEach(item => {
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
  }, [chartData]);

  useEffect(() => {
    if (chartData.length > 0) {
      const defaultVal = minDataValue < 97 ? minDataValue : 97;
      setYMin(defaultVal.toString());
    } else {
      setYMin("0"); // 空数据时Y轴下限设为0
    }
  }, [minDataValue, chartData]);

  const barSize = useMemo(() => {
    if (chartData.length === 0) return 6;
    if (chartData.length <= 3) return 20;
    if (chartData.length <= 6) return 12;
    return 6;
  }, [chartData]);

  const handleYMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYMin(e.target.value);
  };

  const numericYMin = parseFloat(yMin) || 0;

  const renderCustomLabel = (props: any) => {
    const { x, value } = props;
    if (hiddenSeries.includes('averageScore') || value === 0) return null;
    return (
      <text 
        x={x} 
        y={15} 
        fill="#10b981" 
        textAnchor="middle" 
        fontSize={9}
        fontWeight="bold"
      >
        {value}
      </text>
    );
  };

  const toggleVisibility = (key: string) => {
    setHiddenSeries(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

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

  const renderCustomLegend = (props: any) => {
    const avgScoreEntry = { name: '总平均分', color: '#10b981', key: 'averageScore' };
    const isAvgHidden = hiddenSeries.includes(avgScoreEntry.key);

    return (
      <div className="flex items-center justify-center w-full pt-1 gap-4">
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
          data={chartData}
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
            wrapperStyle={{ 
              position: 'absolute',
              bottom: 0,
              left: 85,
              right: 0,
              width: 'auto'
            }} 
          />
          
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

// 5. User Gauge Chart（🌟 修改：空数据时显示空白框架，不返回null）
export const UserGaugeChart: React.FC<{ data: UserMetric }> = ({ data }) => {
  // 🌟 修改：空数据时生成空白轨道数据，显示框架
  const trackData = Array(30).fill({ value: 1 });
  const isEmpty = !data || data.isEmpty || data.total === 0;

  const renderNeedle = (props: any) => {
    if (isEmpty) return null; // 空数据时不显示指针

    const { cx, cy } = props; 
    const { active: value, total, percentage: pct } = data;
    const iR = 65; 
    const oR = 85; 
    const startAngle = 210;
    const endAngle = -30;
    const totalAngle = startAngle - endAngle;
    const ratio = total > 0 ? Math.min(value / total, 1) : 0;
    const currentAngle = startAngle - (ratio * totalAngle);
    const RADIAN = Math.PI / 180;
    const needleLen = oR - 5;
    const tipX = cx + needleLen * Math.cos(-currentAngle * RADIAN);
    const tipY = cy + needleLen * Math.sin(-currentAngle * RADIAN);
    const baseW = 5;
    const baseX1 = cx + baseW * Math.cos(-(currentAngle - 90) * RADIAN);
    const baseY1 = cy + baseW * Math.sin(-(currentAngle - 90) * RADIAN);
    const baseX2 = cx + baseW * Math.cos(-(currentAngle + 90) * RADIAN);
    const baseY2 = cy + baseW * Math.sin(-(currentAngle + 90) * RADIAN);
    const labelDist = oR + 25;
    const labelX = cx + labelDist * Math.cos(-currentAngle * RADIAN);
    const labelY = cy + labelDist * Math.sin(-currentAngle * RADIAN);
    let anchor: 'middle' | 'end' | 'start' = 'middle';
    if (currentAngle > 100) anchor = 'end';
    else if (currentAngle < 80) anchor = 'start';

    return (
      <g pointerEvents="none">
        <path 
          d={`M${baseX1},${baseY1} L${tipX},${tipY} L${baseX2},${baseY2} Z`} 
          fill="#dc2626" 
          stroke="#991b1b" 
          strokeWidth={1}
        />
        <circle cx={cx} cy={cy} r={5} fill="#1e293b" />
        <circle cx={cx} cy={cy} r={2} fill="#dc2626" />
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
        <text x={cx} y={cy + 30} textAnchor="middle" fill="#64748b" fontSize={12}>
          用户总数
        </text>
        <text x={cx} y={cy + 48} textAnchor="middle" fill="#0f172a" fontSize={16} fontWeight="bold">
          {total}
        </text>
        <text 
          x={cx + (oR + 15) * Math.cos(-startAngle * RADIAN)} 
          y={cy + (oR + 15) * Math.sin(-startAngle * RADIAN)} 
          textAnchor="end" 
          fill="#94a3b8" 
          fontSize={10}
        >
          0
        </text>
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
          {/* 空白轨道：空数据时显示浅灰色轨道 */}
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
              <Cell key={`cell-${i}`} fill={isEmpty ? '#e2e8f0' : "#3b82f6"} />
            ))}
          </Pie>

          {/* 空数据时仍渲染占位Pie，保证框架存在 */}
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

// 7. Scenario Bar Chart（🌟 修改：移除空数据提示，始终渲染空白框架）
export const ScenarioBarChart: React.FC<{ data: ScenarioItem[] }> = ({ data }) => {
  // 🌟 修改：空数据时limit默认设为0
  const [limit, setLimit] = useState<string>("0");

  const stats = useMemo(() => {
    const unfinished = data.reduce((sum, item) => sum + item.unfinished, 0);
    const finished = data.reduce((sum, item) => sum + item.finished, 0);
    return { unfinished, finished };
  }, [data]);

  const maxScenarioTotal = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map(item => item.unfinished + item.finished));
  }, [data]);

  useEffect(() => {
    if (maxScenarioTotal > 0 && data.length > 0) {
      setLimit(maxScenarioTotal.toString());
    }
  }, [maxScenarioTotal, data.length]);

  // 🌟 删除：移除空数据时的提示返回
  // if (!data || data.length === 0) { ... }

  const numericLimit = Math.max(parseFloat(limit) || 0, maxScenarioTotal);

  const handleLimitBlur = () => {
    let val = parseFloat(limit);
    if (isNaN(val) || (val < maxScenarioTotal && data.length > 0)) {
      setLimit(maxScenarioTotal.toString());
    } else if (data.length === 0) {
      setLimit("0"); // 空数据重置为0
    }
  };

  return (
    <div className="w-full h-full flex flex-row">
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
            <Bar dataKey="unfinished" name="未完成" stackId="a" fill={THEME.charts.blue} radius={[0, 2, 2, 0]}>
                <LabelList dataKey="unfinished" position="center" fontSize={9} fill="#fff" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
            <Bar dataKey="finished" name="已完成" stackId="a" fill="#cbd5e1" radius={[0, 2, 2, 0]}>
                <LabelList dataKey="finished" position="center" fontSize={9} fill="#475569" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

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
             min={0} // 🌟 修改：空数据允许0
             className="w-full h-5 border border-slate-300 rounded px-0 text-center text-xs text-slate-700 focus:outline-none focus:border-blue-500"
           />
        </div>
      </div>
    </div>
  );
};
