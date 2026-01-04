// 引入Blobs工具包（必须有，不然用不了存储）
import { getStore } from '@netlify/blobs';

// 主逻辑：接收前端的Excel数据，存到Blobs里
export default async (req, context) => {
  // 解决跨域问题（避免前端调用接口报错）
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // 如果是OPTIONS请求，直接返回成功（Netlify要求）
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // 创建Blobs存储库（名字叫dashboard-data，固定不变）
    const store = getStore('dashboard-data');
    // 接收前端传的Excel数据
    const excelData = await req.json();
    // 把数据存到Blobs，命名为latest-excel（方便后续读取）
    await store.set('latest-excel', JSON.stringify(excelData));
    // 返回成功提示给前端
    return new Response(JSON.stringify({ status: "success", msg: "数据保存成功！" }), {
      headers: { ...headers, "Content-Type": "application/json" }
    });
  } catch (error) {
    // 出错了返回错误提示
    return new Response(JSON.stringify({ status: "error", msg: "保存失败：" + error.message }), {
      headers: { ...headers, "Content-Type": "application/json" },
      status: 500
    });
  }
};
