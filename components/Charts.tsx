import React, { useState, useMemo, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line, 
  LabelList
} from 'recharts';
import { THEME } from '../constants';
import { TotalVolumeData, NodeProgressItem, FeedbackData, QualityMetric, UserMetric, ScenarioItem } from '../types';

// 自定义Tooltip（与最初设计一致）
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

// 1. 数据量环形图（空数据时显示空白框架）
export const VolumeDonutChart: React.FC<{ data: TotalVolumeData }> = ({ data }) => {
  const chartData = useMemo(() => [
    { name: '新增数据', value: data.new, color: THEME.charts.cyan },
    { name: '历史数据', value: data.history, color: THEME.charts.blue }
  ], [data]);

  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, value, name, fill } = props;
    if (value === 0) return null; // 空数据时不显示标签

    const RADIAN = Math.PI / 180;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const isLeft = midAngle > 90 && midAngle < 270;
    const offset = 10;
    const targetX = isLeft ? cx - radius - offset : cx + radius + offset;
    const targetY = cy;
    const textAnchor = isLeft ? 'end' : 'start';
    const radius = outerRadius;

    return (
      <g>
        <path d={`M${x},${y} L${targetX},${targetY}`} stroke={fill} strokeWidth={1.5} fill="none" />
        <text x={targetX + (isLeft ? -5 : 5)} y={targetY - 4} textAnchor={textAnchor} fill={fill} fontSize={10} fontWeight="bold">
          {name}
        </text>
        <text x={targetX + (isLeft ? -5 : 5)} y={targetY + 12} textAnchor={textAnchor} fill={fill} fontSize={12} fontFamily="monospace" fontWeight="bold">
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
            paddingAngle={2}
            dataKey="value"
            startAngle={90}
            endAngle={450}
            cy="50%"
            stroke="none"
            labelLine={false}
            label={renderCustomLabel} 
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 2. 节点进度图（空数据时显示空白框架）
export const SixNodesWidget: React.FC<{ data: NodeProgressItem[] }> = ({ data }) => {
  const [limit, setLimit] = useState<string>("50");
  const stats = useMemo(() => ({
    inProgress: data.reduce((sum, item) => sum + item.inProgress, 0),
    completed: data.reduce((sum, item) => sum + item.completed, 0)
  }), [data]);
  const maxNodeTotal = useMemo(() => 
    data.length ? Math.max(...data.map(item => item.inProgress + item.completed)) : 0, [data]
  );

  useEffect(() => {
    if (maxNodeTotal > parseInt(limit) || 0) setLimit(Math.ceil(maxNodeTotal).toString());
  }, [maxNodeTotal]);

  const numericLimit = Math.max(parseInt(limit) || 0, maxNodeTotal);
  const handleLimitBlur = () => {
    const val = parseInt(limit);
    if (isNaN(val) || val < maxNodeTotal) setLimit(Math.ceil(maxNodeTotal).toString());
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
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{fontSize: '10px', position: 'absolute', bottom: 0, left: 0, width: '100%'}} 
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
             min={maxNodeTotal}
             className="w-full h-5 border border-slate-300 rounded px-0 text-center text-xs text-slate-700 focus:outline-none focus:border-blue-500"
           />
        </div>
      </div>
    </div>
  );
};

// 3. 反馈分布饼图（空数据时显示空白框架）
export const FeedbackPieChart: React.FC<{ data: FeedbackData[] }> = ({ data }) => {
  const chartData = useMemo(() => data.length ? data : [{ name: '无数据', value: 1, color: '#e2e8f0', isPlaceholder: true }], [data]);

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
            labelLine={false}
            label={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: '10px', bottom: 0 }} 
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 4. 质量评分趋势图（取消默认3个月限制，空数据时显示空白坐标轴）
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
  const [barOrder, setBarOrder] = useState<string[]>(Object.keys(QUALITY_BAR_CONFIG));
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const minDataValue = useMemo(() => {
    if (!data.length) return 0;
    let minVal = 100;
    data.forEach(item => {
      const scores = Object.values(item).filter(v => typeof v === 'number');
      if (scores.length) minVal = Math.min(minVal, ...scores);
    });
    return parseFloat(minVal.toFixed(2));
  }, [data]);

  useEffect(() => {
    setYMin(data.length ? (minDataValue < 97 ? minDataValue.toString() : "97") : "0");
  }, [minDataValue, data]);

  const barSize = useMemo(() => {
    if (!data.length) return 6;
    if (data.length <= 3) return 20;
    if (data.length <= 6) return 12;
    return 6;
  }, [data]);

  const numericYMin = parseFloat(yMin) || 0;
  const renderCustomLabel = (props: any) => {
    const { x, value } = props;
    if (hiddenSeries.includes('averageScore')) return null;
    return (
      <text x={x} y={15} fill="#10b981" textAnchor="middle" fontSize={9} fontWeight="bold">
        {value}
      </text>
    );
  };

  const toggleVisibility = (key: string) => {
    setHiddenSeries(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
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
          data={data}
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
            wrapperStyle={{ position: 'absolute', bottom: 0, left: 85, right: 0, width: 'auto' }} 
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
            onChange={(e) => setYMin(e.target.value)}
            className="w-full h-5 border border-slate-300 rounded px-0 text-center text-xs text-slate-700 focus:outline-none focus:border-blue-500"
           />
      </div>
    </div>
  );
};

// 5. 用户活跃度Gauge图（空数据时显示空白框架）
export const UserGaugeChart: React.FC<{ data: UserMetric }> = ({ data }) => {
  const trackData = Array(30).fill({ value: 1 });
  const isEmpty = data.isEmpty || data.total === 0;

  const renderNeedle = (props: any) => {
    const { cx, cy } = props;
    if (isEmpty) return null;

    const { active: value, total, percentage: pct } = data;
    const iR = 65; const oR = 85;
    const startAngle = 210; const endAngle = -30;
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
    const baseY2 = cy + baseW * Math.sin(-(currentAngle + 90)
