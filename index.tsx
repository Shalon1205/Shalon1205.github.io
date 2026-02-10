import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QualityChart } from './components/Charts.tsx';
// 引入Excel解析库（和你原有上传逻辑一致）
import * as XLSX from 'xlsx';

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
  // 新增：登录状态管理
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  // 新增：管理员密钥（和你原有逻辑一致，可自行修改）
  const ADMIN_KEY = "admin"; // 替换为你的实际管理员密钥

  // 核心：强化版读取数据函数（过滤无效数据）
  const loadSavedData = async () => {
    // 你的Netlify读取接口地址（已填好）
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
      console.log("Blobs读取结果：", result);

      if (result.status === "success" && Array.isArray(result.data)) {
        // 🌟 新增：过滤有效数据（确保每个项都有month字段，数值为数字）
        const validData = result.data.filter((item: any) => {
          return (
            item.month && typeof item.month === 'string' &&
            !isNaN(Number(item.exploration)) &&
            !isNaN(Number(item.reserves))
          );
        }) as QualityMetric[];
        
        setChartData(validData);
        setErrorMsg(validData.length === 0 ? "数据为空，请上传包含有效列的Excel" : "");
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

  // 新增：管理员登录函数
  const handleLogin = () => {
    const inputKey = prompt("请输入管理员密钥：");
    if (inputKey === ADMIN_KEY) {
      setIsLoggedIn(true);
      alert("登录成功！现在可以上传Excel数据了");
    } else {
      alert("密钥错误，请重新输入！");
    }
  };

  // 🌟 修复版：Excel上传并强制匹配QualityMetric格式
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. 解析Excel文件
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        // 取第一个工作表的数据
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        // 🌟 强制映射Excel列名到QualityMetric格式（适配中文/英文列名）
        const parsedData = XLSX.utils.sheet_to_json(worksheet).map((row: any) => ({
          month: row['月份'] || row['month'] || '', // 适配Excel的“月份”或“month”列
          exploration: Number(row['勘探'] || row['exploration'] || 0), // 适配“勘探”列
          reserves: Number(row['储量'] || row['reserves'] || 0), // 适配“储量”列
          development: Number(row['开发'] || row['development'] || 0), // 适配“开发”列
          production: Number(row['生产'] || row['production'] || 0), // 适配“生产”列
          engineering: Number(row['工程'] || row['engineering'] || 0), // 适配“工程”列
          drilling: Number(row['钻井'] || row['drilling'] || 0), // 适配“钻井”列
          averageScore: Number(row['平均分'] || row['averageScore'] || 0) // 适配“平均分”列
        })) as QualityMetric[];
        
        // 🌟 新增：验证解析后的数据有效性
        if (parsedData.length === 0) {
          alert("Excel解析失败：未读取到任何数据！");
          return;
        }
        const firstRow = parsedData[0];
        if (!firstRow.month || firstRow.month === "") {
          alert("Excel格式错误：请确保包含“月份”列（列名可填：月份/month）！");
          return;
        }

        console.log("解析后的Excel数据（适配格式）：", parsedData);

        // 2. 上传到Netlify Blobs
        const saveApiUrl = "https://shalon1205.netlify.app/.netlify/functions/save-data";
        const response = await fetch(saveApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedData)
        });

        const result = await response.json();
        if (result.status === "success") {
          alert("Excel解析成功！数据已长效保存~");
          // 3. 上传成功后重新加载数据
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

  // 页面初始化时自动读取数据
  useEffect(() => {
    loadSavedData();
    // 空依赖：仅在组件挂载时执行一次
  }, []);

  return (
    <div className="min-h-screen p-4">
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">数据治理仪表盘</h1>
        
        <div className="flex gap-2">
          {/* 登录按钮：未登录时显示 */}
          {!isLoggedIn && (
            <button 
              onClick={handleLogin}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              管理员登录
            </button>
          )}

          {/* 重新加载数据按钮：始终显示 */}
          <button 
            onClick={loadSavedData}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            重新加载数据
          </button>

          {/* Excel上传按钮：登录后显示 */}
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
