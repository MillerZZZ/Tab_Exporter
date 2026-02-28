import { generateAndDownload } from './extractor.js';
import { extractGeminiData } from './gemini_probe.js';

// 初始化右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "toggle-gemini-probe",
    title: "开启 Gemini 标题深度提取",
    type: "checkbox",
    contexts: ["action"],
    checked: false
  });
});

// 监听菜单点击并保存状态
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "toggle-gemini-probe") {
    chrome.storage.local.set({ enableGeminiProbe: info.checked });
  }
});

// 点击扩展图标的执行逻辑
chrome.action.onClicked.addListener(async () => {
  const storageData = await chrome.storage.local.get("enableGeminiProbe");
  const enableGeminiProbe = storageData.enableGeminiProbe;
  
  const [tabs, groups] = await Promise.all([
    chrome.tabs.query({}),
    chrome.tabGroups.query({})
  ]);

  for (let tab of tabs) {
    if (enableGeminiProbe && tab.url.includes("gemini.google.com")) {
      if (!tab.discarded && tab.id) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id }, // 修复了之前草稿中的一个变量名小错误
            func: extractGeminiData
          });
          if (results[0]?.result) {
            tab.title = results[0].result; 
          }
        } catch (error) {
          console.warn(`探针注入失败 (Tab ${tab.id}):`, error);
        }
      } else {
        tab.title = `[已挂起] ${tab.title}`;
      }
    }
  }

  generateAndDownload(tabs, groups);
});