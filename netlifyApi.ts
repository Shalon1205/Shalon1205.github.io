// src/netlifyApi.ts
// 1. 替换成你的Netlify站点域名（必须正确，否则接口调用失败）
const NETLIFY_DOMAIN = 'https://shalon1205.netlify.app';

// 2. 替换成你在Netlify环境变量里配置的ADMIN_KEY
const ADMIN_KEY = 'Suwen@1717feizhen';


/**
 * 功能：把解析后的Excel数据，上传到Netlify Blobs保存
 * @param parsedData 你解析后的Excel数据（JSON格式，比如{销量: 100, 增长率: 20}）
 * @returns 是否保存成功（true/false）
 */
export const saveDataToNetlify = async (parsedData: any) => {
  try {
    // 调用Netlify Functions的save-data接口
    const response = await fetch(`${NETLIFY_DOMAIN}/.netlify/functions/save-data`, {
      method: 'POST', // 必须是POST请求（和后端接口一致）
      headers: {
        'Content-Type': 'application/json', // 告诉后端传的是JSON数据
        'X-Admin-Key': ADMIN_KEY // 携带管理员密钥，后端验证权限
      },
      body: JSON.stringify({ data: parsedData }) // 把解析后的数据转成JSON字符串传给后端
    });

    // 解析后端返回的结果
    const result = await response.json();
    if (result.success) {
      alert('数据已长效保存！刷新/分享都能看到最新内容~');
      return true;
    } else {
      alert('数据保存失败：' + result.message);
      return false;
    }
  } catch (error) {
    console.error('保存数据时网络出错：', error);
    alert('网络异常，保存失败，请稍后再试~');
    return false;
  }
};


/**
 * 功能：从Netlify Blobs读取最新保存的仪表盘数据
 * @returns 最新数据（JSON格式）/null（无数据时）
 */
export const getLatestDataFromNetlify = async () => {
  try {
    // 调用Netlify Functions的get-latest-data接口
    const response = await fetch(`${NETLIFY_DOMAIN}/.netlify/functions/get-latest-data`, {
      method: 'GET' // 必须是GET请求（和后端接口一致）
    });

    // 解析后端返回的结果
    const result = await response.json();
    if (result.success) {
      return result.data; // 返回保存的最新数据
    } else {
      console.error('读取数据失败：', result.message);
      return null;
    }
  } catch (error) {
    console.error('读取数据时网络出错：', error);
    return null;
  }
};