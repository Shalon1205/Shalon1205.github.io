import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QualityChart } from './components/Charts.tsx';

// 定义数据类型（和你的 QualityMetric 保持一致）
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

const App = () => {
  // 存储读取到的图表数据
  const [chartData, setChartData] = useState<QualityMetric[]>([]);
  // 加载状态（可选，用于显示加载中）
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // 错误信息
  const [errorMsg, setErrorMsg] = useState<string>("");

  // 核心：读取数据的函数
  const loadSavedData = async () => {
    // 替换为你的 Netlify 读取接口地址！！！
    const readApiUrl = "https://shalon1205/.netlify/functions/read-data";
    
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

      if (result.status === "success" && result.data) {
        // 假设返回的 data 是符合 QualityMetric 格式的数组
        setChartData(result.data);
        setErrorMsg("");
      } else if (result.status === "empty") {
        setChartData([]);
        setErrorMsg("暂无保存的Excel数据");
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

  // 页面初始化时自动读取数据
  useEffect(() => {
    loadSavedData();
    // 空依赖：仅在组件挂载时执行一次
  }, []);

  return (
    <div className="min-h-screen p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">数据治理仪表盘</h1>
        {/* 可选：添加重新加载数据按钮 */}
        <button 
          onClick={loadSavedData}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          重新加载数据
        </button>
      </header>

      {/* 加载状态/错误提示 */}
      {isLoading && (
        <div className="flex items-center justify-center h-64 text-slate-500">
          正在加载数据...
        </div>
      )}

      {!isLoading && errorMsg && (
        <div className="mb-4 p-2 text-red-500 bg-red-50 rounded">
          {errorMsg}
        </div>
      )}

      {/* 图表组件：传递读取到的数据 */}
      <div className="h-[600px] w-full">
        <QualityChart data={chartData} />
      </div>
    </div>
  );
};

// 渲染根组件
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
