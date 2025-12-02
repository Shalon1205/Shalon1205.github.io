// 引入 Netlify Blobs 客户端
import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  try {
    // 1. 仅允许 POST 请求
    if (req.method !== 'POST') {
      return new Response('仅支持 POST 请求', { status: 405 });
    }

    // 2. 验证管理员密钥（防止他人篡改）
    const ADMIN_KEY = Netlify.env.get('ADMIN_KEY'); // 从环境变量读取
    const requestKey = req.headers.get('X-Admin-Key');
    if (!requestKey || requestKey !== ADMIN_KEY) {
      return new Response('无权限保存数据', { status: 403 });
    }

    // 3. 解析前端传入的 JSON 数据
    const { data } = await req.json();
    if (!data) {
      return new Response('请传入有效数据', { status: 400 });
    }

    // 4. 连接 Blobs 存储（storeName 自定义，比如 "dashboard-data"）
    const store = getStore('dashboard-data');

    // 5. 存储数据（key 为 "latest"，覆盖旧数据，仅保留最新一条）
    await store.put('latest', JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, message: '数据保存成功' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('保存失败：', error);
    return new Response(JSON.stringify({ success: false, message: '保存失败' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
};