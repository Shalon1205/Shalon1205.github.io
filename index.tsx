import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
// 🌟 恢复引入所有图表组件（匹配最初仪表盘设计）
import { 
  QualityChart, 
  VolumeDonutChart, 
  SixNodesWidget, 
  FeedbackPieChart, 
  UserGaugeChart, 
  ScenarioBarChart 
} from './components/Charts.tsx';
// Excel解析库
import * as XLSX from 'xlsx';

// 🌟 还原所有数据类型定义（与Charts.tsx保持一致）
interface TotalVolumeData {
  new: number | string;
  history: number | string;
}

interface NodeProgressItem {
  name: string;
  inProgress: number;
  completed: number;
}

interface FeedbackData {
  name: string;
  value: number;
  color: string;
  isPlaceholder?: boolean;
  displayValue?: string;
}

interface QualityMetric {
  month: string;
  exploration: number;
  reserves: number;
  development: number;
  production: number;
  engineering: number;
  drilling: number;
  averageScore: number;
}

interface UserMetric {
  active: number;
  total: number;
  percentage: string;
  isEmpty: boolean;
}

interface ScenarioItem {
  category: string;
  unfinished: number;
  finished: number;
}

// 🌟 定义纯空白初始数据（无默认数值、无占位数据，仅保留结构）
const EMPTY_DATA = {
  volume: { new: 0, history: 0 } as TotalVolumeData, // 空数据设为0，匹配Charts.tsx空白框架
  nodes: [] as NodeProgressItem[],                   // 空数组，渲染空白柱状图框架
  feedback: [] as FeedbackData[],                   // 空数组，渲染空白饼图框架
  quality: [] as QualityMetric[],                   // 空数组，取消3个月默认数据
  user: { active: 0, total: 0, percentage: "0%", isEmpty: true } as UserMetric, // 空用户数据
  scenario: [] as ScenarioItem[]                    // 空数组，渲染空白场景图表框架
};

const App = () => {
  // 🌟 恢复多图表数据状态（替代单一quality数据）
  const [chartData, setChartData] = useState(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  // 管理员密钥（可自定义）
  const ADMIN_KEY = "admin";

  // 核心：加载数据（适配多图表，仅读取quality数据，其他保持空白）
  const loadSavedData = async () => {
    const readApiUrl = "https://shalon1205.netlify.app/.netlify/functions/read-data";
    
    try {
      setIsLoading(true);
      const response = await fetch(readApiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        throw new Error(`接口请求失败：${response.status}`);
      }

      const result = await response.json();
      console.log("读取到的数据：", result);

      if (result.status === "success" && Array.isArray(result.data)) {
        // 过滤有效quality数据（仅校验month和数值类型，取消数量限制）
        const validQualityData = result.data.filter((item: any) => {
          return (
            item.month && typeof item.month === 'string' &&
            !isNaN(Number(item.exploration)) &&
            !isNaN(Number(item.reserves))
          );
        }) as QualityMetric[];
        
        // 仅更新quality数据，其他图表保持空白（如需多图表数据，可扩展Excel解析逻辑）
        setChartData({ ...EMPTY_DATA, quality: validQualityData });
        setErrorMsg(""); // 空数据时不显示错误提示，仅渲染空白框架
      } else if (result.status === "empty") {
        setChartData(EMPTY_DATA); // 无数据时恢复纯空白框架
        setErrorMsg("");
      } else {
        setErrorMsg(`加载失败：${result.msg || "未知错误"}`);
      }
    } catch (error) {
      const err = error as Error;
      setErrorMsg(`加载数据出错：${err.message}`);
      console.error("读取数据错误详情：", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 管理员登录逻辑（保持不变）
  const handleLogin = () => {
    const inputKey = prompt("请输入管理员密钥：");
    if (inputKey === ADMIN_KEY) {
      setIsLoggedIn(true);
      alert("登录成功！现在可以上传Excel数据了");
    } else {
      alert("密钥错误，请重新输入！");
    }
  };

  // Excel上传逻辑（仅解析quality数据，适配多图表空数据结构）
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // 解析Excel为quality数据（适配中文/英文列名，取消数据数量限制）
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
        
        // 验证数据有效性
        if (parsedQualityData.length === 0) {
          alert("Excel解析失败：未读取到任何数据！");
          return;
        }
        const firstRow = parsedQualityData[0];
        if (!firstRow.month || firstRow.month === "") {
          alert("Excel格式错误：请确保包含“月份”列（列名可填：月份/month）！");
          return;
        }

        console.log("解析后的Excel数据：", parsedQualityData);

        // 上传到Netlify Blobs
        const saveApiUrl = "https://shalon1205.netlify.app/.netlify/functions/save-data";
        const response = await fetch(saveApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedQualityData)
        });

        const result = await response.json();
        if (result.status === "success") {
          alert("Excel解析成功！数据已长效保存~");
          // 上传成功后重新加载数据
          loadSavedData();
        } else {
          alert("保存失败：" + result.msg);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      const err = error as Error;
      alert("上传失败：" + err.message);
      console.error("Excel上传错误：", err);
    }
  };

  // 页面初始化时加载数据（仅执行一次）
  useEffect(() => {
    loadSavedData();
  }, []);

  return (
    <div className="min-h-screen p-4 bg-slate-50">
      {/* 头部导航（保持原有样式和逻辑） */}
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

      {/* 加载状态（仅显示加载中，无数据时不提示） */}
      {isLoading && (
        <div className="flex items-center justify-center h-64 text-slate-500">
          正在加载数据...
        </div>
      )}

      {/* 错误提示（仅接口错误时显示，空数据不提示） */}
      {!isLoading && errorMsg && (
        <div className="mb-4 p-2 text-red-500 bg-red-50 rounded">
          {errorMsg}
        </div>
      )}

      {/* 🌟 核心：恢复最初的多图表Grid布局（完整空白仪表盘框架） */}
      {!isLoading && (
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
          <div className="h-64 bg-white rounded-lg shadow-sm p-4 col-span-1 md:col-span-2 lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">场景进度</h2>
            <ScenarioBarChart data={chartData.scenario} />
          </div>
        </div>
      )}
    </div>
  );
};

// 渲染根组件
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
