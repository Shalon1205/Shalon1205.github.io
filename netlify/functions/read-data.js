// 引入Blobs工具包（必须）
import { getStore } from '@netlify/blobs';

// 主逻辑：读取Blobs中的Excel数据
export default async (req, context) => {
  // 跨域配置（和save-data.js保持一致）
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // 处理Netlify要求的OPTIONS预检请求
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // 连接名为dashboard-data的Blobs存储库
    const store = getStore('dashboard-data');
    // 读取已保存的latest-excel数据（字符串格式）
    const savedExcelStr = await store.get('latest-excel');

    // 优化1：无数据时返回空数组（而非null），避免前端拿到null报错
    if (!savedExcelStr) {
      return new Response(
        JSON.stringify({ status: "empty", msg: "暂无保存数据", data: [] }),
        { headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // 优化2：安全解析JSON + 强制转为数组 + 校验QualityMetric格式
    let savedExcelData = []; // 默认空数组
    try {
      // 解析存储的字符串为JS对象/数组
      savedExcelData = JSON.parse(savedExcelStr);
      
      // 校验1：如果解析后不是数组，强制转为空数组
      if (!Array.isArray(savedExcelData)) {
        savedExcelData = [];
        console.warn("读取到的数据不是数组，已自动转为空数组");
      } else {
        // 校验2：过滤并修正数据，确保每个项符合QualityMetric类型定义
        savedExcelData = savedExcelData.map(item => {
          // 为缺失的字段设置默认值，确保类型正确
          return {
            month: item.month || "", // 月份字段必须是字符串
            exploration: typeof item.exploration === 'number' ? item.exploration : 0,
            reserves: typeof item.reserves === 'number' ? item.reserves : 0,
            development: typeof item.development === 'number' ? item.development : 0,
            production: typeof item.production === 'number' ? item.production : 0,
            engineering: typeof item.engineering === 'number' ? item.engineering : 0,
            drilling: typeof item.drilling === 'number' ? item.drilling : 0,
            averageScore: typeof item.averageScore === 'number' ? item.averageScore : 0
          };
        }).filter(item => item.month.trim() !== ""); // 过滤掉无月份的无效数据
      }
    } catch (parseError) {
      // 解析失败（比如数据格式损坏），仍返回空数组
      savedExcelData = [];
      console.error("数据解析失败：", parseError);
    }

    // 有数据时返回解析后的数组（前端可直接遍历）
    return new Response(
      JSON.stringify({
        status: "success",
        msg: "数据读取成功",
        data: savedExcelData // 确保最终返回的是符合QualityMetric格式的数组
      }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // 异常处理：返回错误信息+空数组，避免前端崩溃
    return new Response(
      JSON.stringify({ 
        status: "error", 
        msg: "读取失败：" + error.message,
        data: [] // 即使报错，也返回空数组
      }),
      { headers: { ...headers, "Content-Type": "application/json" }, status: 500 }
    );
  }
};
