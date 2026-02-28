export function generateAndDownload(tabs, groups) {
  const groupMap = new Map();
  groups.forEach(g => groupMap.set(g.id, g.title || '未命名分组'));

  const hierarchy = {};

  // 构建数据树
  tabs.forEach(tab => {
    const groupName = tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE 
      ? `[分组] ${groupMap.get(tab.groupId)}` 
      : "未分组";

    let displayDomain = "未知或本地页面";
    let sortKey = "zzzz_local"; 
    try {
      const url = new URL(tab.url);
      if (url.protocol.startsWith('http')) {
        displayDomain = url.hostname;
        sortKey = displayDomain.split('.').reverse().join('.');
      }
    } catch (e) {}

    const timeStr = tab.lastAccessed 
      ? new Date(tab.lastAccessed).toLocaleString() 
      : "暂无记录";

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

  // 对键值进行严格排序
  const sortedHierarchy = {};
  for (const group of Object.keys(hierarchy).sort()) {
    sortedHierarchy[group] = {};
    const sortedKeys = Object.keys(hierarchy[group]).sort();
    for (const key of sortedKeys) {
      sortedHierarchy[group][key] = hierarchy[group][key];
    }
  }

  // 生成四种格式
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

  // 打包下载成文件夹
  const now = new Date();
  const fileTime = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  const folderName = `Tabs_Export_${fileTime}`;

  const filesToDownload = [
    { content: txtContent, type: "text/plain", ext: "txt" },
    { content: mdContent, type: "text/markdown", ext: "md" },
    { content: htmlContent, type: "text/html", ext: "html" },
    { content: jsonContent, type: "application/json", ext: "json" }
  ];

  filesToDownload.forEach(({ content, type, ext }) => {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const reader = new FileReader();
    reader.onload = function() {
      chrome.downloads.download({
        url: reader.result,
        filename: `${folderName}/Tabs_${fileTime}.${ext}`,
        saveAs: false 
      });
    };
    reader.readAsDataURL(blob);
  });
}