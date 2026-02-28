chrome.action.onClicked.addListener(async () => {
  // 1. 并发获取所有标签页与标签组元数据
  const [tabs, groups] = await Promise.all([
    chrome.tabs.query({}),
    chrome.tabGroups.query({})
  ]);

  // 构建标签组 ID 到名称的映射字典
  const groupMap = new Map();
  groups.forEach(g => groupMap.set(g.id, g.title || '未命名分组'));

  // 2. 构建层级数据树：分组 -> 排序键(反向域名) -> 标签页列表
  const hierarchy = {};

  tabs.forEach(tab => {
    // 解析人类友好的分组名称
    const groupName = tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE 
      ? `[分组] ${groupMap.get(tab.groupId)}` 
      : "未分组";

    // 解析并反转域名以实现严格聚类
    let displayDomain = "未知或本地页面";
    let sortKey = "zzzz_local"; // 确保本地页面排在最底部
    try {
      const url = new URL(tab.url);
      if (url.protocol.startsWith('http')) {
        displayDomain = url.hostname;
        sortKey = displayDomain.split('.').reverse().join('.');
      }
    } catch (e) {
      // 忽略 chrome:// 等内部页面的解析错误
    }

    // 格式化时间戳
    const timeStr = tab.lastAccessed 
      ? new Date(tab.lastAccessed).toLocaleString() 
      : "暂无记录";

    // 组装嵌套结构
    if (!hierarchy[groupName]) hierarchy[groupName] = {};
    if (!hierarchy[groupName][sortKey]) {
      hierarchy[groupName][sortKey] = {
        domain: displayDomain,
        items: []
      };
    }

    hierarchy[groupName][sortKey].items.push({
      title: tab.title,
      url: tab.url,
      time: timeStr
    });
  });

  // 对域名字典进行键值排序，确保导出的逻辑顺畅
  const sortedHierarchy = {};
  for (const group of Object.keys(hierarchy).sort()) {
    sortedHierarchy[group] = {};
    const sortedKeys = Object.keys(hierarchy[group]).sort();
    for (const key of sortedKeys) {
      sortedHierarchy[group][key] = hierarchy[group][key];
    }
  }

  // 3. 多态输出生成器
  let txtContent = "", mdContent = "", htmlContent = "<html><head><meta charset='utf-8'><style>body{font-family:sans-serif; line-height:1.6; max-width:800px; margin:2rem auto;} a{text-decoration:none; color:#1a73e8;} .time{color:#5f6368; font-size:0.85em; margin-left:10px;}</style></head><body>\n";

  for (const [group, domains] of Object.entries(sortedHierarchy)) {
    txtContent += `\n========== ${group} ==========\n`;
    mdContent += `\n# ${group}\n`;
    htmlContent += `<h1>${group}</h1>\n`;

    for (const { domain, items } of Object.values(domains)) {
      txtContent += `\n[ ${domain} ]\n`;
      mdContent += `\n## ${domain}\n`;
      htmlContent += `<h2>${domain}</h2>\n<ul>\n`;

      items.forEach(item => {
        txtContent += `  - ${item.title}\n    ${item.url}\n    (最后访问: ${item.time})\n\n`;
        mdContent += `- [${item.title}](${item.url}) *(最后访问: ${item.time})*\n`;
        htmlContent += `<li><a href="${item.url}" target="_blank">${item.title}</a><span class="time">最后访问: ${item.time}</span></li>\n`;
      });
      htmlContent += `</ul>\n`;
    }
  }
  htmlContent += "</body></html>";
  const jsonContent = JSON.stringify(sortedHierarchy, null, 2);

  // 4. 生成人类友好的文件名时间戳 (例如: 20260228_1049)
  const now = new Date();
  const fileTime = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

  // 5. 批处理下载逻辑
  const filesToDownload = [
    { content: txtContent, type: "text/plain", ext: "txt" },
    { content: mdContent, type: "text/markdown", ext: "md" },
    { content: htmlContent, type: "text/html", ext: "html" },
    { content: jsonContent, type: "application/json", ext: "json" }
  ];
/*
  filesToDownload.forEach(({ content, type, ext }) => {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const reader = new FileReader();
    reader.onload = function() {
      chrome.downloads.download({
        url: reader.result,
        filename: `Tabs_${fileTime}.${ext}`,
        saveAs: false 
      });
    };
    reader.readAsDataURL(blob);
  });
  */
 
// 定义统一的文件夹名称（带时间戳）
  const folderName = `Tabs_Export_${fileTime}`;

  filesToDownload.forEach(({ content, type, ext }) => {
    // 创建 Blob 以处理编码问题
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const reader = new FileReader();
    
    reader.onload = function() {
      chrome.downloads.download({
        url: reader.result,
        // 关键点：通过“文件夹名/文件名”这种格式，强制 Chrome 进行归类
        filename: `${folderName}/Tabs_${fileTime}.${ext}`,
        saveAs: false 
      });
    };
    reader.readAsDataURL(blob);
  });

});
