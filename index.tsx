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
    // 修复1：替换为正确的 Netlify 函数完整 URL
    // 请将 <你的Netlify站点域名> 替换为实际域名（例如 shalon1205.netlify.app）
    const readApiUrl = "https://shalon1205.netlify.app/.netlify/functions/read-data";
    
    try {
      setIsLoading(true);
      // 修复2：增加跨域兼容配置，超时设置
      const response = await fetch(readApiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        mode: "cors", // 显式指定跨域模式
        cache: "no-cache",
        timeout: 10000 // 10秒超时
      });

      if (!response.ok) {
        throw new Error(`接口请求失败：${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("读取到的数据：", result);

      if (result.status === "success" && result.data) {
        // 验证数据格式是否匹配
        const isValidData = Array.isArray(result.data) && result.data.every(item => 
          item.month && typeof item.averageScore === 'number'
        );
        if (isValidData) {
          setChartData(result.data);
          setErrorMsg("");
        } else {
          throw new Error("接口返回数据格式不匹配");
        }
      } else if (result.status === "empty") {
        setChartData([]);
        setErrorMsg("暂无保存的Excel数据");
      } else {
        setErrorMsg(`加载失败：${result.msg || "未知错误"}`);
      }
    } catch (error) {
      const err = error as Error;
      console.error("读取数据错误详情：", err);
      
      // 修复3：区分不同错误类型，给出更明确的提示
      if (err.message.includes("Failed to fetch")) {
        setErrorMsg("加载数据出错：无法连接到数据接口，请检查：1.接口URL是否正确 2.Netlify函数是否部署成功 3.网络是否正常");
        // 降级方案：使用本地模拟数据，保证页面能正常展示
        setChartData(MOCK_CHART_DATA);
      } else if (err.message.includes("timeout")) {
        setErrorMsg("加载数据出错：接口请求超时，请稍后重试");
        setChartData(MOCK_CHART_DATA);
      } else {
        setErrorMsg(`加载数据出错：${err.message}`);
        setChartData(MOCK_CHART_DATA);
      }
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
