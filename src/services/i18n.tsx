import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSettings } from './settingsService';

export type Language = 'zh-TW' | 'zh-CN' | 'en';

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

export const translations: Translations = {
  // Navigation & General
  dashboard: { 'zh-TW': '資產總覽', 'zh-CN': '资产总览', 'en': 'Overview' },
  portfolio: { 'zh-TW': '財富自由', 'zh-CN': '财富自由', 'en': 'Wealth Freedom' },
  betterleaf: { 'zh-TW': '好葉持股', 'zh-CN': '好叶持股', 'en': 'Betterleaf Portfolio' },
  planner: { 'zh-TW': '投資規劃', 'zh-CN': '投资规划', 'en': 'Planner' },
  history: { 'zh-TW': '歷史記錄', 'zh-CN': '历史记录', 'en': 'History' },
  settings: { 'zh-TW': '設定', 'zh-CN': '设定', 'en': 'Settings' },
  currency: { 'zh-TW': '貨幣', 'zh-CN': '货币', 'en': 'Currency' },
  language: { 'zh-TW': '語言', 'zh-CN': '语言', 'en': 'Language' },
  logout: { 'zh-TW': '登出', 'zh-CN': '登出', 'en': 'Logout' },
  vipBadge: { 'zh-TW': 'VIP 每日更新', 'zh-CN': 'VIP 每日更新', 'en': 'VIP Daily' },
  portfolio_credits: { 'zh-TW': '額度', 'zh-CN': '额度', 'en': 'Credits' },
  publishGlobal: { 'zh-TW': '發佈到全局', 'zh-CN': '发布到全局', 'en': 'Publish to Global' },
  refreshData: { 'zh-TW': '刷新市場數據', 'zh-CN': '刷新市场数据', 'en': 'Refresh Market Data' },
  betaWeighted: { 'zh-TW': '貝塔加權', 'zh-CN': '贝塔加权', 'en': 'Beta Weighted' },
  avgPe: { 'zh-TW': '加權平均本益比', 'zh-CN': '加权平均本益比', 'en': 'Avg. P/E' },
  totalValue: { 'zh-TW': '總價值', 'zh-CN': '总价值', 'en': 'Total Value' },
  asset: { 'zh-TW': '資產', 'zh-CN': '资产', 'en': 'Asset' },
  quantity: { 'zh-TW': '數量', 'zh-CN': '数量', 'en': 'Quantity' },
  avgPrice: { 'zh-TW': '平均成本', 'zh-CN': '平均成本', 'en': 'Avg. Price' },
  marketPrice: { 'zh-TW': '市場價格', 'zh-CN': '市场价格', 'en': 'Market Price' },
  profitLoss: { 'zh-TW': '盈虧', 'zh-CN': '盈亏', 'en': 'Profit/Loss' },
  totalUsd: { 'zh-TW': '總值 (USD)', 'zh-CN': '总值 (USD)', 'en': 'Total (USD)' },
  noHoldings: { 'zh-TW': '尚無持倉紀錄。', 'zh-CN': '尚无持仓纪录。', 'en': 'No holdings yet.' },
  updatePortfolio: { 'zh-TW': '更新資產配置', 'zh-CN': '更新资产配置', 'en': 'Update Portfolio' },
  updatePortfolioDesc: { 'zh-TW': '上傳資產截圖或交易確認單以同步數據。', 'zh-CN': '上传资产截图或交易确认单以同步数据。', 'en': 'Upload a screenshot of your holdings or a trade confirmation to sync.' },
  analyzingImage: { 'zh-TW': '正在分析圖片...', 'zh-CN': '正在分析图片...', 'en': 'Analyzing image...' },
  clickDragPaste: { 'zh-TW': '點擊、拖拽或貼上 (Ctrl+V)', 'zh-CN': '点击、拖拽或贴上 (Ctrl+V)', 'en': 'Click, drag, or Paste (Ctrl+V)' },
  fileTypes: { 'zh-TW': '支援 PNG, JPG，最大 10MB', 'zh-CN': '支持 PNG, JPG，最大 10MB', 'en': 'PNG, JPG up to 10MB' },
  confirmData: { 'zh-TW': '確認數據', 'zh-CN': '确认数据', 'en': 'Confirm Data' },
  merge: { 'zh-TW': '合併 (新增/更新)', 'zh-CN': '合并 (新增/更新)', 'en': 'Merge (Add/Update)' },
  replaceAll: { 'zh-TW': '全部替換', 'zh-CN': '全部替换', 'en': 'Replace All' },
  detectedHoldings: { 'zh-TW': '偵測到的持倉', 'zh-CN': '侦测到的持仓', 'en': 'Detected Holdings' },
  detectedTrade: { 'zh-TW': '偵測到的交易', 'zh-CN': '侦测到的交易', 'en': 'Detected Trade' },
  symbol: { 'zh-TW': '代號', 'zh-CN': '代号', 'en': 'Symbol' },
  tradeType: { 'zh-TW': '交易類型', 'zh-CN': '交易类型', 'en': 'Trade Type' },
  fxRate: { 'zh-TW': '匯率 (對 USD)', 'zh-CN': '汇率 (对 USD)', 'en': 'FX Rate (to USD)' },
  sector: { 'zh-TW': '板塊', 'zh-CN': '板块', 'en': 'Sector' },
  country: { 'zh-TW': '國家', 'zh-CN': '国家', 'en': 'Country' },
  confirm: { 'zh-TW': '確認', 'zh-CN': '确认', 'en': 'Confirm' },
  
  assetType: { 'zh-TW': '資產類型', 'zh-CN': '资产类型', 'en': 'Asset Type' },
  stock: { 'zh-TW': '股票', 'zh-CN': '股票', 'en': 'Stock' },
  etf: { 'zh-TW': 'ETF', 'zh-CN': 'ETF', 'en': 'ETF' },
  fund: { 'zh-TW': '基金', 'zh-CN': '基金', 'en': 'Fund' },
  crypto: { 'zh-TW': '加密貨幣', 'zh-CN': '加密货币', 'en': 'Crypto' },
  bond: { 'zh-TW': '債券', 'zh-CN': '债券', 'en': 'Bond' },
  others: { 'zh-TW': '其他', 'zh-CN': '其他', 'en': 'Others' },
  quickActions: { 'zh-TW': '快速操作', 'zh-CN': '快速操作', 'en': 'Quick Actions' },
  addManualAsset: { 'zh-TW': '手動新增資產', 'zh-CN': '手动新增资产', 'en': 'Add Manual Asset' },
  exportData: { 'zh-TW': '匯出數據', 'zh-CN': '导出数据', 'en': 'Export Data' },
  importData: { 'zh-TW': '匯入數據', 'zh-CN': '导入数据', 'en': 'Import Data' },
  
  resetPortfolio: { 'zh-TW': '重置投資組合', 'zh-CN': '重置投资组合', 'en': 'Reset Portfolio' },
  resetPortfolioTitle: { 'zh-TW': '重置投資組合', 'zh-CN': '重置投资组合', 'en': 'Reset Portfolio' },
  resetPortfolioMsg: { 'zh-TW': '您確定要清除所有投資組合和交易數據嗎？此操作無法撤銷。', 'zh-CN': '您确定要清除所有投资组合和交易数据吗？此操作无法撤销。', 'en': 'Are you sure you want to clear all portfolio and transaction data? This action cannot be undone.' },
  
  transactionHistory: { 'zh-TW': '交易歷史', 'zh-CN': '交易历史', 'en': 'Transaction History' },
  transactionHistoryDesc: { 'zh-TW': '所有投資組合更新和交易的完整日誌。', 'zh-CN': '所有投资组合更新和交易的完整日志。', 'en': 'A complete log of all your portfolio updates and trades.' },
  date: { 'zh-TW': '日期', 'zh-CN': '日期', 'en': 'Date' },
  type: { 'zh-TW': '類型', 'zh-CN': '类型', 'en': 'Type' },
  
  ofPortfolio: { 'zh-TW': '佔投資組合', 'zh-CN': '占投资组合', 'en': 'of portfolio' },
  uploadScreenshotToSeeAllocation: { 'zh-TW': '上傳截圖以查看分配', 'zh-CN': '上传截图以查看分配', 'en': 'Upload a screenshot to see allocation' },
  assetDetails: { 'zh-TW': '資產詳情', 'zh-CN': '资产详情', 'en': 'Asset Details' },
  holdingsIn: { 'zh-TW': '在 {category} 的持倉', 'zh-CN': '在 {category} 的持仓', 'en': 'Holdings in {category}' },
  holdingsOverview: { 'zh-TW': '持倉概覽', 'zh-CN': '持仓概览', 'en': 'Holdings Overview' },
  ofTotal: { 'zh-TW': '佔總額', 'zh-CN': '占总额', 'en': 'of total' },
  
  // Dashboard
  totalWealth: { 'zh-TW': '總資產價值', 'zh-CN': '总资产价值', 'en': 'Total Wealth' },
  totalProfitLoss: { 'zh-TW': '持倉總虧盈', 'zh-CN': '持仓总亏盈', 'en': 'Total Profit/Loss' },
  wealthFreedomProgress: { 'zh-TW': '財富自由進度', 'zh-CN': '财富自由进度', 'en': 'Wealth Freedom Progress' },
  monthlyInvestmentProgress: { 'zh-TW': '本月定投進度', 'zh-CN': '本月定投进度', 'en': 'Monthly Investment Progress' },
  dividendYield: { 'zh-TW': '預計股息率', 'zh-CN': '预计股息率', 'en': 'Est. Dividend Yield' },
  dailyChange: { 'zh-TW': '今日變動', 'zh-CN': '今日变动', 'en': 'Daily Change' },
  riskLevel: { 'zh-TW': '風險等級', 'zh-CN': '风险等级', 'en': 'Risk Level' },
  assetAllocation: { 'zh-TW': '資產比例', 'zh-CN': '资产比例', 'en': 'Asset Allocation' },
  recentTransactions: { 'zh-TW': '近期交易', 'zh-CN': '近期交易', 'en': 'Recent Transactions' },
  noTransactions: { 'zh-TW': '尚無交易紀錄', 'zh-CN': '尚无交易纪录', 'en': 'No transactions yet' },
  uploadPortfolio: { 'zh-TW': '上傳資產截圖', 'zh-CN': '上传资产截图', 'en': 'Upload Portfolio' },
  analyzing: { 'zh-TW': '正在分析中...', 'zh-CN': '正在分析中...', 'en': 'Analyzing...' },
  ticker: { 'zh-TW': '標的', 'zh-CN': '标的', 'en': 'Ticker' },
  
  // Betterleaf Portfolio
  exclusiveInsights: { 'zh-TW': '獨家洞察', 'zh-CN': '独家洞察', 'en': 'Exclusive Insights' },
  betterleafTitle: { 'zh-TW': '好葉持股分析', 'zh-CN': '好叶持股分析', 'en': 'Betterleaf Portfolio' },
  betterleafDesc: { 'zh-TW': '追蹤好葉的長期價值投資組合與當前關注標的。基於基本面分析、護城河評估與未來成長潛力的深度洞察。', 'zh-CN': '追踪好叶的长期价值投资组合与当前关注标的。基于基本面分析、护城河评估与未来成长潜力的深度洞察。', 'en': 'Track Betterleaf\'s long-term value portfolio and current watchlist. Deep insights based on fundamental analysis, moat assessment, and future growth potential.' },
  portfolioValue: { 'zh-TW': '組合價值', 'zh-CN': '组合价值', 'en': 'Portfolio Value' },
  avgUpside: { 'zh-TW': '平均潛力', 'zh-CN': '平均潜力', 'en': 'Avg. Upside' },
  currentHoldings: { 'zh-TW': '當前持倉清單', 'zh-CN': '当前持仓清单', 'en': 'Current Holdings' },
  watchlistTitle: { 'zh-TW': '當前關注清單', 'zh-CN': '当前关注清单', 'en': 'Watchlist' },
  stocksCount: { 'zh-TW': '個標的', 'zh-CN': '个标的', 'en': 'STOCKS' },
  price: { 'zh-TW': '價格', 'zh-CN': '价格', 'en': 'Price' },
  marketCap: { 'zh-TW': '市值', 'zh-CN': '市值', 'en': 'Market Cap' },
  weight: { 'zh-TW': '權重', 'zh-CN': '权重', 'en': 'Weight' },
  upside: { 'zh-TW': '潛力', 'zh-CN': '潜力', 'en': 'Upside' },
  operation: { 'zh-TW': '操作', 'zh-CN': '操作', 'en': 'Operation' },
  fwdPe: { 'zh-TW': '預測本益比', 'zh-CN': '预测本益比', 'en': 'Fwd PE' },
  thesis: { 'zh-TW': '投資邏輯', 'zh-CN': '投资逻辑', 'en': 'Thesis' },
  actions: { 'zh-TW': '操作', 'zh-CN': '操作', 'en': 'Actions' },
  addStock: { 'zh-TW': '新增標的', 'zh-CN': '新增标的', 'en': 'Add Stock' },
  editData: { 'zh-TW': '編輯數據', 'zh-CN': '编辑数据', 'en': 'Edit Data' },
  cancelEdit: { 'zh-TW': '取消編輯', 'zh-CN': '取消编辑', 'en': 'Cancel' },
  saveChanges: { 'zh-TW': '保存更改', 'zh-CN': '保存更改', 'en': 'Save' },
  hiddenCompany: { 'zh-TW': '隱藏公司名稱', 'zh-CN': '隐藏公司名称', 'en': 'Hidden Company Name' },
  lockedThesis: { 'zh-TW': '好葉對此標的的深度分析與操作邏輯僅限專業版用戶查看。', 'zh-CN': '好叶对此标的的深度分析与操作逻辑仅限专业版用户查看。', 'en': 'Betterleaf\'s deep analysis and logic for this ticker are exclusive to PRO users.' },
  moreHidden: { 'zh-TW': '還有 {n} 個隱藏標的', 'zh-CN': '还有 {n} 個隐藏标的', 'en': '{n} more hidden stocks' },
  wantMore: { 'zh-TW': '想看更多好葉的深度分析？', 'zh-CN': '想看更多好叶的深度分析？', 'en': 'Want more deep analysis?' },
  unlockDesc: { 'zh-TW': '解鎖專業版即可查看完整持股清單、買賣點位分析以及好葉的私房研究報告。', 'zh-CN': '解锁专业版即可查看完整持股清单、买卖点位分析以及好叶的私房研究报告。', 'en': 'Unlock PRO to see the full portfolio, entry/exit analysis, and exclusive research reports.' },
  unlockButton: { 'zh-TW': '立即解鎖完整清單', 'zh-CN': '立即解锁完整清单', 'en': 'Unlock Full List' },
  unlockStrategy: { 'zh-TW': '解鎖完整投資策略與深度分析', 'zh-CN': '解锁完整投资策略与深度分析', 'en': 'Unlock Full Strategy & Analysis' },
  joinCommunity: { 'zh-TW': '立即加入課程社群，獲取好葉的實戰標的報告與完整投資機會解析。', 'zh-CN': '立即加入课程社群，获取好叶的实战标的报告与完整投资机会解析。', 'en': 'Join the community now for real-time reports and full investment opportunity analysis.' },
  goToCommunity: { 'zh-TW': '立即前往社群', 'zh-CN': '立即前往社群', 'en': 'Go to Community' },
  target: { 'zh-TW': '目標', 'zh-CN': '目标', 'en': 'Target' },
  
  // App Modals & Alerts
  removeAsset: { 'zh-TW': '移除資產', 'zh-CN': '移除资产', 'en': 'Remove Asset' },
  removeAssetConfirm: { 'zh-TW': '您確定要從投資組合中移除 {symbol} 嗎？', 'zh-CN': '您确定要从投资组合中移除 {symbol} 吗？', 'en': 'Are you sure you want to remove {symbol} from your portfolio?' },
  deleteTransaction: { 'zh-TW': '刪除交易', 'zh-CN': '删除交易', 'en': 'Delete Transaction' },
  deleteTransactionConfirm: { 'zh-TW': '您確定要刪除此交易嗎？（注意：這不會自動還原投資組合的變動）', 'zh-CN': '您确定要删除此交易吗？（注意：这不会自动还原投资组合的变动）', 'en': 'Are you sure you want to delete this transaction? (Note: This won\'t automatically revert portfolio changes)' },
  publishGlobalTitle: { 'zh-TW': '發佈到全局持股', 'zh-CN': '发布到全局持股', 'en': 'Publish to Global Portfolio' },
  publishGlobalConfirm: { 'zh-TW': '您確定要將當前 Dashboard 的持倉數據發佈到「好葉持股」頁面嗎？這將覆蓋所有學生看到的示範數據。', 'zh-CN': '您确定要将当前 Dashboard 的持仓数据发布到「好叶持股」页面吗？这将覆盖所有学生看到的示范数据。', 'en': 'Are you sure you want to publish current dashboard data to "Betterleaf Portfolio"? This will overwrite the demo data seen by all students.' },
  publishSuccess: { 'zh-TW': '發佈成功！數據已同步至「好葉持股」頁面。', 'zh-CN': '发布成功！数据已同步至「好叶持股」页面。', 'en': 'Publish successful! Data synced to "Betterleaf Portfolio" page.' },
  appManager: { 'zh-TW': 'Leafolio 定投管家', 'zh-CN': 'Leafolio 定投管家', 'en': 'Leafolio' },
  wealthGoal: { 'zh-TW': '財富自由數字', 'zh-CN': '财富自由数字', 'en': 'Wealth Freedom Number' },
  wealthGoalDesc: { 'zh-TW': '此模擬器計算您的投資回報何時將超過經通膨調整後的支出。當線條交叉時，您就達到了「財務獨立」——您的錢比您更努力工作。', 'zh-CN': '此模拟器计算您的投资回报何时将超过经通膨调整后的支出。当线条交叉时，您就达到了“财务独立”——您的钱比您更努力工作。', 'en': 'This simulator calculates when your investment returns will exceed your inflation-adjusted expenses. When the lines cross, you\'ve reached "Financial Independence" — your money works harder than you do.' },
  calculated: { 'zh-TW': '提早退休', 'zh-CN': '提早退休', 'en': 'Early Retirement' },
  manual: { 'zh-TW': '自定目標', 'zh-CN': '自定目标', 'en': 'Custom Goal' },
  manualGoalAmount: { 'zh-TW': '自定目標金額 ($)', 'zh-CN': '自定目标金额 ($)', 'en': 'Custom Goal Amount ($)' },
  enterGoal: { 'zh-TW': '輸入您的目標...', 'zh-CN': '输入您的目标...', 'en': 'Enter your goal...' },
  calculatedGoalAmount: { 'zh-TW': '計算目標金額', 'zh-CN': '计算目标金额', 'en': 'Calculated Goal Amount' },
  calculatedGoalDesc: { 'zh-TW': '根據您的支出和回報，這是您的被動收入覆蓋您的生活方式的時候。', 'zh-CN': '根据您的支出和回报，这是您的被动收入覆盖您的生活方式的时候。', 'en': 'Based on your expenses and returns, this is when your passive income covers your lifestyle.' },
  nextTarget: { 'zh-TW': '下一個目標', 'zh-CN': '下一个目标', 'en': 'Next Target' },
  segmentProgress: { 'zh-TW': '階段進度', 'zh-CN': '阶段进度', 'en': 'Segment Progress' },
  overallJourney: { 'zh-TW': '總體進程', 'zh-CN': '总体进程', 'en': 'Overall Journey' },
  ultimateFreedomReached: { 'zh-TW': '已達到終極自由！', 'zh-CN': '已达到终极自由！', 'en': 'Ultimate Freedom Reached!' },
  wealthAchievementBadges: { 'zh-TW': '財富成就徽章', 'zh-CN': '财富成就徽章', 'en': 'Wealth Achievement Badges' },
  unlocked: { 'zh-TW': '已解鎖', 'zh-CN': '已解锁', 'en': 'Unlocked' },
  simulationSettings: { 'zh-TW': '模擬設定', 'zh-CN': '模拟设定', 'en': 'Simulation Settings' },
  monthlyExpenses: { 'zh-TW': '每月支出', 'zh-CN': '每月支出', 'en': 'Monthly Expenses' },
  inflationRate: { 'zh-TW': '通膨率', 'zh-CN': '通膨率', 'en': 'Inflation Rate' },
  monthlyContribution: { 'zh-TW': '每月投入', 'zh-CN': '每月投入', 'en': 'Monthly Contribution' },
  investmentReturn: { 'zh-TW': '投資回報率', 'zh-CN': '投资回报率', 'en': 'Investment Return' },
  currentPortfolio: { 'zh-TW': '目前投資組合', 'zh-CN': '目前投资组合', 'en': 'Current Portfolio' },
  growthProjection: { 'zh-TW': '增長預測 (30年)', 'zh-CN': '增长预测 (30年)', 'en': 'Growth Projection (30 Years)' },
  years: { 'zh-TW': '年', 'zh-CN': '年', 'en': 'Years' },
  investmentReturns: { 'zh-TW': '投資回報', 'zh-CN': '投资回报', 'en': 'Investment Returns' },
  annualExpenses: { 'zh-TW': '年度支出', 'zh-CN': '年度支出', 'en': 'Annual Expenses' },
  yearlyBreakdown: { 'zh-TW': '年度明細', 'zh-CN': '年度明细', 'en': 'Yearly Breakdown' },
  year: { 'zh-TW': '年份', 'zh-CN': '年份', 'en': 'Year' },
  annualReturns: { 'zh-TW': '年度回報', 'zh-CN': '年度回报', 'en': 'Annual Returns' },
  status: { 'zh-TW': '狀態', 'zh-CN': '状态', 'en': 'Status' },
  financialFree: { 'zh-TW': '財務自由', 'zh-CN': '财务自由', 'en': 'Financial Free' },
  returnsCoverExpenses: { 'zh-TW': '回報已過支出', 'zh-CN': '回报已过支出', 'en': 'Returns cover expenses' },
  building: { 'zh-TW': '累積中', 'zh-CN': '累積中', 'en': 'Building' },
  yearLabel: { 'zh-TW': '第 {n} 年', 'zh-CN': '第 {n} 年', 'en': 'Year {n}' },
  
  // Milestones
  milestone_0_title: { 'zh-TW': '起步階段', 'zh-CN': '起步阶段', 'en': 'Starting out' },
  milestone_0_desc: { 'zh-TW': '千里之行，始於足下。', 'zh-CN': '千里之行，始于足下。', 'en': 'Every journey begins with a single step.' },
  milestone_0_encouragement: { 'zh-TW': '起步穩健！接下來要為你的緊急預備金添磚加瓦。', 'zh-CN': '起步稳健！接下来要为你的紧急预备金添砖加瓦。', 'en': 'Starting strong! Next, build up your emergency fund.' },
  
  milestone_1_title: { 'zh-TW': '緊急預備金', 'zh-CN': '紧急预备金', 'en': 'Emergency fund' },
  milestone_1_desc: { 'zh-TW': '你有了安全網！', 'zh-CN': '你有了安全网！', 'en': 'You\'ve got a safety net!' },
  milestone_1_encouragement: { 'zh-TW': '防護網已成！現在是時候開始買下你的第一個自由月份了。', 'zh-CN': '防护网已成！现在是时候开始买下你的第一个自由月份了。', 'en': 'Safety net secured! Now it\'s time to buy your first month of freedom.' },
  
  milestone_2_title: { 'zh-TW': '一個月的自由', 'zh-CN': '一个月的自由', 'en': 'One month of freedom' },
  milestone_2_desc: { 'zh-TW': '你可以不工作生存一個月。', 'zh-CN': '你可以不工作生存一个月。', 'en': 'You could survive a month without working.' },
  milestone_2_encouragement: { 'zh-TW': '一個月自由達成！想像一下，如果這變成一輩子的咖啡免費...', 'zh-CN': '一个月自由达成！想象一下，如果这变成一辈子的咖啡免费...', 'en': 'One month of freedom reached! Imagine if this paid for your coffee forever...' },
  
  milestone_3_title: { 'zh-TW': '終身咖啡', 'zh-CN': '终身咖啡', 'en': 'Coffee for life' },
  milestone_3_desc: { 'zh-TW': '你的被動收入支付了你的日常咖啡。', 'zh-CN': '你的被动收入支付了你的日常咖啡。', 'en': 'Your passive income covers your daily caffeine.' },
  milestone_3_encouragement: { 'zh-TW': '咖啡自由了！但別停下，水電費還在等著被你的收益承包。', 'zh-CN': '咖啡自由了！但别停下，水电费还在等着被你的收益承包。', 'en': 'Coffee is free! But don\'t stop, utility bills are waiting to be covered.' },
  
  milestone_4_title: { 'zh-TW': '水電費英雄', 'zh-CN': '水电费英雄', 'en': 'Utility bill hero' },
  milestone_4_desc: { 'zh-TW': '水電費由投資回報支付！', 'zh-CN': '水电费由投资回报支付！', 'en': 'Electricity and water are on the house!' },
  milestone_4_encouragement: { 'zh-TW': '生活基礎已穩！下一個挑戰：讓網路費也變成免費資源。', 'zh-CN': '生活基础已稳！下一个挑战：让网络费也变成免费资源。', 'en': 'Basics secured! Next challenge: make the internet free too.' },
  
  milestone_5_title: { 'zh-TW': '網路費已付', 'zh-CN': '网络费已付', 'en': 'Internet paid' },
  milestone_5_desc: { 'zh-TW': '保持連線現在對你來說是免費的。', 'zh-CN': '保持连线现在对你来说是免费的。', 'en': 'Staying connected is now free for you.' },
  milestone_5_encouragement: { 'zh-TW': '連線自由！現在讓我們把目標轉向整整一季的完全自由。', 'zh-CN': '连线自由！现在让我们把目标转向整整一季的完全自由。', 'en': 'Connected! Now let\'s aim for a full quarter of freedom.' },
  
  milestone_6_title: { 'zh-TW': '三個月的自由', 'zh-CN': '三个月的自由', 'en': 'Three months of freedom' },
  milestone_6_desc: { 'zh-TW': '一年的四分之一是屬於你的。', 'zh-CN': '一年的四分之一是属于你的。', 'en': 'A quarter of a year is yours.' },
  milestone_6_encouragement: { 'zh-TW': '一季自由到手！保持紀律，超市購物車的帳單正等著被解決。', 'zh-CN': '一季自由到手！保持纪律，超市购物车的账单正等着被解决。', 'en': 'A quarter of freedom! Stay disciplined, grocery bills are next.' },
  
  milestone_7_title: { 'zh-TW': '買菜大師', 'zh-CN': '买菜大师', 'en': 'Grocery master' },
  milestone_7_desc: { 'zh-TW': '你的伙食費由你的投資資助。', 'zh-CN': '你的伙食费由你的投资资助。', 'en': 'Your meals are being funded by your investments.' },
  milestone_7_encouragement: { 'zh-TW': '伙食無憂！但真正的自由是擁有整整半年的主導權。', 'zh-CN': '伙食无忧！但真正的自由是拥有整整半年的主导权。', 'en': 'Meals covered! But true freedom is having half a year of control.' },
  
  milestone_8_title: { 'zh-TW': '六個月的自由', 'zh-CN': '六个月的自由', 'en': 'Six months of freedom' },
  milestone_8_desc: { 'zh-TW': '半年的完全自由。', 'zh-CN': '半年的完全自由。', 'en': 'Half a year of total liberty.' },
  milestone_8_encouragement: { 'zh-TW': '半年自由達成！再堅持一下，你的房租/房貸就要被征服了。', 'zh-CN': '半年自由达成！再坚持一下，你的房租/房贷就要被征服了。', 'en': 'Half a year reached! Keep going, your rent/mortgage is next.' },
  
  milestone_9_title: { 'zh-TW': '房租/房貸覆蓋', 'zh-CN': '房租/房贷覆盖', 'en': 'Rent/Mortgage covered' },
  milestone_9_desc: { 'zh-TW': '你頭頂上的屋頂是安全的。', 'zh-CN': '你头顶上的屋顶是安全的。', 'en': 'The roof over your head is secure.' },
  milestone_9_encouragement: { 'zh-TW': '居住自由！這是一大步，但離一整年的完全獨立還有距離。', 'zh-CN': '居住自由！这是一大步，但离一整年的完全独立还有距离。', 'en': 'Housing freedom! A big step, but still a way from a full year of independence.' },
  
  milestone_10_title: { 'zh-TW': '一年的自由', 'zh-CN': '一年的自由', 'en': 'One year of freedom' },
  milestone_10_desc: { 'zh-TW': '整整一年的生活，由你決定。', 'zh-CN': '整整一年的生活，由你决定。', 'en': 'A full year of life, on your terms.' },
  milestone_10_encouragement: { 'zh-TW': '一年自由！這很棒，但別忘了為未來的旅行夢想繼續累積。', 'zh-CN': '一年自由！这很棒，但别忘了为未来的旅行梦想继续累积。', 'en': 'One year of freedom! Great, but keep building for those travel dreams.' },
  
  milestone_11_title: { 'zh-TW': '旅行基金', 'zh-CN': '旅行基金', 'en': 'Travel fund' },
  milestone_11_desc: { 'zh-TW': '你的假期現在是自籌資金的。', 'zh-CN': '你的假期现在是自筹资金的。', 'en': 'Your vacations are now self-funding.' },
  milestone_11_encouragement: { 'zh-TW': '世界在招手！享受當下的同時，也別忘了為未來的品質升級做準備。', 'zh-CN': '世界在招手！享受当下的同时，也别忘了为未来的品质升级做准备。', 'en': 'The world awaits! Enjoy the moment, but prepare for future upgrades.' },
  
  milestone_12_title: { 'zh-TW': '奢華升級', 'zh-CN': '奢华升级', 'en': 'Luxury upgrade' },
  milestone_12_desc: { 'zh-TW': '你現在負擔得起更好的東西。', 'zh-CN': '你现在负担得起更好的东西。', 'en': 'You can afford the finer things now.' },
  milestone_12_encouragement: { 'zh-TW': '品質提升了！接下來的目標是買下整整兩年的生命主導權。', 'zh-CN': '品质提升了！接下来的目标是买下整整两年的生命主导权。', 'en': 'Quality upgraded! Next: buy two full years of life control.' },
  
  milestone_13_title: { 'zh-TW': '兩年的自由', 'zh-CN': '两年的自由', 'en': 'Two years of freedom' },
  milestone_13_desc: { 'zh-TW': '你已經完成了一半的迷你退休。', 'zh-CN': '你已经完成了一半的迷你退休。', 'en': 'You\'re halfway to a mini-retirement.' },
  milestone_13_encouragement: { 'zh-TW': '兩年自由！你已經走了一半，離終極的 Lean FIRE 只有幾步之遙。', 'zh-CN': '两年自由！你已经走了一半，离终极的 Lean FIRE 只有几步之遥。', 'en': 'Two years! You\'re halfway there, just steps from Lean FIRE.' },
  
  milestone_14_title: { 'zh-TW': '簡約財務自由 (Lean FIRE)', 'zh-CN': '简约财务自由 (Lean FIRE)', 'en': 'Lean FIRE' },
  milestone_14_desc: { 'zh-TW': '你的基本需求永遠得到滿足。', 'zh-CN': '你的基本需求永远得到满足。', 'en': 'Your basic needs are met forever.' },
  milestone_14_encouragement: { 'zh-TW': '生存無憂！現在是時候衝刺，為更長遠的五年自由打下基礎。', 'zh-CN': '生存无忧！现在是时候冲刺，为更长远的五年自由打下基础。', 'en': 'Survival secured! Now sprint for five years of freedom.' },
  
  milestone_15_title: { 'zh-TW': '五年的自由', 'zh-CN': '五年的自由', 'en': 'Five years of freedom' },
  milestone_15_desc: { 'zh-TW': '達到了一個巨大的里程碑。', 'zh-CN': '达到了一个巨大的里程碑。', 'en': 'A massive milestone reached.' },
  milestone_15_encouragement: { 'zh-TW': '五年堡壘！保持專注，舒適的退休生活就在前方。', 'zh-CN': '五年堡垒！保持专注，舒适的退休生活就在前方。', 'en': 'Five-year fortress! Stay focused, comfortable retirement is ahead.' },
  
  milestone_16_title: { 'zh-TW': '舒適財務自由 (Comfortable FIRE)', 'zh-CN': '舒适财务自由 (Comfortable FIRE)', 'en': 'Comfortable FIRE' },
  milestone_16_desc: { 'zh-TW': '你可以不工作也生活得很好。', 'zh-CN': '你可以不工作也生活得很好。', 'en': 'You can live well without working.' },
  milestone_16_encouragement: { 'zh-TW': '生活優渥！但真正的傳奇是為下一代留下不可撼動的財富。', 'zh-CN': '生活优渥！但真正的传奇是为下一代留下不可撼动的财富。', 'en': 'Living well! But true legends leave a legacy for the next generation.' },
  
  milestone_17_title: { 'zh-TW': '世代財富', 'zh-CN': '世代财富', 'en': 'Generational wealth' },
  milestone_17_desc: { 'zh-TW': '你正在建立一個遺產。', 'zh-CN': '你正在建立一个遗产。', 'en': 'You\'re building a legacy.' },
  milestone_17_encouragement: { 'zh-TW': '傳承已成！最後的衝刺：實現極致豐盛的 Fat FIRE。', 'zh-CN': '传承已成！最后的冲刺：实现极致丰盛的 Fat FIRE。', 'en': 'Legacy built! Final sprint: achieve Fat FIRE.' },
  
  milestone_18_title: { 'zh-TW': '豐盛財務自由 (Fat FIRE)', 'zh-CN': '丰盛财务自由 (Fat FIRE)', 'en': 'Fat FIRE' },
  milestone_18_desc: { 'zh-TW': '完全的豐盛與奢華。', 'zh-CN': '完全的丰盛与奢华。', 'en': 'Total abundance and luxury.' },
  milestone_18_encouragement: { 'zh-TW': '極致豐盛！你已經接近終點，最後一步就是掌握命運的終極自由。', 'zh-CN': '极致丰盛！你已经接近终点，最后一步就是掌握命运的终极自由。', 'en': 'Total abundance! You\'re near the end, one step to ultimate freedom.' },
  
  milestone_19_title: { 'zh-TW': '終極自由', 'zh-CN': '终极自由', 'en': 'Ultimate Freedom' },
  milestone_19_desc: { 'zh-TW': '你是你自己命運的主人。', 'zh-CN': '你是你自己命运的主人。', 'en': 'You are the master of your destiny.' },
  milestone_19_encouragement: { 'zh-TW': '終極自由！你已是命運的主人，請謹慎守護這份得來不易的成果。', 'zh-CN': '终极自由！你已是命运的主人，请谨慎守护这份得来不易的成果。', 'en': 'Ultimate freedom! You are the master of your fate, guard it well.' },
  
  // Login
  loginTitle: { 'zh-TW': '歡迎回來', 'zh-CN': '欢迎回来', 'en': 'Welcome Back' },
  loginSubtitle: { 'zh-TW': '使用您的帳號登入，開始管理您的投資組合並獲取獨家洞察。', 'zh-CN': '使用您的帐号登录，开始管理您的投资组合并获取独家洞察。', 'en': 'Sign in to your account to start managing your portfolio and get exclusive insights.' },
  loginDesc: { 'zh-TW': '使用 Google 帳號登入以管理您的資產配置並查看好葉的獨家持股分析。', 'zh-CN': '使用 Google 帐号登录以管理您的资产配置并获取独家洞察。', 'en': 'Sign in with Google to manage your portfolio and view exclusive insights.' },
  loginButton: { 'zh-TW': '使用 Google 登入', 'zh-CN': '使用 Google 登录', 'en': 'Sign in with Google' },
  promptEmail: { 'zh-TW': '請輸入您的電子郵件以進行驗證', 'zh-CN': '请输入您的电子邮件以进行验证', 'en': 'Please enter your email for verification' },
  invalidLink: { 'zh-TW': '無效或已過期的連結', 'zh-CN': '无效或已过期的链接', 'en': 'Invalid or expired link' },
  noEmail: { 'zh-TW': '未提供電子郵件', 'zh-CN': '未提供电子邮件', 'en': 'No email provided' },
  loginFailed: { 'zh-TW': '登入失敗', 'zh-CN': '登录失败', 'en': 'Login failed' },
  sendFailed: { 'zh-TW': '發送失敗', 'zh-CN': '发送失败', 'en': 'Send failed' },
  verifying: { 'zh-TW': '正在驗證...', 'zh-CN': '正在验证...', 'en': 'Verifying...' },
  features: { 'zh-TW': '核心功能', 'zh-CN': '核心功能', 'en': 'Core Features' },
  feature1Title: { 'zh-TW': '資產配置追蹤', 'zh-CN': '资产配置追踪', 'en': 'Portfolio Tracking' },
  feature1Desc: { 'zh-TW': '即時監控您的投資組合表現與風險。', 'zh-CN': '实时监控您的投资组合表现与风险。', 'en': 'Real-time monitoring of your portfolio performance and risk.' },
  feature2Title: { 'zh-TW': '獨家持股分析', 'zh-CN': '独家持股分析', 'en': 'Exclusive Analysis' },
  feature2Desc: { 'zh-TW': '獲取好葉的實戰標的報告與深度解析。', 'zh-CN': '获取好叶的实战标的报告与深度解析。', 'en': 'Get Betterleaf\'s real-time reports and deep analysis.' },
  feature3Title: { 'zh-TW': '全球市場數據', 'zh-CN': '全球市场数据', 'en': 'Global Market Data' },
  feature3Desc: { 'zh-TW': '覆蓋全球主要交易所的即時行情。', 'zh-CN': '覆盖全球主要交易所的实时行情。', 'en': 'Real-time quotes covering major global exchanges.' },
  appTitle: { 'zh-TW': 'Leafolio 定投管家', 'zh-CN': 'Leafolio 定投管家', 'en': 'Leafolio' },
  loginPrompt: { 'zh-TW': '請選擇登入方式', 'zh-CN': '请选择登录方式', 'en': 'Please choose a login method' },
  loginLinkSent: { 'zh-TW': '登入連結已發送', 'zh-CN': '登录链接已发送', 'en': 'Login link sent' },
  checkEmail: { 'zh-TW': '我們已向 {email} 發送了登入連結。', 'zh-CN': '我们已向 {email} 发送了登录链接。', 'en': 'We\'ve sent a login link to {email}.' },
  spamNotice: { 'zh-TW': '如果您沒看到郵件，請檢查垃圾郵件箱。', 'zh-CN': '如果您没看到邮件，请检查垃圾邮件箱。', 'en': 'If you don\'t see it, please check your spam folder.' },
  reEnterEmail: { 'zh-TW': '重新輸入電子郵件', 'zh-CN': '重新输入电子邮件', 'en': 'Re-enter email' },
  loginGoogle: { 'zh-TW': '使用 Google 帳號登入', 'zh-CN': '使用 Google 帐号登录', 'en': 'Sign in with Google' },
  nonGmail: { 'zh-TW': '或使用其他電子郵件', 'zh-CN': '或使用其他电子邮件', 'en': 'Or use another email' },
  enterEmail: { 'zh-TW': '輸入您的電子郵件', 'zh-CN': '输入您的电子邮件', 'en': 'Enter your email' },
  sendLink: { 'zh-TW': '發送登入連結', 'zh-CN': '发送登录链接', 'en': 'Send Login Link' },

  // Betterleaf Portfolio placeholders & alerts
  tickerPlaceholder: { 'zh-TW': '代號', 'zh-CN': '代号', 'en': 'Ticker' },
  namePlaceholder: { 'zh-TW': '名稱', 'zh-CN': '名称', 'en': 'Name' },
  saveFailed: { 'zh-TW': '保存失敗，請檢查網絡連接或權限。', 'zh-CN': '保存失败，请检查网络连接或权限。', 'en': 'Save failed, please check your connection or permissions.' },
  savedSuccessfully: { 'zh-TW': '保存成功', 'zh-CN': '保存成功', 'en': 'Saved Successfully' },
  operationFailed: { 'zh-TW': '操作失敗', 'zh-CN': '操作失败', 'en': 'Operation Failed' },
  buy: { 'zh-TW': '買入', 'zh-CN': '买入', 'en': 'Buy' },
  hold: { 'zh-TW': '持有', 'zh-CN': '持有', 'en': 'Hold' },
  sell: { 'zh-TW': '賣出', 'zh-CN': '卖出', 'en': 'Sell' },
  watch: { 'zh-TW': '觀察', 'zh-CN': '观察', 'en': 'Watch' },
  
  termsOfService: { 'zh-TW': '服務條款', 'zh-CN': '服务条款', 'en': 'Terms of Service' },
  privacyPolicy: { 'zh-TW': '隱私政策', 'zh-CN': '隐私政策', 'en': 'Privacy Policy' },
  copyright: { 'zh-TW': '© {year} GrowingBar。保留所有權利。僅限授權學員使用。', 'zh-CN': '© {year} GrowingBar。保留所有权利。仅限授权学员使用。', 'en': '© {year} GrowingBar. All rights reserved. Strictly for authorized students only.' },
  quotaExceeded: { 'zh-TW': '額度已用完', 'zh-CN': '额度已用完', 'en': 'Quota Exceeded' },
  studentUpsell: { 'zh-TW': '投資課學員專屬 VIP 早鳥優惠！升級後享有每日無限額度，以及未來所有 AI 工具的 VIP 使用權。', 'zh-CN': '投资课学员专属 VIP 早鸟优惠！升级后享有每日无限额度，以及未来所有 AI 工具的 VIP 使用权。', 'en': 'Exclusive VIP Early Bird offer for students! Get unlimited daily quota and VIP access to all future AI tools.' },
  trialUpsell: { 'zh-TW': '您的免費額度已用完。請訂閱 《好葉進階課程AI+》 升級 VIP 享有每日無限額度與更多進階功能。', 'zh-CN': '您的免费额度已用完。请订阅 《好叶进阶课程AI+》 升级 VIP 享有每日无限额度与更多进阶功能。', 'en': 'Your free quota is exhausted. Subscribe to "Betterleaf Advanced Course AI+" to upgrade to VIP for unlimited quota.' },
  upgradeNow: { 'zh-TW': '立即升級 VIP', 'zh-CN': '立即升级 VIP', 'en': 'Upgrade to VIP' },
  maybeLater: { 'zh-TW': '稍後再說', 'zh-CN': '稍后再说', 'en': 'Maybe Later' },

  // Investment Planner
  investmentPlannerTitle: { 'zh-TW': '投資規劃器', 'zh-CN': '投资规划器', 'en': 'Investment Planner' },
  totalInvestmentEstimated: { 'zh-TW': '本次預計投入總額', 'zh-CN': '本次预计投入总额', 'en': 'Total Investment Estimated' },
  monthlyContributionLabel: { 'zh-TW': '每月定投金額', 'zh-CN': '每月定投金额', 'en': 'Monthly Contribution' },
  monthlyContributionSyncDesc: { 'zh-TW': '此金額將同步至財富進度模擬器。', 'zh-CN': '此金额将同步至财富进度模拟器。', 'en': 'This amount will sync to the Wealth Progress simulator.' },
  lumpSumLabel: { 'zh-TW': '單次投入金額', 'zh-CN': '单次投入金额', 'en': 'Lump Sum Investment' },
  lumpSumDesc: { 'zh-TW': '如果您現在有一筆額外資金準備投入。', 'zh-CN': '如果您现在有一笔额外资金准备投入。', 'en': 'If you have extra funds ready to invest now.' },
  riskPreferenceLabel: { 'zh-TW': '選擇風險偏好', 'zh-CN': '选择风险偏好', 'en': 'Select Risk Preference' },
  editDefaultProfiles: { 'zh-TW': '編輯預設組合', 'zh-CN': '编辑预设组合', 'en': 'Edit Default Profiles' },
  conservative: { 'zh-TW': '保守型', 'zh-CN': '保守型', 'en': 'Conservative' },
  conservativeDesc: { 'zh-TW': '側重資本保護，適合風險承受能力較低或短期目標。', 'zh-CN': '侧重资本保护，适合风险承受能力较低或短期目标。', 'en': 'Focuses on capital protection, suitable for low risk tolerance or short-term goals.' },
  moderate: { 'zh-TW': '中等風險', 'zh-CN': '中等风险', 'en': 'Moderate' },
  moderateDesc: { 'zh-TW': '平衡增長與風險，適合大多數長期投資者。', 'zh-CN': '平衡增长与风险，适合大多数长期投资者。', 'en': 'Balances growth and risk, suitable for most long-term investors.' },
  aggressive: { 'zh-TW': '激進型', 'zh-CN': '激进型', 'en': 'Aggressive' },
  aggressiveDesc: { 'zh-TW': '追求最高回報，能承受較大市場波動。', 'zh-CN': '追求最高回报，能承受较大市场波动。', 'en': 'Pursues highest returns, can withstand significant market volatility.' },
  custom: { 'zh-TW': '客製化組合', 'zh-CN': '客制化组合', 'en': 'Custom' },
  customDesc: { 'zh-TW': '自行搭配投資標的與比例，打造專屬投資組合。', 'zh-CN': '自行搭配投资标的与比例，打造专属投资组合。', 'en': 'Mix and match tickers and weights to create your own portfolio.' },
  portfolioAllocation: { 'zh-TW': '投資組合分配', 'zh-CN': '投资组合分配', 'en': 'Portfolio Allocation' },
  assets: { 'zh-TW': '資產', 'zh-CN': '资产', 'en': 'Assets' },
  backtestTitle: { 'zh-TW': '歷史回測', 'zh-CN': '历史回测', 'en': 'Historical Backtest' },
  projectionTitle: { 'zh-TW': '未來預測', 'zh-CN': '未来预测', 'en': 'Future Projection' },
  startBacktest: { 'zh-TW': '開始回測', 'zh-CN': '开始回測', 'en': 'Start Backtest' },
  startProjection: { 'zh-TW': '開始預測', 'zh-CN': '开始预测', 'en': 'Start Projection' },
  aiReasoning: { 'zh-TW': 'AI 預測邏輯', 'zh-CN': 'AI 预测逻辑', 'en': 'AI Reasoning' },
  marketSentiment: { 'zh-TW': '市場情緒', 'zh-CN': '市场情绪', 'en': 'Market Sentiment' },
  expectedReturn: { 'zh-TW': '預期回報', 'zh-CN': '预期回报', 'en': 'Expected Return' },
  volatility: { 'zh-TW': '波動率', 'zh-CN': '波动率', 'en': 'Volatility' },
  sharpeRatio: { 'zh-TW': '夏普比率', 'zh-CN': '夏普比率', 'en': 'Sharpe Ratio' },
  maxDrawdown: { 'zh-TW': '最大回撤', 'zh-CN': '最大回撤', 'en': 'Max Drawdown' },
  cagr: { 'zh-TW': '複合年增長率', 'zh-CN': '复合年增长率', 'en': 'CAGR' },
  correlation: { 'zh-TW': '相關性', 'zh-CN': '相关性', 'en': 'Correlation' },
  bestYear: { 'zh-TW': '最佳年份', 'zh-CN': '最佳年份', 'en': 'Best Year' },
  worstYear: { 'zh-TW': '最差年份', 'zh-CN': '最差年份', 'en': 'Worst Year' },
  startBalance: { 'zh-TW': '初始餘額', 'zh-CN': '初始余额', 'en': 'Start Balance' },
  endBalance: { 'zh-TW': '最終餘額', 'zh-CN': '最终余额', 'en': 'End Balance' },
  historicalPerformance: { 'zh-TW': '歷史表現', 'zh-CN': '历史表现', 'en': 'Historical Performance' },
  projectedPerformance: { 'zh-TW': '預測表現', 'zh-CN': '预测表现', 'en': 'Projected Performance' },
  backtestDesc: { 'zh-TW': '基於過去 10 年的數據進行模擬。', 'zh-CN': '基于过去 10 年的数据进行模拟。', 'en': 'Simulated based on the last 10 years of data.' },
  projectionDesc: { 'zh-TW': '基於 AI 模型對未來 10 年的預測。', 'zh-CN': '基于 AI 模型对未来 10 年的预测。', 'en': 'Projected based on AI models for the next 10 years.' },
  backtestRequired: { 'zh-TW': '請先點擊「開始回測」以生成數據。', 'zh-CN': '请先点击「开始回测」以生成数据。', 'en': 'Please click "Start Backtest" to generate data first.' },
  weightWarning: { 'zh-TW': '權重總和必須為 100%', 'zh-CN': '权重总和必须为 100%', 'en': 'Total weight must be 100%' },
  addTicker: { 'zh-TW': '新增標的', 'zh-CN': '新增标的', 'en': 'Add Ticker' },
  backtestResults: { 'zh-TW': '回測結果', 'zh-CN': '回测结果', 'en': 'Backtest Results' },
  projectionResults: { 'zh-TW': '預測結果', 'zh-CN': '预测结果', 'en': 'Projection Results' },
  benchmark: { 'zh-TW': '基準 (SPY)', 'zh-CN': '基准 (SPY)', 'en': 'Benchmark (SPY)' },
  backtesting: { 'zh-TW': '回測中...', 'zh-CN': '回测中...', 'en': 'Backtesting...' },
  projecting: { 'zh-TW': '預測中...', 'zh-CN': '预测中...', 'en': 'Projecting...' },
  historicalData: { 'zh-TW': '歷史數據', 'zh-CN': '历史数据', 'en': 'Historical Data' },
  projectedData: { 'zh-TW': '預測數據', 'zh-CN': '预测数据', 'en': 'Projected Data' },
  saveProfiles: { 'zh-TW': '儲存組合', 'zh-CN': '储存组合', 'en': 'Save Profiles' },
  saving: { 'zh-TW': '儲存中...', 'zh-CN': '储存中...', 'en': 'Saving...' },
  customPortfolioEditor: { 'zh-TW': '客製化組合編輯器', 'zh-CN': '客制化组合编辑器', 'en': 'Custom Portfolio Editor' },
  totalWeight: { 'zh-TW': '總權重', 'zh-CN': '总权重', 'en': 'Total Weight' },
  backtestCompleted: { 'zh-TW': '已完成回測分析', 'zh-CN': '已完成回测分析', 'en': 'Backtest Analysis Completed' },
  startBacktestAnalysis: { 'zh-TW': '開始回測分析', 'zh-CN': '开始回测分析', 'en': 'Start Backtest Analysis' },
  copyPortfolioAllocation: { 'zh-TW': '複製倉位配置', 'zh-CN': '复制仓位配置', 'en': 'Copy Portfolio Allocation' },
  basedOnRiskDesc: { 'zh-TW': '基於您的風險偏好與投入金額計算', 'zh-CN': '基于您的风险偏好与投入金额计算', 'en': 'Calculated based on your risk preference and investment amount' },
  sharesToBuy: { 'zh-TW': '預計買入股數', 'zh-CN': '预计买入股数', 'en': 'Shares to Buy' },
  estimatedCost: { 'zh-TW': '預計投入金額', 'zh-CN': '预计投入金额', 'en': 'Estimated Cost' },
  currentPrice: { 'zh-TW': '當前價格', 'zh-CN': '当前价格', 'en': 'Current Price' },
  backtestVisualizer: { 'zh-TW': '回測可視化', 'zh-CN': '回测可视化', 'en': 'Backtest Visualizer' },
  projectionVisualizer: { 'zh-TW': '預測可視化', 'zh-CN': '预测可视化', 'en': 'Projection Visualizer' },
  performanceStats: { 'zh-TW': '表現統計', 'zh-CN': '表现统计', 'en': 'Performance Statistics' },
  annualReturnsChart: { 'zh-TW': '年度回報對比', 'zh-CN': '年度回报对比', 'en': 'Annual Returns Comparison' },
  aiProjectionAnalysis: { 'zh-TW': 'AI 預測分析', 'zh-CN': 'AI 预测分析', 'en': 'AI Projection Analysis' },
  marketSentimentLabel: { 'zh-TW': '市場情緒', 'zh-CN': '市场情绪', 'en': 'Market Sentiment' },
  aiReasoningLabel: { 'zh-TW': 'AI 預測邏輯', 'zh-CN': 'AI 预测逻辑', 'en': 'AI Reasoning' },
  startAiProjection: { 'zh-TW': '開始 AI 未來預測', 'zh-CN': '开始 AI 未来预测', 'en': 'Start AI Future Projection' },
  projectionDisclaimer: { 'zh-TW': '* 預測結果基於 AI 模型，僅供參考，不構成投資建議。', 'zh-CN': '* 预测结果基于 AI 模型，仅供参考，不构成投资建议。', 'en': '* Projection results are based on AI models and are for reference only, not investment advice.' },
  totalInvestmentAmount: { 'zh-TW': '總投入金額', 'zh-CN': '总投入金额', 'en': 'Total Investment Amount' },
  allocationRatio: { 'zh-TW': '分配比例 (%)', 'zh-CN': '分配比例 (%)', 'en': 'Allocation Ratio (%)' },
  tickerWithLabel: { 'zh-TW': '標的', 'zh-CN': '标的', 'en': 'Ticker' },
  forwardPe: { 'zh-TW': 'Forward P/E', 'zh-CN': 'Forward P/E', 'en': 'Forward P/E' },
  historicalBacktest: { 'zh-TW': '歷史回測', 'zh-CN': '历史回测', 'en': 'Historical Backtest' },
  futureProjection: { 'zh-TW': '未來預測', 'zh-CN': '未来预测', 'en': 'Future Projection' },
  backtestAnalysis: { 'zh-TW': '回測分析', 'zh-CN': '回测分析', 'en': 'Backtest Analysis' },
  projectionAnalysis: { 'zh-TW': '預測分析', 'zh-CN': '预测分析', 'en': 'Projection Analysis' },
  saveDefaultProfiles: { 'zh-TW': '保存預設組合配置', 'zh-CN': '保存预设组合配置', 'en': 'Save Default Profiles' },
  unlockTicker: { 'zh-TW': '解鎖標的', 'zh-CN': '解锁标的', 'en': 'Unlock Ticker' },
  to: { 'zh-TW': '至', 'zh-CN': '至', 'en': 'to' },
  initialCapital: { 'zh-TW': '起始資金', 'zh-CN': '起始资金', 'en': 'Initial Capital' },
  fetchingHistoricalData: { 'zh-TW': '正在獲取歷史數據...', 'zh-CN': '正在获取历史数据...', 'en': 'Fetching historical data...' },
  selectedPortfolio: { 'zh-TW': '所選投資組合', 'zh-CN': '所选投资组合', 'en': 'Selected Portfolio' },
  spyBenchmark: { 'zh-TW': '標普500', 'zh-CN': '标普500', 'en': 'S&P 500' },
  performanceComparison: { 'zh-TW': '投資表現對比', 'zh-CN': '投资表现对比', 'en': 'Performance Comparison' },
  aiGrowthProjection: { 'zh-TW': 'AI 增長推演', 'zh-CN': 'AI 增长推演', 'en': 'AI Growth Projection' },
  aiGrowthProjectionDesc: { 'zh-TW': '基於歷史 CAGR 與定投計畫推演未來 10 年增長趨勢', 'zh-CN': '基于历史 CAGR 与定投计划推演未来 10 年增长趋势', 'en': 'Projecting future 10-year growth trends based on historical CAGR and contribution plans' },
  aiAnalyzing: { 'zh-TW': 'AI 正在分析推演...', 'zh-CN': 'AI 正在分析推演...', 'en': 'AI is analyzing and projecting...' },
  restartAiProjection: { 'zh-TW': '重新進行 AI 推演', 'zh-CN': '重新进行 AI 推演', 'en': 'Restart AI Projection' },
  expectedValue10Years: { 'zh-TW': '預計 10 年後價值', 'zh-CN': '预计 10 年后价值', 'en': 'Expected Value in 10 Years' },
  projectedPortfolio: { 'zh-TW': '預計投資組合', 'zh-CN': '预计投资组合', 'en': 'Projected Portfolio' },
  projectedSpy: { 'zh-TW': '預計 SPY (標普500)', 'zh-CN': '预计 SPY (标普500)', 'en': 'Projected SPY (S&P 500)' },
  marketOutlook: { 'zh-TW': '市場展望:', 'zh-CN': '市场展望:', 'en': 'Market Outlook:' },
  clickToStartProjection: { 'zh-TW': '點擊上方按鈕開始 AI 推演', 'zh-CN': '点击上方按钮开始 AI 推演', 'en': 'Click the button above to start AI projection' },
  projectionMethodology: { 'zh-TW': '我們將根據您的投資組合歷史表現、波動率以及市場基準，利用蒙地卡羅模擬法為您推演出未來 10 年的潛在增長路徑。', 'zh-CN': '我们将根据您的投资组合历史表现、波动率以及市场基准，利用蒙特卡罗模拟法为您推演出未来 10 年的潜在增长路径。', 'en': 'We will project potential growth paths for the next 10 years using Monte Carlo simulation based on your portfolio\'s historical performance, volatility, and market benchmarks.' },
  projectionSuffix: { 'zh-TW': '(推演)', 'zh-CN': '(推演)', 'en': '(Projected)' },
  historical: { 'zh-TW': '歷史', 'zh-CN': '历史', 'en': 'Historical' },
  aiProjection: { 'zh-TW': 'AI 推演', 'zh-CN': 'AI 推演', 'en': 'AI Projection' },
  clickToStartBacktest: { 'zh-TW': '點擊「開始回測分析」查看績效', 'zh-CN': '点击「开始回测分析」查看绩效', 'en': 'Click "Start Backtest Analysis" to view performance' },
  backtestMethodology: { 'zh-TW': '我們將根據您設定的投資標的與比例，回溯過去 10 年的歷史數據，為您呈現該組合的真實投資表現與風險指標。', 'zh-CN': '我们将根据您设置的投资标的和比例，回溯过去 10 年的历史数据，为您呈现该组合的真实投资表现和风险指标。', 'en': 'We will trace back 10 years of historical data based on your tickers and weights to present the actual investment performance and risk metrics of the portfolio.' },
  syncedFromDashboard: { 'zh-TW': '由管理員從 Dashboard 同步', 'zh-CN': '由管理员从 Dashboard 同步', 'en': 'Synced from Dashboard' },
  annualReturnCagr: { 'zh-TW': '年化回報率', 'zh-CN': '年化回报率', 'en': 'Annual Return' },
  benchmarkCagrSpy: { 'zh-TW': '基準年化回報率', 'zh-CN': '基准年化回报率', 'en': 'Benchmark CAGR' },
  riskStdDev: { 'zh-TW': '風險', 'zh-CN': '风险', 'en': 'Risk' },
  metric: { 'zh-TW': '指標', 'zh-CN': '指标', 'en': 'Metric' },
  benchmarkSpy: { 'zh-TW': '基準', 'zh-CN': '基准', 'en': 'Benchmark' },
  annualizedReturnCagr: { 'zh-TW': '年化回報率', 'zh-CN': '年化回报率', 'en': 'Annualized Return' },
  standardDeviation: { 'zh-TW': '標準差', 'zh-CN': '标准差', 'en': 'Standard Deviation' },
  benchmarkCorrelation: { 'zh-TW': '基準相關性', 'zh-CN': '基准相关性', 'en': 'Benchmark Correlation' },
  neutral: { 'zh-TW': '中性', 'zh-CN': '中性', 'en': 'NEUTRAL' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: { [key: string]: any }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings } = useSettings();
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved as Language) || 'zh-TW';
  });

  const lastSettingsLang = React.useRef<string | null>(null);

  // Sync from Firebase
  useEffect(() => {
    if (settings?.language && settings.language !== lastSettingsLang.current) {
      setLanguageState(settings.language as Language);
      lastSettingsLang.current = settings.language;
      localStorage.setItem('app_lang', settings.language);
    }
  }, [settings?.language]);

  const setLanguage = (lang: Language) => {
    if (lang === language) return;
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
    updateSettings({ language: lang });
  };

  const t = (key: string, params?: { [key: string]: any }) => {
    let text = translations[key]?.[language] || key;
    if (params) {
      Object.keys(params).forEach(p => {
        text = text.replace(`{${p}}`, params[p]);
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
