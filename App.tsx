
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, Download, Database, Activity, Layers, PieChart as PieChartIcon, Lock, LogOut, UserCog, KeyRound, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import DashboardCard from './components/DashboardCard';
import { 
  VolumeDonutChart, 
  SixNodesWidget, 
  FeedbackPieChart, 
  QualityChart, 
  UserGaugeChart, 
  ScenarioBarChart
} from './components/Charts';
import { DEFAULT_DATA } from './constants';
import { DashboardData } from './types';
import { parseExcelFile } from './services/dataService';
// 👉 新增：导入 Netlify 接口函数
import { saveDataToNetlify, getLatestDataFromNetlify } from './netlifyApi';

// --- Helper Components ---

// 1. Editable Text Component
interface EditableTextProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  inputClassName?: string;
  readOnly?: boolean;
}

const EditableText: React.FC<EditableTextProps> = ({ value, onChange, className = "", inputClassName = "", readOnly = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue.trim()) {
      onChange(tempValue);
    } else {
      setTempValue(value); // Reset if empty
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(value);
    }
  };

  const handleClick = () => {
    if (!readOnly) {
      setIsEditing(true);
    }
  };

  if (isEditing && !readOnly) {
    return (
      <input
        ref={inputRef}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`outline-none bg-transparent border-b border-current min-w-[2em] ${inputClassName}`}
        style={{ width: `${Math.max(tempValue.length, 2)}ch` }}
      />
    );
  }

  return (
    <span 
      onClick={handleClick}
      className={`${!readOnly ? 'cursor-pointer border-b border-transparent hover:border-current hover:opacity-80' : 'cursor-default'} transition-all ${className}`}
      title={readOnly ? "" : "点击编辑"}
    >
      {value}
    </span>
  );
};

