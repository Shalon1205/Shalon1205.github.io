// index.tsx - 项目主入口文件
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
// 引入所有图表组件（从Charts.tsx导入）
import { 
  QualityChart, 
  VolumeDonutChart, 
  SixNodesWidget, 
  FeedbackPieChart, 
  UserGaugeChart, 
  ScenarioBarChart 
} from './components/Charts.tsx';
// Excel解析库（需要先安装：npm install xlsx）
import * as XLSX from 'xlsx';

// --------------------------- 1. 数据类型定义（和Charts.tsx保持一致） ---------------------------
// 体积环形图数据类型
interface TotalVolumeData {
  new: number | string;    // 新增数据
  history: number | string;// 历史数据
}

// 节点进度数据类型
interface NodeProgressItem {
  name: string;            // 节点名称
  inProgress: number;      // 进行中数量
  completed: number;       // 已完成数量
}

// 反馈饼图数据类型
interface FeedbackData {
  name: string;            // 反馈类型
  value: number;           // 数值
  color: string;           // 颜色
  isPlaceholder?: boolean; // 是否占位
  displayValue?: string;   // 自定义显示值
}

// 质量图表数据类型
interface QualityMetric {
  month: string;           // 月份
  exploration: number;     // 勘探分数
  reserves: number;        // 储量分数
  development: number;     // 开发分数
  production: number;      // 生产分数
  engineering: number;     // 工程分数
  drilling: number;        // 钻完井分数
  averageScore: number;    // 总平均分
}

// 用户活跃度数据类型
interface UserMetric {
  active: number;          // 活跃用户数
  total: number;           // 总用户数
  percentage: string;      // 活跃百分比
  isEmpty: boolean;        // 是否空数据
}

// 场景进度数据类型
interface ScenarioItem {
  category: string;        // 场景分类
  unfinished: number;      // 未完成数量
  finished: number;        // 已完成数量
}

// --------------------------- 2. 空白初始数据（无默认值，仅保留结构） ---------------------------
const EMPTY_DATA = {
  volume: { new: 0, history: 0 } as TotalVolumeData,       // 体积数据：初始0
  nodes: [] as NodeProgressItem[],                         // 节点数据：空数组
  feedback: [] as FeedbackData[],                         // 反馈数据：空数组
  quality: [] as QualityMetric[],                         // 质量数据：空数组
  user: { active: 0, total: 0, percentage: "0%", isEmpty: true } as UserMetric, // 用户数据：空
  scenario: [] as ScenarioItem[]                          // 场景数据：空数组
};

