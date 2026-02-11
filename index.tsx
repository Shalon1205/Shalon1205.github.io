import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
// 引入所有图表组件（还原最初的多图表结构）
import { 
  QualityChart, 
  VolumeDonutChart, 
  SixNodesWidget, 
  FeedbackPieChart, 
  UserGaugeChart, 
  ScenarioBarChart 
} from './components/Charts.tsx';
import * as XLSX from 'xlsx';
// 引入图表类型（与最初设计一致）
import { TotalVolumeData, NodeProgressItem, FeedbackData, QualityMetric, UserMetric, ScenarioItem } from './types';

// 定义“空数据”（用于未上传数据时显示空白框架）
const EMPTY_DATA = {
  volume: { new: 0, history: 0 } as TotalVolumeData,
  nodes: [] as NodeProgressItem[],
  feedback: [] as FeedbackData[],
  quality: [] as QualityMetric[],
  user: { active: 0, total: 0, percentage: 0, isEmpty: true } as UserMetric,
  scenario: [] as ScenarioItem[]
};

const App = () => {
  // 所有图表的数据状态（与最初设计一致）
  const [chartData, setChartData] = useState(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const ADMIN_KEY = "admin"; // 管理员密钥（可自定义）

  // 加载数据（从Netlify Blobs读取，适配多图表）
  const loadSavedData = async () => {
    const readApiUrl = "https://shalon1205.netlify.app/.netlify/functions/read-data";
    try {
      setIsLoading(true);
      const response = await fetch(readApiUrl, { method: "GET" });
      if (!response.ok) throw new Error(`接口请求失败：${response.status}`);
      const result = await response.json();

      if (result.status === "success" && result.data) {
        // 若上传的Excel包含多图表数据，需扩展解析逻辑；此处先适配quality数据
        const validQualityData = Array.isArray(result.data) ? result.data : [];
        setChartData({ ...EMPTY_DATA, quality: validQualityData });
        setErrorMsg("");
      } else if (result.status === "empty") {
        setChartData(EMPTY_DATA); // 未上传数据时显示所有空白图表
        setErrorMsg("");
      } else {
        setErrorMsg(`加载失败：${result.msg || "未知错误"}`);
      }
    } catch (error) {
      const err = error as Error;
      setErrorMsg(`加载数据出错：${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 管理员登录（与最初逻辑一致）
  const handleLogin = () => {
    const inputKey = prompt("请输入管理员密钥：");
    if (inputKey === ADMIN_KEY) {
      setIsLoggedIn(true);
      alert("登录成功！现在可以上传Excel数据了");
    } else {
      alert("密钥错误，请重新输入！");
    }
  };

  // Excel上传（解析后同步多图表数据）
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // 解析Excel为quality数据（若需多图表，需从不同工作表/列解析）
        const parsedQualityData = XLSX.utils.sheet_to_json(worksheet).map((row: any) => ({
          month: row['月份'] || row['month'] || '',
          exploration: Number(row['勘探'] || row['exploration'] || 0),
          reserves: Number(row['储量'] || row['reserves'] || 0),
          development: Number(row['开发'] || row['development'] || 0),
          production: Number(row['生产'] || row['production'] || 0),
          engineering: Number(row['工程'] || row['engineering'] || 0),
          drilling: Number(row['钻井'] || row['drilling'] || 0),
          averageScore: Number(row['平均分'] || row['averageScore'] || 0)
        })) as QualityMetric[];

        if (parsedQualityData.length === 0 || !parsedQualityData[0].month) {
          alert("Excel格式错误，请包含‘月份’‘勘探’等列！");
          return;
        }

        // 上传到Netlify Blobs
        const saveApiUrl = "https://shalon1205.netlify.app/.netlify/functions/save-data";
        const response = await fetch(saveApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedQualityData)
        });
        const result = await response.json();
        if (result.status === "success") {
          alert("Excel解析成功！数据已保存~");
          loadSavedData();
        } else {
          alert("保存失败：" + result.msg);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      alert("上传失败：" + (error as Error).message);
    }
  };

  // 页面初始化加载数据
  useEffect(() => {
    loadSavedData();
  }, []);

  return (
    <div className="min-h-screen p-4 bg-slate-50">
      {/* 头部（与最初设计一致） */}
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">数据治理仪表盘</h1>
        <div className="flex gap-2">
          {!isLoggedIn && (
            <button 
              onClick={handleLogin}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              管理员登录
            </button>
          )}
          <button 
            onClick={loadSavedData}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            重新加载数据
          </button>
          {isLoggedIn && (
            <label className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 cursor-pointer">
              上传Excel
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                onChange={handleExcelUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      </header>

      {/* 错误提示 */}
      {errorMsg && (
        <div className="mb-4 p-2 text-red-500 bg-red-50 rounded">
          {errorMsg}
        </div>
      )}

      {/* 核心：完整仪表盘Grid布局（还原最初设计） */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. 数据量环形图 */}
        <div className="h-64 bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">数据量分布</h2>
          <VolumeDonutChart data={chartData.volume} />
        </div>

        {/* 2. 节点进度图 */}
        <div className="h-64 bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">节点进度</h2>
          <SixNodesWidget data={chartData.nodes} />
        </div>

        {/* 3. 反馈分布饼图 */}
        <div className="h-64 bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">反馈分布</h2>
          <FeedbackPieChart data={chartData.feedback} />
        </div>

        {/* 4. 质量评分趋势图（占全屏宽度） */}
        <div className="h-80 bg-white rounded-lg shadow-sm p-4 col-span-1 md:col-span-2 lg:col-span-3">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">质量评分趋势</h2>
          <QualityChart data={chartData.quality} />
        </div>

        {/* 5. 用户活跃度Gauge图 */}
        <div className="h-64 bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">用户活跃度</h2>
          <UserGaugeChart data={chartData.user} />
        </div>

        {/* 6. 场景进度图 */}
        <div className="h-64 bg-white rounded-lg shadow-sm p-4 col-span-1 md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">场景进度</h2>
          <ScenarioBarChart data={chartData.scenario} />
        </div>
      </div>
    </div>
  );
};

// 渲染根组件
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
