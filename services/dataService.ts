
import * as XLSX from 'xlsx';
import { DashboardData, NodeProgressItem, QualityMetric, ScenarioItem } from '../types';
import { DEFAULT_DATA } from '../constants';

export const parseExcelFile = async (file: File): Promise<DashboardData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Clone default data to start with
        const result: DashboardData = JSON.parse(JSON.stringify(DEFAULT_DATA));

        // Helper function to safely find a header row containing specific keywords
        const findHeaderRow = (data: any[][], keywords: string[]): number => {
          for (let i = 0; i < Math.min(20, data.length); i++) {
            const rowStr = data[i].map(cell => String(cell).trim()).join(' ');
            if (keywords.every(k => rowStr.includes(k))) {
              return i;
            }
          }
          return -1;
        };

        // 1. Parse "数据湖数据总量"
        const totalVolumeSheetName = "深圳分公司数据湖数据总量（自动计算）";
        const wsTotal = workbook.Sheets[totalVolumeSheetName];
        
        if (wsTotal) {
          const jsonData = XLSX.utils.sheet_to_json(wsTotal, { header: 1 }) as any[][];
          let found = false;
          
          for (let r = 0; r < jsonData.length; r++) {
            const row = jsonData[r];
            for (let c = 0; c < row.length; c++) {
              const cellValue = String(row[c]).trim();
              if (cellValue === "确认总量") {
                if (jsonData.length > r + 1) {
                  const valueRow = jsonData[r + 1];
                  const rawValue = valueRow[c];
                  if (rawValue !== undefined && rawValue !== null) {
                    const numValue = parseFloat(rawValue);
                    if (!isNaN(numValue)) {
                      result.volume.total = parseFloat((numValue / 10000).toFixed(2));
                      found = true;
                    }
                  }
                }
              }
              if (found) break;
            }
            if (found) break;
          }
        }
        
        // 2. Parse "深圳分公司历史与新增数据量情况（董家勇更新）"
        const historyNewSheetName = "深圳分公司历史与新增数据量情况（董家勇更新）";
        const wsHistory = workbook.Sheets[historyNewSheetName];

        if (wsHistory) {
          const jsonData = XLSX.utils.sheet_to_json(wsHistory, { header: 1 }) as any[][];
          // Look for "数据总量" to identify column
          let totalColIndex = -1;
          let headerRowIndex = -1;
          
          for (let i = 0; i < Math.min(10, jsonData.length); i++) {
             const row = jsonData[i];
             const idx = row.findIndex((cell: any) => String(cell).trim() === "数据总量");
             if (idx !== -1) {
               headerRowIndex = i;
               totalColIndex = idx;
               break;
             }
          }

          if (totalColIndex !== -1 && headerRowIndex !== -1) {
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
               const row = jsonData[i];
               const rowLabel = String(row[0]).trim(); 

               if (rowLabel === "历史数量" || rowLabel === "历史数据") {
                 const val = row[totalColIndex];
                 if (val !== undefined && val !== null) {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) {
                       result.volume.history = parseFloat((numVal / 10000).toFixed(2));
                    }
                 }
               }
               
               if (rowLabel === "新增数据") {
                 const val = row[totalColIndex];
                 if (val !== undefined && val !== null) {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) {
                       result.volume.new = parseFloat((numVal / 10000).toFixed(2));
                    }
                 }
               }
            }
          }
        }

        // 3. Parse "深圳分公司主数据入湖数量情况(董家勇更新）" (Main Data)
        const mainDataSheetName = "深圳分公司主数据入湖数量情况(董家勇更新）";
        const wsMain = workbook.Sheets[mainDataSheetName];
        if (wsMain) {
          const jsonData = XLSX.utils.sheet_to_json(wsMain, { header: 1 }) as any[][];
          // Look for header row containing '井' and '样品'
          const headerRowIndex = findHeaderRow(jsonData, ['井', '样品']);
          
          if (headerRowIndex !== -1 && jsonData.length > headerRowIndex + 1) {
            const headerRow = jsonData[headerRowIndex].map(v => String(v).trim());
            const valueRow = jsonData[headerRowIndex + 1];

            // Map specific columns to Main Data List items
            // Mapping: Header Name -> List Label
            const mapping: Record<string, string> = {
              '井': '井主数据',
              '样品': '样品主数据',
              '地质油藏': '地质油藏主数据',
              '物探工区': '物探工区主数据',
              '设备设施': '设备设施主数据',
              '生产管理': '生产管理主数据',
              '其他': '其他主数据'
            };

            // Update result.mainDataList
            result.mainDataList = result.mainDataList.map(item => {
              // Find key in mapping that matches this item's label
              const key = Object.keys(mapping).find(k => mapping[k] === item.label);
              if (key) {
                const colIndex = headerRow.indexOf(key);
                if (colIndex !== -1) {
                  const val = valueRow[colIndex];
                  if (val !== undefined && val !== null && !isNaN(parseFloat(val))) {
                    // Format with commas
                    return { ...item, value: parseFloat(val).toLocaleString() };
                  }
                }
              }
              return item;
            });
          }
        }

        // 4. Parse "深圳分公司业务数据入湖数量情况（董家勇更新）" (Business Data)
        const businessDataSheetName = "深圳分公司业务数据入湖数量情况（董家勇更新）";
        const wsBusiness = workbook.Sheets[businessDataSheetName];
        if (wsBusiness) {
          const jsonData = XLSX.utils.sheet_to_json(wsBusiness, { header: 1 }) as any[][];
          // Look for header row containing '勘探' and '开发'
          const headerRowIndex = findHeaderRow(jsonData, ['勘探', '开发']);

          if (headerRowIndex !== -1 && jsonData.length > headerRowIndex + 1) {
            const headerRow = jsonData[headerRowIndex].map(v => String(v).trim());
            const valueRow = jsonData[headerRowIndex + 1];

            // Mapping: Header Name -> List Label
            const mapping: Record<string, string> = {
              '勘探': '勘探业务数据',
              '储量': '储量业务数据',
              '开发': '开发业务数据',
              '生产': '生产业务数据',
              '工程建设': '工程建设业务数据',
              '钻完井': '钻完井业务数据'
            };

            result.businessDataList = result.businessDataList.map(item => {
              const key = Object.keys(mapping).find(k => mapping[k] === item.label);
              if (key) {
                const colIndex = headerRow.indexOf(key);
                if (colIndex !== -1) {
                  const val = valueRow[colIndex];
                  if (val !== undefined && val !== null) {
                     const num = parseFloat(val);
                     if (!isNaN(num)) {
                       // Convert to Wan (divide by 10000), keep 2 decimals
                       const valWan = (num / 10000).toFixed(2) + '万';
                       return { ...item, value: valWan };
                     }
                  }
                }
              }
              return item;
            });
          }
        }

        // 5. Parse "源头采集“六个节点”执行情况（唐漓更新）" (Six Nodes)
        const nodesSheetName = "源头采集“六个节点”执行情况（唐漓更新）";
        const wsNodes = workbook.Sheets[nodesSheetName];
        if (wsNodes) {
          const jsonData = XLSX.utils.sheet_to_json(wsNodes, { header: 1 }) as any[][];
          const nodesList = [
            '勘探井位批准',
            '储量评估审查',
            '基本设计审查',
            '机械完工检查',
            '项目投产检查',
            '维修改造审查'
          ];
          
          // Find header row with these nodes
          const headerRowIndex = findHeaderRow(jsonData, ['勘探井位批准', '储量评估审查']);
          
          if (headerRowIndex !== -1) {
            const headerRow = jsonData[headerRowIndex].map(v => String(v).trim());
            
            // Find indexes for "进行中数量" row and "已完成数量" row
            let inProgressRowIndex = -1;
            let completedRowIndex = -1;

            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
              const firstCell = String(jsonData[i][0]).trim();
              if (firstCell.includes("进行中数量")) inProgressRowIndex = i;
              if (firstCell.includes("已完成数量")) completedRowIndex = i;
            }

            if (inProgressRowIndex !== -1 && completedRowIndex !== -1) {
               const inProgressRow = jsonData[inProgressRowIndex];
               const completedRow = jsonData[completedRowIndex];

               const newNodes: NodeProgressItem[] = nodesList.map(nodeName => {
                 const colIndex = headerRow.indexOf(nodeName);
                 let inProgress = 0;
                 let completed = 0;

                 if (colIndex !== -1) {
                   inProgress = parseFloat(inProgressRow[colIndex]) || 0;
                   completed = parseFloat(completedRow[colIndex]) || 0;
                 }
                 
                 return { name: nodeName, inProgress, completed };
               });
               
               result.nodes = newNodes;
            }
          }
        }

        // 6. Parse "问题反馈情况（闭环管理+数据湖）（张俊芳提供闭环）" (Feedback)
        const feedbackSheetName = "问题反馈情况（闭环管理+数据湖）（张俊芳提供闭环）";
        const wsFeedback = workbook.Sheets[feedbackSheetName];
        if (wsFeedback) {
          const jsonData = XLSX.utils.sheet_to_json(wsFeedback, { header: 1 }) as any[][];
          const headerRowIndex = findHeaderRow(jsonData, ['问题来源', '问题数']);

          if (headerRowIndex !== -1) {
            const headerRow = jsonData[headerRowIndex].map(v => String(v).trim());
            const sourceIdx = headerRow.indexOf('问题来源');
            const countIdx = headerRow.indexOf('问题数');

            if (sourceIdx !== -1 && countIdx !== -1) {
               let closedLoopVal = 0;
               let dataLakeVal = 0;
               
               for(let i=headerRowIndex+1; i<jsonData.length; i++){
                  const row = jsonData[i];
                  const sourceName = String(row[sourceIdx]).trim();
                  if(sourceName.includes('闭环管理')) closedLoopVal = parseFloat(row[countIdx]) || 0;
                  if(sourceName.includes('数据湖')) dataLakeVal = parseFloat(row[countIdx]) || 0;
               }

               result.feedback = [
                 { name: '数据湖', value: dataLakeVal, color: '#67e8f9' }, // Cyan 300
                 { name: '闭环管理', value: closedLoopVal, color: '#2563eb' } // Blue 600
               ];
            }
          }
        }

        // 7. Parse "深圳分公司质量情况（张俊芳更新）" (Quality Report)
        const qualitySheetName = "深圳分公司质量情况（张俊芳更新）";
        const wsQuality = workbook.Sheets[qualitySheetName];
        if (wsQuality) {
          const jsonData = XLSX.utils.sheet_to_json(wsQuality, { header: 1 }) as any[][];
          // Headers: 月度, 勘探, 储量, 开发, 生产, 工程, 钻完井, 总平均分
          const headerRowIndex = findHeaderRow(jsonData, ['月度', '勘探', '总平均分']);
          
          if (headerRowIndex !== -1) {
            const headerRow = jsonData[headerRowIndex].map(v => String(v).trim());
            const mapIdx = {
              month: headerRow.indexOf('月度'),
              exploration: headerRow.indexOf('勘探'),
              reserves: headerRow.indexOf('储量'),
              development: headerRow.indexOf('开发'),
              production: headerRow.indexOf('生产'),
              engineering: headerRow.indexOf('工程'),
              drilling: headerRow.indexOf('钻完井'),
              averageScore: headerRow.indexOf('总平均分'),
            };

            const parseAndRound = (val: any) => {
              const num = parseFloat(val) || 0;
              return parseFloat(num.toFixed(2));
            };

            if (mapIdx.month !== -1) {
               const newQualityData: QualityMetric[] = [];
               for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                 const row = jsonData[i];
                 // Ensure row has data (Month shouldn't be empty)
                 if (row[mapIdx.month]) {
                   newQualityData.push({
                     month: String(row[mapIdx.month]),
                     exploration: parseAndRound(row[mapIdx.exploration]),
                     reserves: parseAndRound(row[mapIdx.reserves]),
                     development: parseAndRound(row[mapIdx.development]),
                     production: parseAndRound(row[mapIdx.production]),
                     engineering: parseAndRound(row[mapIdx.engineering]),
                     drilling: parseAndRound(row[mapIdx.drilling]),
                     averageScore: parseAndRound(row[mapIdx.averageScore]),
                   });
                 }
               }
               result.quality = newQualityData;
            }
          }
        }

        // 8. Parse "数据湖用户情况（董家勇）" (User Stats)
        const userSheetName = "数据湖用户情况（董家勇）";
        const wsUser = workbook.Sheets[userSheetName];
        if (wsUser) {
          const jsonData = XLSX.utils.sheet_to_json(wsUser, { header: 1 }) as any[][];
          const headerRowIndex = findHeaderRow(jsonData, ['用户总数', '活跃用户数']);
          
          if (headerRowIndex !== -1 && jsonData.length > headerRowIndex + 1) {
            const headerRow = jsonData[headerRowIndex].map(v => String(v).trim());
            const valueRow = jsonData[headerRowIndex + 1];
            
            const totalIdx = headerRow.indexOf('用户总数');
            const activeIdx = headerRow.indexOf('活跃用户数');
            
            if (totalIdx !== -1 && activeIdx !== -1) {
              const total = parseFloat(valueRow[totalIdx]) || 0;
              const active = parseFloat(valueRow[activeIdx]) || 0;
              let pct = 0;
              
              if (total > 0) {
                pct = parseFloat(((active / total) * 100).toFixed(2));
              }
              
              result.users = {
                total,
                active,
                percentage: pct,
                isEmpty: false
              };
            }
          }
        }

        // 9. Parse "数据应用情况（董家勇更新）"
        const appSheetName = "数据应用情况（董家勇更新）";
        const wsApp = workbook.Sheets[appSheetName];
        if (wsApp) {
          const jsonData = XLSX.utils.sheet_to_json(wsApp, { header: 1 }) as any[][];
          const headerRowIndex = findHeaderRow(jsonData, ['接口数量', '调用系统次数', '推送数据数量']);

          if (headerRowIndex !== -1 && jsonData.length > headerRowIndex + 1) {
             const headerRow = jsonData[headerRowIndex].map(v => String(v).trim());
             const valueRow = jsonData[headerRowIndex + 1];

             const interfaceIdx = headerRow.indexOf('接口数量');
             const callsIdx = headerRow.indexOf('调用系统次数');
             const pushIdx = headerRow.indexOf('推送数据数量');

             const stats = {
               interfaceCount: 0,
               systemCalls: 0,
               pushedVolume: 0,
               isEmpty: false
             };

             // Handle potential strings with commas by replacing them before parsing
             if (interfaceIdx !== -1) {
               const val = String(valueRow[interfaceIdx]).replace(/,/g, '');
               stats.interfaceCount = parseFloat(val) || 0;
             }
             if (callsIdx !== -1) {
               const val = String(valueRow[callsIdx]).replace(/,/g, '');
               stats.systemCalls = parseFloat(val) || 0;
             }
             if (pushIdx !== -1) {
               const val = String(valueRow[pushIdx]).replace(/,/g, '');
               stats.pushedVolume = parseFloat(val) || 0;
             }

             result.appStats = stats;
          }
        }

        // 10. Parse "场景推动情况（黄凌宇更新）" (Scenario Promotion)
        const scenarioSheetName = "场景推动情况（黄凌宇更新）";
        const wsScenario = workbook.Sheets[scenarioSheetName];
        if (wsScenario) {
           const jsonData = XLSX.utils.sheet_to_json(wsScenario, { header: 1 }) as any[][];
           // Headers: 专业, 未完成, 已完成
           const headerRowIndex = findHeaderRow(jsonData, ['专业', '未完成', '已完成']);

           if (headerRowIndex !== -1) {
              const headerRow = jsonData[headerRowIndex].map(v => String(v).trim());
              const categoryIdx = headerRow.indexOf('专业');
              const unfinishedIdx = headerRow.indexOf('未完成');
              const finishedIdx = headerRow.indexOf('已完成');

              if (categoryIdx !== -1 && unfinishedIdx !== -1 && finishedIdx !== -1) {
                 const scenarios: ScenarioItem[] = [];
                 for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const category = String(row[categoryIdx]).trim();
                    // Skip "Total" row, we calculate it in the component
                    if (category === '总计') continue;
                    // Stop if category is undefined or empty
                    if (!category || category === 'undefined') continue;

                    const unfinished = parseFloat(row[unfinishedIdx]) || 0;
                    const finished = parseFloat(row[finishedIdx]) || 0;

                    scenarios.push({
                      category,
                      unfinished,
                      finished
                    });
                 }
                 result.scenarios = scenarios;
              }
           }
        }
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
