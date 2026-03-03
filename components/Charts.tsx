// Charts.tsx - 所有图表组件的核心文件
import React, { useState, useMemo, useEffect, useCallback } from 'react';
// 引入recharts所有需要的图表组件
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line, 
  LabelList, PieProps, LabelProps 
} from 'recharts';
// 引入主题常量（如果你的项目里THEME路径不同，记得修改）
import { THEME } from '../constants';
// 引入数据类型（如果你的项目里types路径不同，记得修改）
import { TotalVolumeData, NodeProgressItem, FeedbackData, QualityMetric, UserMetric, ScenarioItem } from '../types';

// --------------------------- 1. 补充类型定义（解决any类型，更安全） ---------------------------
// 自定义Tooltip的属性类型
interface CustomTooltipProps {
  active?: boolean; // 是否激活Tooltip
  payload?: {       // 鼠标悬浮时的数据源
    name: string;
    value: number | string;
    color: string;
    payload: {
      displayValue?: number | string; // 自定义显示值
    };
  }[];
  label?: string | number; // 标签文字
}

// 环形图自定义标签的属性类型
interface RenderCustomLabelProps extends LabelProps {
  name: string;
  value: number;
  fill: string;
  midAngle: number;
  cx: number;
  cy: number;
  outerRadius: number;
}

// 质量图表拖拽图例的属性类型
interface DragDropLegendProps {
  payload: {
    dataKey: string;
    name: string;
    color: string;
  }[];
}

