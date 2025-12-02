
import { DashboardData } from './types';

export const THEME = {
  colors: {
    primary: '#0ea5e9', // Sky 500
    secondary: '#3b82f6', // Blue 500
    accent: '#f43f5e', // Rose 500
    success: '#10b981', // Emerald 500
    warning: '#f59e0b', // Amber 500
    text: '#334155', // Slate 700
    gridLine: '#e2e8f0',
  },
  charts: {
    blue: '#3b82f6',
    cyan: '#06b6d4',
    pink: '#f472b6',
    orange: '#fb923c',
    navy: '#1e3a8a',
    lightBlue: '#93c5fd',
  }
};

export const DEFAULT_DATA: DashboardData = {
  volume: {
    total: '???',
    new: '???',
    history: '???',
    unit: '万'
  },
  nodes: [], // Empty by default to hide chart when no data is uploaded
  feedback: [
    { name: '数据湖', value: 50, color: '#e2e8f0', isPlaceholder: true, displayValue: '???' }, // Grey 200
    { name: '闭环管理', value: 50, color: '#cbd5e1', isPlaceholder: true, displayValue: '???' }, // Grey 300
  ],
  quality: [], // Empty by default as requested
  mainDataList: [
    { label: '井主数据', value: '???' },
    { label: '样品主数据', value: '???' },
    { label: '地质油藏主数据', value: '???' },
    { label: '物探工区主数据', value: '???' },
    { label: '设备设施主数据', value: '???' },
    { label: '生产管理主数据', value: '???' },
    { label: '其他主数据', value: '???' },
  ],
  businessDataList: [
    { label: '勘探业务数据', value: '???', isHighlight: true },
    { label: '储量业务数据', value: '???', isHighlight: true },
    { label: '开发业务数据', value: '???', isHighlight: true },
    { label: '生产业务数据', value: '???', isHighlight: true },
    { label: '工程建设业务数据', value: '???', isHighlight: true },
    { label: '钻完井业务数据', value: '???', isHighlight: true },
  ],
  users: {
    active: 0,
    total: 0,
    percentage: 0,
    isEmpty: true // Default to empty so it doesn't show mock data
  },
  appStats: {
    systemCalls: 0,
    interfaceCount: 0,
    pushedVolume: 0,
    isEmpty: true
  },
  scenarios: [] // Empty by default so it hides when no data
};
