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
    // 读取已保存的latest-excel数据
    const savedExcelData = await store.get('latest-excel');

    // 无数据时返回空状态
    if (!savedExcelData) {
      return new Response(
        JSON.stringify({ status: "empty", msg: "暂无保存数据", data: null }),
        { headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // 有数据时返回解析后的JSON（前端可直接使用）
    return new Response(
      JSON.stringify({
        status: "success",
        msg: "数据读取成功",
        data: JSON.parse(savedExcelData)
      }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // 异常处理
    return new Response(
      JSON.stringify({ status: "error", msg: "读取失败：" + error.message }),
      { headers: { ...headers, "Content-Type": "application/json" }, status: 500 }
    );
  }
};