// --------------------------- 2. 自定义Tooltip组件（保留原始功能+类型优化） ---------------------------
// 鼠标悬浮时显示的自定义提示框，所有图表共用
const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  // 只有激活、有数据时才显示提示框
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-slate-200 shadow-lg rounded text-xs text-slate-600 z-50">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.payload.displayValue || entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// --------------------------- 3. 体积环形图（恢复图例+性能优化） ---------------------------
export const VolumeDonutChart: React.FC<{ data: TotalVolumeData }> = ({ data }) => {
  // 判断是否是占位数据（字符串类型就是占位）
  const isPlaceholder = typeof data.new === 'string' || typeof data.history === 'string';

  // 处理图表数据（缓存计算结果，避免重复渲染）
  const chartData = useMemo(() => 
    isPlaceholder
      ? [ // 占位数据：灰色占位
          { name: '新增数据', value: 50, color: '#e2e8f0' },
          { name: '历史数据', value: 50, color: '#cbd5e1' },
        ]
      : [ // 真实数据：用主题色
          { name: '新增数据', value: data.new as number, color: THEME.charts.cyan },
          { name: '历史数据', value: data.history as number, color: THEME.charts.blue },
        ],
  [data, isPlaceholder]);

  // 自定义标签渲染（缓存函数，提升性能）
  const renderCustomLabel = useCallback((props: RenderCustomLabelProps) => {
    const { cx, cy, midAngle, outerRadius, value, name, fill } = props;
    
    // 占位数据不显示标签
    if (isPlaceholder) return null;

    // 计算标签位置（数学公式，不用改）
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
        {/* 标签连接线 */}
        <path 
          d={`M${x},${y} L${targetX},${targetY}`} 
          stroke={fill} 
          strokeWidth={1.5} 
          fill="none" 
        />
        {/* 名称文字 */}
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
        {/* 数值文字（加"万"单位） */}
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
  }, [isPlaceholder]);

  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* 环形图核心配置 */}
          <Pie
            data={chartData}       // 数据源
            innerRadius={20}       // 内圆半径（控制环形粗细）
            outerRadius={30}       // 外圆半径
            paddingAngle={isPlaceholder ? 0 : 2} // 扇区间距
            dataKey="value"        // 数值字段
            startAngle={90}        // 开始角度
            endAngle={450}         // 结束角度
            cy="50%"               // 垂直居中
            stroke="none"          // 取消边框
            labelLine={false}      // 取消默认标签线
            label={renderCustomLabel} // 自定义标签
          >
            {/* 每个扇区的颜色 */}
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke={isPlaceholder ? 'none' : '#fff'} strokeWidth={2} />
            ))}
          </Pie>
          {/* 非占位数据显示Tooltip */}
          {!isPlaceholder && <Tooltip content={<CustomTooltip />} />}
          {/* 恢复环形图图例（之前被删减的） */}
          {!isPlaceholder && (
            <Legend 
              wrapperStyle={{ fontSize: 10, position: 'absolute', top: 0, right: 0 }}
              iconSize={8}       // 图例图标大小
              iconType="circle"  // 图例图标形状（圆形）
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// --------------------------- 4. 六个节点进度图（输入框防错+图例优化） ---------------------------
export const SixNodesWidget: React.FC<{ data: NodeProgressItem[] }> = ({ data }) => {
  // X轴上限输入框的状态
  const [limit, setLimit] = useState<string>("50");

  // 统计总进度（缓存计算结果）
  const stats = useMemo(() => {
    const inProgress = data.reduce((sum, item) => sum + (item.inProgress || 0), 0); // 进行中总数
    const completed = data.reduce((sum, item) => sum + (item.completed || 0), 0);   // 已完成总数
    return { inProgress, completed };
  }, [data]);

  // 计算所有节点的最大总数（用于X轴上限默认值）
  const maxNodeTotal = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map(item => (item.inProgress || 0) + (item.completed || 0)));
  }, [data]);

  // 监听最大总数变化，自动调整输入框值（修复依赖项缺失问题）
  useEffect(() => {
    const current = parseInt(limit) || 0;
    if (maxNodeTotal > current) {
      setLimit(Math.ceil(maxNodeTotal).toString());
    }
  }, [maxNodeTotal, limit]);

  // 无数据时显示提示
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        请上传数据以展示图表
      </div>
    );
  }

  // 输入框值转数字（兜底0，避免NaN）
  const numericLimit = Math.max(parseInt(limit) || 0, maxNodeTotal);

  // 输入框失焦处理：非数字/小于最大值时重置
  const handleLimitBlur = useCallback(() => {
    let val = parseInt(limit);
    if (isNaN(val) || val < maxNodeTotal) {
      setLimit(Math.ceil(maxNodeTotal).toString());
    }
  }, [limit, maxNodeTotal]);

  // 输入框输入处理：只允许数字（过滤非数字字符）
  const handleLimitChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // 只留数字
    setLimit(value);
  }, []);

  return (
    <div className="w-full h-full flex flex-row">
      {/* 图表主体（占85%宽度） */}
      <div className="flex-grow h-full" style={{ width: '85%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"    // 垂直条形图
            data={data}          // 数据源
            margin={{ top: 5, right: 10, left: 0, bottom: 25 }} // 边距
            barSize={16}         // 条形宽度
            barGap={4}           // 条形间距
          >
            {/* 网格线 */}
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            {/* X轴（隐藏，因为是自定义上限） */}
            <XAxis type="number" hide domain={[0, numericLimit]} />
            {/* Y轴（节点名称） */}
            <YAxis 
              type="category" 
              dataKey="name" 
              width={70} 
              tick={{fontSize: 10, fill: '#64748b'}} 
              interval={0} // 显示所有节点
            />
            {/* 悬浮提示框 */}
            <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
            {/* 图例（居中显示，之前被删减的） */}
            <Legend 
              wrapperStyle={{
                fontSize: '10px',
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'center' // 居中
              }} 
              verticalAlign="bottom"
              iconSize={8}
            />
            {/* 进行中条形 */}
            <Bar dataKey="inProgress" name="进行中数量" stackId="a" fill={THEME.charts.blue}>
                <LabelList dataKey="inProgress" position="center" fontSize={9} fill="#fff" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
            {/* 已完成条形 */}
            <Bar dataKey="completed" name="已完成数量" stackId="a" fill="#cbd5e1">
                <LabelList dataKey="completed" position="center" fontSize={9} fill="#475569" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 统计面板（占15%宽度） */}
      <div className="flex flex-col justify-center gap-2 pl-1 items-center" style={{ width: '15%', minWidth: '70px' }}>
        {/* 进行中统计 */}
        <div className="bg-white rounded shadow-sm border border-slate-100 p-1 w-full text-center">
           <div className="text-[10px] text-slate-500 mb-0.5">进行中:</div>
           <div className="text-lg font-bold text-blue-600 leading-none">{stats.inProgress}</div>
        </div>
        {/* 已完成统计 */}
        <div className="bg-white rounded shadow-sm border border-slate-100 p-1 w-full text-center">
           <div className="text-[10px] text-slate-500 mb-0.5">已完成:</div>
           <div className="text-lg font-bold text-slate-600 leading-none">{stats.completed}</div>
        </div>
        {/* X轴上限输入框 */}
        <div className="mt-auto flex flex-col items-center w-full bg-white rounded shadow-sm border border-slate-100 p-0.5">
           <label className="text-[9px] text-slate-400 mb-0.5 text-center w-full">设定X轴上限</label>
           <input 
             type="text" // 改为文本框，配合过滤非数字
             value={limit} 
             onChange={handleLimitChange}
             onBlur={handleLimitBlur}
             min={maxNodeTotal}
             className="w-full h-5 border border-slate-300 rounded px-0 text-center text-xs text-slate-700 focus:outline-none focus:border-blue-500"
             placeholder="请输入数字"
           />
        </div>
      </div>
    </div>
  );
};

