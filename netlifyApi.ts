// 替换为你的 Netlify 站点域名（在 Netlify 项目概览页复制，格式：https://xxx.netlify.app）
const NETLIFY_DOMAIN = 'https://shalon1205.netlify.app';

/**
 * 保存Excel数据到Netlify Blobs
 * @param parsedData 解析后的Excel数据
 * @returns 是否保存成功
 */
export const saveDataToNetlify = async (parsedData: any) => {
  try {
    const response = await fetch(`${NETLIFY_DOMAIN}/.netlify/functions/save-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // 仅保留JSON头，移除ADMIN_KEY
      },
      body: JSON.stringify(parsedData), // 直接传数据，无需包在data里
    });

    const result = await response.json();
    if (result.status === 'success') {
      alert('Excel解析成功！数据已长效保存~');
      return true;
    } else {
      alert('保存失败：' + result.msg);
      return false;
    }
  } catch (error) {
    console.error('网络请求失败：', error);
    alert('网络异常，保存失败，请检查Netlify部署是否成功~');
    return false;
  }
};

/**
 * 从Netlify Blobs读取最新数据
 * @returns 最新Excel数据
 */
export const getLatestDataFromNetlify = async () => {
  try {
    const response = await fetch(`${NETLIFY_DOMAIN}/.netlify/functions/get-latest-data`, {
      method: 'GET',
    });

    const data = await response.json();
    return data; // 直接返回数据，无需解析success字段
  } catch (error) {
    console.error('读取数据失败：', error);
    return null;
  }
};
