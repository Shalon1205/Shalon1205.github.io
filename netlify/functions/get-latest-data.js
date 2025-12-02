import { getKVStore } from '@netlify/kv';

export default async (req, context) => {
  try {
import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  try {
    // 1. 仅允许 GET 请求
    if (req.method !== 'GET') {
      return new Response('仅支持 GET 请求', { status: 405 });
    }

    // 2. 连接 Blobs 存储（与保存时的 storeName 一致）
    const store = getStore('dashboard-data');

    // 3. 读取最新数据
    const savedDataStr = await store.get('latest');
    const savedData = savedDataStr ? JSON.parse(savedDataStr) : null;

    return new Response(JSON.stringify({ success: true, data: savedData }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('读取失败：', error);
    return new Response(JSON.stringify({ success: false, message: '读取失败' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
};