// --------------------------- 5. 反馈饼图（恢复完整图例+数据校验） ---------------------------
export const FeedbackPieChart: React.FC<{ data: FeedbackData[] }> = ({ data }) => {
  // 判断是否有占位数据
  const isPlaceholder = data.some(d => d.isPlaceholder);

  // 过滤无效数据（避免undefined/null导致报错）
  const validData = useMemo(() => data.filter(item => item.value !== undefined && item.value !== null), [data]);

  return (
    <div className="h-full w-full relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* 饼图核心配置 */}
          <Pie
            data={validData}     // 过滤后的数据源
            cx="50%"             // 圆心X坐标
            cy="45%"             // 圆心Y坐标
            outerRadius={60}     // 外圆半径
            dataKey="value"      // 数值字段
            stroke="white"       // 扇区边框
            strokeWidth={2}      // 边框宽度
            labelLine={!isPlaceholder} // 占位数据不显示标签线
            // 自定义标签
            label={isPlaceholder ? false : ({name, value, payload}) => {
              return payload.displayValue || value;
            }}
          >
            {/* 每个扇区的颜色 */}
            {validData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {/* 非占位数据显示Tooltip */}
          {!isPlaceholder && <Tooltip content={<CustomTooltip />} />}
          {/* 恢复完整图例（支持换行、间距） */}
          {!isPlaceholder && (
            <Legend 
              verticalAlign="bottom" 
              iconType="square"    // 图例图标（正方形）
              iconSize={8}         // 图标大小
              wrapperStyle={{ 
                fontSize: '10px', 
                bottom: 0,
                display: 'flex',
                flexWrap: 'wrap',   // 超出换行
                justifyContent: 'center', // 居中
                gap: 8              // 图例间距
              }} 
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// --------------------------- 6. 质量报告组合图（拖拽图例+性能优化） ---------------------------
// 质量图表的条形配置（名称+颜色）
const QUALITY_BAR_CONFIG: Record<string, { name: string, color: string }> = {
  exploration: { name: '勘探', color: '#3b82f6' },
  reserves: { name: '储量', color: '#67e8f9' },
  development: { name: '开发', color: '#f472b6' },
  production: { name: '生产', color: '#06b6d4' },
  engineering: { name: '工程', color: '#93c5fd' },
  drilling: { name: '钻完井', color: '#fb923c' },
};

export const QualityChart: React.FC<{ data: QualityMetric[] }> = ({ data }) => {
  // Y轴下限输入框状态
  const [yMin, setYMin] = useState<string>("");
  // 条形图顺序（支持拖拽调整）
  const [barOrder, setBarOrder] = useState<string[]>([
    'exploration', 'reserves', 'development', 'production', 'engineering', 'drilling'
  ]);
  // 隐藏的系列（点击图例显示/隐藏）
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  // 正在拖拽的图例项
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // 计算数据最小值（用于Y轴下限默认值）
  const minDataValue = useMemo(() => {
    if (!data || data.length === 0) return 0;
    
    let minVal = 100;
    data.forEach(item => {
      // 过滤非数字值，避免NaN
      const scores = [
        item.exploration, item.reserves, item.development, 
        item.production, item.engineering, item.drilling, item.averageScore
      ].filter(s => typeof s === 'number');
      
      if (scores.length > 0) {
        const localMin = Math.min(...scores);
        if (localMin < minVal) minVal = localMin;
      }
    });
    return parseFloat(minVal.toFixed(2)); // 保留两位小数
  }, [data]);

  // 监听数据变化，设置Y轴下限默认值（修复依赖项缺失）
  useEffect(() => {
    if (data && data.length > 0) {
      const defaultVal = minDataValue < 97 ? minDataValue : 97;
      setYMin(defaultVal.toString());
    } else {
      setYMin("0");
    }
  }, [minDataValue, data]);

  // 根据数据量调整条形宽度（自适应）
  const barSize = useMemo(() => {
    if (!data || data.length === 0) return 6;
    if (data.length <= 3) return 20;
    if (data.length <= 6) return 12;
    return 6;
  }, [data]);

  // 无数据时显示提示
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        请上传数据以展示图表
      </div>
    );
  }

  // Y轴下限输入处理：只允许数字和小数点
  const handleYMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, ''); // 过滤非数字和小数点
    setYMin(value);
  }, []);

  // 输入框值转数字（兜底0）
  const numericYMin = parseFloat(yMin) || 0;

  // 平均线标签渲染
  const renderCustomLabel = useCallback((props: any) => {
    const { x, value } = props;
    // 隐藏平均线时不显示标签
    if (hiddenSeries.includes('averageScore')) return null;
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
  }, [hiddenSeries]);

  // 显示/隐藏系列
  const toggleVisibility = useCallback((key: string) => {
    setHiddenSeries(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  // 开始拖拽图例
  const onDragStart = useCallback((e: React.DragEvent, key: string) => {
    setDraggedItem(key);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  // 拖拽过程中
  const onDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault(); // 允许放置
    if (draggedItem === key) return;
  }, [draggedItem]);

  // 放下图例（调整顺序）
  const onDrop = useCallback((e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetKey) return;

    // 调整数组顺序
    const newOrder = [...barOrder];
    const draggedIdx = newOrder.indexOf(draggedItem);
    const targetIdx = newOrder.indexOf(targetKey);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      newOrder.splice(draggedIdx, 1); // 删除拖拽项
      newOrder.splice(targetIdx, 0, draggedItem); // 插入到目标位置
      setBarOrder(newOrder);
    }
    setDraggedItem(null); // 重置拖拽状态
  }, [draggedItem, barOrder]);

  // 自定义拖拽图例（恢复完整功能+交互反馈）
  const renderCustomLegend = useCallback((props: DragDropLegendProps) => {
    // 平均线图例配置
    const avgScoreEntry = { name: '总平均分', color: '#10b981', key: 'averageScore' };
    const isAvgHidden = hiddenSeries.includes(avgScoreEntry.key);

    return (
      <div className="flex items-center justify-center w-full pt-1 gap-4 flex-wrap">
        {/* 条形图系列图例（支持拖拽） */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {barOrder.map((key) => {
            const entry = QUALITY_BAR_CONFIG[key];
            const isDragging = draggedItem === key;
            const isHidden = hiddenSeries.includes(key);
            return (
              <div 
                key={key} 
                draggable // 可拖拽
                onDragStart={(e) => onDragStart(e, key)}
                onDragOver={(e) => onDragOver(e, key)}
                onDrop={(e) => onDrop(e, key)}
                onClick={() => toggleVisibility(key)} // 点击显示/隐藏
                className={`flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer select-none transition-all
                  ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'} // 拖拽时的视觉反馈
                  ${isHidden ? 'opacity-40 grayscale' : ''} // 隐藏时变灰
                  p-1 rounded hover:bg-slate-50 // 鼠标悬浮高亮
                `}
                title="拖动调整顺序，点击显示/隐藏" // 提示文字
              >
                <span className="block w-2 h-2" style={{ backgroundColor: entry.color }}></span>
                <span>{entry.name}</span>
              </div>
            );
          })}
        </div>

        {/* 平均线图例（点击显示/隐藏） */}
        <div 
          onClick={() => toggleVisibility(avgScoreEntry.key)}
          className={`flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer select-none transition-all
            ${isAvgHidden ? 'opacity-40 grayscale' : 'opacity-100'}
            p-1 rounded hover:bg-slate-50
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
  }, [barOrder, draggedItem, hiddenSeries, onDragStart, onDragOver, onDrop, toggleVisibility]);

  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart // 组合图（条形+折线）
          data={data}
          margin={{ top: 25, right: 10, bottom: 25, left: 10 }}
          barGap={0}          // 条形间距
          barCategoryGap="20%" // 分类间距
        >
          {/* 网格线 */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          {/* X轴（月份） */}
          <XAxis dataKey="month" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
          {/* Y轴（分数） */}
          <YAxis 
            yAxisId="left" 
            domain={[numericYMin, 100]} // 自定义下限
            tick={{fontSize: 10, fill: '#94a3b8'}} 
            axisLine={false} 
            tickLine={false}
            width={30}
          />
          {/* 悬浮提示框 */}
          <Tooltip content={<CustomTooltip />} />
          
          {/* 自定义拖拽图例 */}
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
          
          {/* 渲染所有条形图系列（不删减） */}
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
                radius={[2, 2, 0, 0]} // 圆角
                hide={hiddenSeries.includes(key)} // 控制显示/隐藏
              />
            );
          })}
          
          {/* 平均线（折线） */}
          <Line 
            yAxisId="left"
            type="monotone" // 平滑曲线
            dataKey="averageScore" 
            name="总平均分" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#fff'}} // 圆点样式
            label={renderCustomLabel} // 数值标签
            hide={hiddenSeries.includes('averageScore')} // 控制显示/隐藏
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Y轴下限输入框 */}
      <div className="absolute bottom-0 left-0 z-10 w-20 bg-white/90 rounded shadow-sm border border-slate-100 p-0.5 flex flex-col items-center backdrop-blur-[2px]">
         <label className="text-[9px] text-slate-400 mb-0.5 text-center w-full">设定Y轴下限</label>
         <input 
            type="text" // 文本框，过滤非数字
            step="0.05"
            value={yMin}
            onChange={handleYMinChange}
            className="w-full h-5 border border-slate-300 rounded px-0 text-center text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            placeholder="0.00"
          />
      </div>
    </div>
  );
};

// --------------------------- 7. 用户活跃度仪表盘（性能优化+数据校验） ---------------------------
export const UserGaugeChart: React.FC<{ data: UserMetric }> = ({ data }) => {
  // 空数据时不渲染
  if (!data || data.isEmpty || !data.total) return null;

  // 仪表盘轨道数据（缓存，避免重复创建）
  const trackData = useMemo(() => Array(30).fill({ value: 1 }), []);

  // 自定义指针渲染（缓存函数）
  const renderNeedle = useCallback((props: PieProps) => {
    const { cx, cy } = props; 
    const { active: value = 0, total = 0, percentage = 0 } = data;
    
    // 计算指针角度（数学公式，不用改）
    const iR = 65; 
    const oR = 85; 
    const startAngle = 210;
    const endAngle = -30;
    const totalAngle = startAngle - endAngle;
    const ratio = total > 0 ? Math.min(value / total, 1) : 0; // 比例（最大1）
    const currentAngle = startAngle - (ratio * totalAngle);
    const RADIAN = Math.PI / 180;

    // 指针坐标计算
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

    // 标签对齐方式
    let anchor: 'middle' | 'end' | 'start' = 'middle';
    if (currentAngle > 100) anchor = 'end';
    else if (currentAngle < 80) anchor = 'start';

    return (
      <g pointerEvents="none">
        {/* 指针形状 */}
        <path 
          d={`M${baseX1},${baseY1} L${tipX},${tipY} L${baseX2},${baseY2} Z`} 
          fill="#dc2626" 
          stroke="#991b1b" 
          strokeWidth={1}
        />
        {/* 指针中心圆点 */}
        <circle cx={cx} cy={cy} r={5} fill="#1e293b" />
        <circle cx={cx} cy={cy} r={2} fill="#dc2626" />

        {/* 活跃用户数标签 */}
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
        {/* 百分比标签 */}
        <text 
          x={labelX} 
          y={labelY + 8} 
          textAnchor={anchor} 
          fill="#dc2626" 
          fontSize={10}
        >
          ({percentage}%)
        </text>

        {/* 用户总数标题 */}
        <text x={cx} y={cy + 30} textAnchor="middle" fill="#64748b" fontSize={12}>
          用户总数
        </text>
        {/* 用户总数数值 */}
        <text x={cx} y={cy + 48} textAnchor="middle" fill="#0f172a" fontSize={16} fontWeight="bold">
          {total}
        </text>

        {/* 最小值标签（0） */}
        <text 
          x={cx + (oR + 15) * Math.cos(-startAngle * RADIAN)} 
          y={cy + (oR + 15) * Math.sin(-startAngle * RADIAN)} 
          textAnchor="end" 
          fill="#94a3b8" 
          fontSize={10}
        >
          0
        </text>
        {/* 最大值标签（总数） */}
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
  }, [data]);

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* 仪表盘轨道 */}
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
            isAnimationActive={false} // 关闭动画，提升性能
          >
            {trackData.map((_, i) => (
                <Cell key={`cell-${i}`} fill="#3b82f6" />
            ))}
          </Pie>

          {/* 指针（用空饼图渲染） */}
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
            label={renderNeedle} // 自定义指针
            isAnimationActive={false}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// --------------------------- 8. 场景进度条形图（输入优化+图例完整） ---------------------------
export const ScenarioBarChart: React.FC<{ data: ScenarioItem[] }> = ({ data }) => {
  // X轴上限输入框状态
  const [limit, setLimit] = useState<string>("50");

  // 统计总数（缓存计算）
  const stats = useMemo(() => {
    const unfinished = data.reduce((sum, item) => sum + (item.unfinished || 0), 0); // 未完成总数
    const finished = data.reduce((sum, item) => sum + (item.finished || 0), 0);     // 已完成总数
    return { unfinished, finished };
  }, [data]);

  // 计算最大总数（用于X轴上限）
  const maxScenarioTotal = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map(item => (item.unfinished || 0) + (item.finished || 0)));
  }, [data]);

  // 监听最大总数变化，设置默认值
  useEffect(() => {
    if (maxScenarioTotal > 0) {
      setLimit(maxScenarioTotal.toString());
    }
  }, [maxScenarioTotal]);

  // 无数据时显示提示
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        请上传数据以展示图表
      </div>
    );
  }

  // 输入框值转数字（兜底0）
  const numericLimit = Math.max(parseFloat(limit) || 0, maxScenarioTotal);

  // 输入框失焦处理：非数字/小于最大值时重置
  const handleLimitBlur = useCallback(() => {
    let val = parseFloat(limit);
    if (isNaN(val) || val < maxScenarioTotal) {
      setLimit(maxScenarioTotal.toString());
    }
  }, [limit, maxScenarioTotal]);

  // 输入框输入处理：只允许数字
  const handleLimitChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setLimit(value);
  }, []);

  return (
    <div className="w-full h-full flex flex-row">
      {/* 图表主体（85%宽度） */}
      <div className="flex-grow h-full" style={{ width: '85%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"    // 垂直条形图
            data={data}          // 数据源
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }} // 边距
            barSize={12}         // 条形宽度
            barGap={2}           // 条形间距
          >
            {/* 网格线 */}
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            {/* X轴（隐藏） */}
            <XAxis type="number" hide domain={[0, numericLimit]} />
            {/* Y轴（场景分类） */}
            <YAxis 
              type="category" 
              dataKey="category" 
              width={40} 
              tick={{fontSize: 11, fill: '#64748b'}} 
              axisLine={false}
              tickLine={false}
            />
            {/* 悬浮提示框 */}
            <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
            {/* 图例（居中+间距） */}
            <Legend 
              wrapperStyle={{ 
                fontSize: '10px', 
                display: 'flex',
                justifyContent: 'center',
                gap: 8
              }} 
              verticalAlign="bottom"
              iconSize={8}
            />
            {/* 未完成条形 */}
            <Bar dataKey="unfinished" name="未完成" stackId="a" fill={THEME.charts.blue} radius={[0, 2, 2, 0]}>
                <LabelList dataKey="unfinished" position="center" fontSize={9} fill="#fff" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
            {/* 已完成条形 */}
            <Bar dataKey="finished" name="已完成" stackId="a" fill="#cbd5e1" radius={[0, 2, 2, 0]}>
                <LabelList dataKey="finished" position="center" fontSize={9} fill="#475569" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 统计面板（15%宽度） */}
      <div className="flex flex-col justify-center gap-2 pl-1 items-center" style={{ width: '15%', minWidth: '70px' }}>
        {/* 未完成统计 */}
        <div className="bg-white rounded shadow-sm border border-slate-100 p-1 w-full text-center">
           <div className="text-[10px] text-slate-500 mb-0.5">未完成:</div>
           <div className="text-lg font-bold text-blue-600 leading-none">{stats.unfinished}</div>
        </div>
        {/* 已完成统计 */}
        <div className="bg-white rounded shadow-sm border border-slate-100 p-1 w-full text-center">
           <div className="text-[10px] text-slate-500 mb-0.5">已完成:</div>
           <div className="text-lg font-bold text-slate-600 leading-none">{stats.finished}</div>
        </div>
        {/* X轴上限输入框 */}
        <div className="mt-auto flex flex-col items-center w-full bg-white rounded shadow-sm border border-slate-100 p-0.5">
           <label className="text-[9px] text-slate-400 mb-0.5 text-center w-full">设定X轴上限</label>
           <input 
             type="text"
             value={limit}
             onChange={handleLimitChange}
             onBlur={handleLimitBlur}
             min={maxScenarioTotal}
             className="w-full h-5 border border-slate-300 rounded px-0 text-center text-xs text-slate-700 focus:outline-none focus:border-blue-500"
             placeholder="请输入数字"
           />
        </div>
      </div>
    </div>
  );
};