// 2. Modal Base Component
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-700">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);
  
  // Auth State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);
  const [credentials, setCredentials] = useState({ username: 'admin', password: 'admin' });
  
  // Login Form State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  
  // Change Password Form State
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Footer State
  const [footerSource, setFooterSource] = useState("???");
  const [footerTime, setFooterTime] = useState("???");
  const [footerScope, setFooterScope] = useState("???");
  
  // Helper to get current date in YYYY年MM月 format
  const getCurrentDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}年${now.getMonth() + 1}月`;
  };

  // Editable State
  const [title, setTitle] = useState("深圳分公司数据治理关键指标");
  const [dashboardDate, setDashboardDate] = useState(getCurrentDateString());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    try {
      const parsedData = await parseExcelFile(file);
      setData(parsedData); // 你原本的更新仪表盘数据逻辑
      
      // 你原本的更新页脚信息逻辑（全部保留，不修改）
      setFooterSource(file.name);
      const now = new Date();
      setFooterTime(`${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`);
      setFooterScope("有限深圳数据治理指标");

      // 👉 新增：调用 Netlify 接口，保存解析后的数据（长效存储）
      await saveDataToNetlify(parsedData);

      // 👉 可选：修改提示语，让你知道数据已保存（也可以保留原提示）
      alert("Excel 解析成功！");
    } catch (error) {
      console.error("File parsing error:", error);
      alert("解析或保存 Excel 文件失败。");
    }
  }
};

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Export Page to PNG Image
  const handleExportImage = async () => {
    try {
      const element = document.body;
      // Capture the entire body with high scale for clarity
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f1f5f9', // Match background color
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Data_Governance_Dashboard_${new Date().toISOString().slice(0,10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Export failed:", error);
      alert("导出图片失败，请检查控制台日志。");
    }
  };

  // Auth Handlers
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser === credentials.username && loginPass === credentials.password) {
      setIsAdmin(true);
      setShowLogin(false);
      setLoginUser('');
      setLoginPass('');
    } else {
      alert("用户名或密码错误");
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPass !== credentials.password) {
      alert("旧密码错误");
      return;
    }
    if (newPass !== confirmPass) {
      alert("两次输入的新密码不一致");
      return;
    }
    if (!newPass) {
      alert("密码不能为空");
      return;
    }
    setCredentials(prev => ({ ...prev, password: newPass }));
    setShowChangePass(false);
    setOldPass('');
    setNewPass('');
    setConfirmPass('');
    alert("密码修改成功");
  };

  const logout = () => {
    setIsAdmin(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 text-slate-700">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            <EditableText 
              value={title} 
              onChange={setTitle} 
              readOnly={!isAdmin}
            />
            <span className="text-xs font-normal text-white bg-blue-500 px-2 py-0.5 rounded-full ml-2 flex items-center justify-center">
               <EditableText 
                 value={dashboardDate} 
                 onChange={setDashboardDate}
                 readOnly={!isAdmin}
               />
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-8">Data Governance Dashboard & Visualization</p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <>
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-200 mr-2">
                <UserCog className="w-3 h-3" />
                管理员模式
              </div>
              
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              
              <button 
                onClick={triggerUpload}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-md shadow-sm transition-colors text-sm font-medium"
                title="上传数据"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">上传数据</span>
              </button>
              
              <button 
                onClick={handleExportImage}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md shadow-sm transition-colors text-sm font-medium"
                title="导出页面"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">导出页面</span>
              </button>

              <button 
                onClick={() => setShowChangePass(true)}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-md shadow-sm transition-colors text-sm font-medium"
                title="修改密码"
              >
                <KeyRound className="w-4 h-4" />
              </button>

              <button 
                onClick={logout}
                className="flex items-center gap-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 px-3 py-2 rounded-md shadow-sm transition-colors text-sm font-medium ml-2"
                title="退出管理员模式"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md shadow-sm transition-colors text-sm font-medium"
            >
              <Lock className="w-4 h-4" />
              管理员维护
            </button>
          )}
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:auto-rows-[290px]">
        
        {/* Row 1, Col 1: Stack of Volume & New/History */}
        <div className="flex flex-col gap-4 h-full">
          <DashboardCard title="数据湖数据总量" height="h-auto" className="flex-1 shrink-0 min-h-[100px]">
            <div className="flex flex-col items-center justify-center h-full">
              <h2 className="text-3xl font-extrabold text-blue-600 tracking-tight">
                {typeof data.volume.total === 'number' 
                  ? data.volume.total.toLocaleString() 
                  : data.volume.total
                }
                <span className="text-lg font-medium text-slate-400 ml-1">{data.volume.unit}</span>
              </h2>
            </div>
          </DashboardCard>

          <DashboardCard title="新增、历史数据量" height="h-auto" className="flex-1 shrink-0 min-h-[100px]">
             <VolumeDonutChart data={data.volume} />
          </DashboardCard>
        </div>

        {/* Row 1, Col 2: Six Nodes */}
        <DashboardCard title="六个节点" height="h-full" className="min-h-[200px]">
          <SixNodesWidget data={data.nodes} />
        </DashboardCard>

        {/* Row 1, Col 3: Feedback */}
        <DashboardCard title="问题反馈" height="h-full" className="min-h-[200px]">
          <FeedbackPieChart data={data.feedback} />
        </DashboardCard>

        {/* Row 1, Col 4: Quality */}
        <DashboardCard title="质量报告" height="h-full" className="min-h-[200px]">
           <QualityChart data={data.quality} />
        </DashboardCard>


        {/* Row 2, Col 1: Split Main & Business Data */}
        <div className="flex flex-row gap-2 h-full min-h-[200px]">
          <DashboardCard title="主数据" height="h-full" className="flex-1 w-0 overflow-hidden">
            <div className="flex flex-col justify-between h-full py-1">
              {data.mainDataList.map((item, idx) => (
                <div key={idx} className="flex flex-row justify-between items-center pb-1">
                  <span className="text-xs text-slate-500 leading-tight truncate mr-1">{item.label}</span>
                  <span className="text-sm text-blue-600 font-bold font-mono shrink-0">{item.value}</span>
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="业务数据" height="h-full" className="flex-1 w-0 overflow-hidden">
             <div className="flex flex-col justify-between h-full py-1">
               {data.businessDataList.map((item, idx) => (
                 <div key={idx} className="flex flex-row justify-between items-center pb-1">
                   <span className="text-xs text-slate-500 leading-tight truncate mr-1">{item.label}</span>
                   <span className={`text-sm font-bold font-mono shrink-0 ${item.isHighlight ? 'text-sky-500' : 'text-slate-700'}`}>
                     {item.value}
                   </span>
                 </div>
               ))}
             </div>
          </DashboardCard>
        </div>

        {/* Row 2, Col 2: Users */}
        <DashboardCard title="数据湖用户" height="h-full" className="min-h-[200px]">
           <UserGaugeChart data={data.users} />
        </DashboardCard>

        {/* Row 2, Col 3: Apps */}
        <DashboardCard title="数据应用" height="h-full" className="min-h-[200px]">
           {!data.appStats.isEmpty && (
             <div className="flex flex-col justify-evenly h-full px-2 py-0">
                <div className="flex flex-col items-center pb-1">
                   <span className="text-sm text-slate-500 font-medium mb-0">接口数量</span>
                   <span className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">
                     {data.appStats.interfaceCount.toLocaleString()}
                   </span>
                </div>
                <div className="flex flex-col items-center pb-1 pt-1">
                   <span className="text-sm text-slate-500 font-medium mb-0">调用系统次数</span>
                   <span className="text-3xl font-extrabold text-blue-600 tracking-tight leading-none">
                     {data.appStats.systemCalls.toLocaleString()}
                   </span>
                </div>
                <div className="flex flex-col items-center pt-1">
                   <span className="text-sm text-slate-500 font-medium mb-0">推送数据数量</span>
                   <span className="text-3xl font-extrabold text-sky-500 tracking-tight leading-none">
                     {data.appStats.pushedVolume.toLocaleString()}
                   </span>
                </div>
             </div>
           )}
        </DashboardCard>

        {/* Row 2, Col 4: Scenarios */}
        <DashboardCard title="场景推动" height="h-full" className="min-h-[200px]">
           <ScenarioBarChart data={data.scenarios} />
        </DashboardCard>
        
      </div>

      {/* Footer Info */}
      <footer className="mt-6 text-center text-xs text-slate-400 flex justify-center gap-8">
        <div className="flex items-center gap-1">
          <span className="font-semibold">数据来源:</span>
          <EditableText value={footerSource} onChange={setFooterSource} readOnly={!isAdmin} />
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold">统计时间:</span>
          <EditableText value={footerTime} onChange={setFooterTime} readOnly={!isAdmin} />
        </div>
        <div className="flex items-center gap-1">
           <span className="font-semibold">统计范围:</span>
           <EditableText value={footerScope} onChange={setFooterScope} readOnly={!isAdmin} />
        </div>
      </footer>

      {/* Login Modal */}
      <Modal isOpen={showLogin} onClose={() => setShowLogin(false)} title="管理员登录">
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
            <input
              type="text"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入用户名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
            <input
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入密码"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-colors mt-2">
            登录
          </button>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={showChangePass} onClose={() => setShowChangePass(false)} title="修改密码">
        <form onSubmit={handleChangePasswordSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">旧密码</label>
            <input
              type="password"
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">新密码</label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">确认新密码</label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-colors mt-2">
            确认修改
          </button>
        </form>
      </Modal>

    </div>
  );
};

export default App;