// --------------------------- 3. 主应用组件 ---------------------------
const App = () => {
  // 图表数据状态（初始为空白数据）
  const [chartData, setChartData] = useState(EMPTY_DATA);
  // 加载状态
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // 错误提示
  const [errorMsg, setErrorMsg] = useState<string>("");
  // 登录状态（管理员才能上传Excel）
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  // 管理员密钥（可自行修改）
  const ADMIN_KEY = "admin";

  // --------------------------- 4. 加载数据（从Netlify读取） ---------------------------
  const loadSavedData = async () => {
    // Netlify读取接口（替换成你自己的接口地址）
    const readApiUrl = "https://shalon1205.netlify.app/.netlify/functions/read-data";
    
    try {
      setIsLoading(true); // 开始加载
      const response = await fetch(readApiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      // 接口请求失败
      if (!response.ok) {
        throw new Error(`接口请求失败：${response.status}`);
      }

      const result = await response.json();
      console.log("读取到的数据：", result);

      // 读取成功
      if (result.status === "success" && Array.isArray(result.data)) {
        // 过滤有效质量数据（只校验必要字段）
        const validQualityData = result.data.filter((item: any) => {
          return (
            item.month && typeof item.month === 'string' && // 有月份
            !isNaN(Number(item.exploration)) &&            // 勘探分数是数字
            !isNaN(Number(item.reserves))                  // 储量分数是数字
          );
        }) as QualityMetric[];
        
        // 只更新质量数据，其他保持空白（如需多图表数据，可扩展）
        setChartData({ ...EMPTY_DATA, quality: validQualityData });
        setErrorMsg(""); // 清空错误
      } else if (result.status === "empty") {
        // 无数据时恢复空白
        setChartData(EMPTY_DATA);
        setErrorMsg("");
      } else {
        // 其他错误
        setErrorMsg(`加载失败：${result.msg || "未知错误"}`);
      }
    } catch (error) {
      // 捕获异常
      const err = error as Error;
      setErrorMsg(`加载数据出错：${err.message}`);
      console.error("读取数据错误详情：", err);
    } finally {
      setIsLoading(false); // 结束加载
    }
  };

  // --------------------------- 5. 管理员登录 ---------------------------
  const handleLogin = () => {
    const inputKey = prompt("请输入管理员密钥：");
    if (inputKey === ADMIN_KEY) {
      setIsLoggedIn(true);
      alert("登录成功！现在可以上传Excel数据了");
    } else {
      alert("密钥错误，请重新输入！");
    }
  };

  // --------------------------- 6. Excel上传解析 ---------------------------
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return; // 没选文件直接返回

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        // 解析Excel文件
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        // 读取第一个工作表
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // 解析为质量数据（支持中文/英文列名）
        const parsedQualityData = XLSX.utils.sheet_to_json(worksheet).map((row: any) => ({
          month: row['月份'] || row['month'] || '',          // 月份列（支持中文/英文）
          exploration: Number(row['勘探'] || row['exploration'] || 0), // 勘探列
          reserves: Number(row['储量'] || row['reserves'] || 0),       // 储量列
          development: Number(row['开发'] || row['development'] || 0), // 开发列
          production: Number(row['生产'] || row['production'] || 0),   // 生产列
          engineering: Number(row['工程'] || row['engineering'] || 0), // 工程列
          drilling: Number(row['钻井'] || row['drilling'] || 0),       // 钻井列
          averageScore: Number(row['平均分'] || row['averageScore'] || 0) // 平均分列
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

        // 上传到Netlify（替换成你自己的接口地址）
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
      // 读取文件为二进制
      reader.readAsArrayBuffer(file);
    } catch (error) {
      // 捕获上传异常
      const err = error as Error;
      alert("上传失败：" + err.message);
      console.error("Excel上传错误：", err);
    }
  };

  // --------------------------- 7. 页面初始化加载数据 ---------------------------
  useEffect(() => {
    loadSavedData(); // 组件挂载时加载数据
  }, []);

  // --------------------------- 8. 页面渲染 ---------------------------
  return (
    <div className="min-h-screen p-4 bg-slate-50">
      {/* 头部导航 */}
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">数据治理仪表盘</h1>
        
        {/* 功能按钮 */}
        <div className="flex gap-2">
          {/* 管理员登录按钮 */}
          {!isLoggedIn && (
            <button 
              onClick={handleLogin}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              管理员登录
            </button>
          )}

          {/* 重新加载数据按钮 */}
          <button 
            onClick={loadSavedData}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            重新加载数据
          </button>

          {/* Excel上传按钮（仅管理员可见） */}
          {isLoggedIn && (
            <label className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 cursor-pointer">
              上传Excel
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                onChange={handleExcelUpload}
                className="hidden" // 隐藏原生输入框
              />
            </label>
          )}
        </div>
      </header>

      {/* 加载状态提示 */}
      {isLoading && (
        <div className="flex items-center justify-center h-64 text-slate-500">
          正在加载数据...
        </div>
      )}

      {/* 错误提示（仅接口错误时显示） */}
      {!isLoading && errorMsg && (
        <div className="mb-4 p-2 text-red-500 bg-red-50 rounded">
          {errorMsg}
        </div>
      )}

      {/* 多图表布局（恢复原始仪表盘结构） */}
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

          {/* 4. 质量评分趋势图（跨列显示） */}
          <div className="h-80 bg-white rounded-lg shadow-sm p-4 col-span-1 md:col-span-2 lg:col-span-3">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">质量评分趋势</h2>
            <QualityChart data={chartData.quality} />
          </div>

          {/* 5. 用户活跃度仪表盘 */}
          <div className="h-64 bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">用户活跃度</h2>
            <UserGaugeChart data={chartData.user} />
          </div>

          {/* 6. 场景进度图（跨列显示） */}
          <div className="h-64 bg-white rounded-lg shadow-sm p-4 col-span-1 md:col-span-2 lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">场景进度</h2>
            <ScenarioBarChart data={chartData.scenario} />
          </div>
        </div>
      )}
    </div>
  );
};

// --------------------------- 9. 渲染到页面 ---------------------------
// 找到页面中的root元素（确保你的HTML里有<div id="root"></div>）
const root = createRoot(document.getElementById('root')!);
// 渲染应用
root.render(<App />);
