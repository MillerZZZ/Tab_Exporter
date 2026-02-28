import { generateAndDownload } from './extractor.js';
import { extractGeminiData } from './gemini_probe.js';
import { extractZhihuData } from './zhihu_probe.js';

// 初始化多重右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "toggle-gemini-probe",
    title: "开启 Gemini 标题深度提取",
    type: "checkbox",
    contexts: ["action"],
    checked: false
  });
  chrome.contextMenus.create({
    id: "toggle-zhihu-probe",
    title: "开启知乎首页信息流提取",
    type: "checkbox",
    contexts: ["action"],
    checked: false
  });
});

// 监听菜单点击并持久化状态
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "toggle-gemini-probe") {
    chrome.storage.local.set({ enableGeminiProbe: info.checked });
  } else if (info.menuItemId === "toggle-zhihu-probe") {
    chrome.storage.local.set({ enableZhihuProbe: info.checked });
  }
});

// 核心执行流
chrome.action.onClicked.addListener(async () => {
  const storageData = await chrome.storage.local.get(["enableGeminiProbe", "enableZhihuProbe"]);
  const { enableGeminiProbe, enableZhihuProbe } = storageData;
  
  const [tabs, groups] = await Promise.all([
    chrome.tabs.query({}),
    chrome.tabGroups.query({})
  ]);

  for (let tab of tabs) {
    // 处理 Gemini 特化
    if (enableGeminiProbe && tab.url.includes("gemini.google.com")) {
      if (!tab.discarded && tab.id) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractGeminiData
          });
          if (results[0]?.result) tab.title = results[0].result; 
        } catch (e) {}
      } else {
        tab.title = `[已挂起] ${tab.title}`;
      }
    } 
    // 处理知乎首页特化 (严格匹配根路径，避开具体问题页)
    else if (enableZhihuProbe && tab.url.match(/^https?:\/\/(www\.)?zhihu\.com\/?$/)) {
      if (!tab.discarded && tab.id) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractZhihuData
          });
          if (results[0]?.result) tab.title = results[0].result; 
        } catch (e) {}
      } else {
        tab.title = `[已挂起] ${tab.title}`;
      }
    }
  }

  generateAndDownload(tabs, groups);
});