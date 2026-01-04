// 引入Blobs工具包
import { getStore } from '@netlify/blobs';

// 主逻辑：从Blobs读取最新的Excel数据
export default async (req, context) => {
  // 解决跨域问题
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // OPTIONS请求直接返回成功
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // 连接Blobs存储库
    const store = getStore('dashboard-data');
    // 读取之前保存的latest-excel数据
    const data = await store.get('latest-excel');
    // 返回数据给前端
    return new Response(data || JSON.stringify({}), {
      headers: { ...headers, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ status: "error", msg: "读取失败：" + error.message }), {
      headers: { ...headers, "Content-Type": "application/json" },
      status: 500
    });
  }
};
