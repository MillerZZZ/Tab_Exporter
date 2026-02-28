export function extractZhihuData() {
  let extractedItems = [];
  
  try {
    const titles = document.getElementsByClassName("ContentItem-title");
    const snippets = document.getElementsByClassName("RichText ztext CopyrightRichText-richText css-yzps3a");

    // 取两者的最小长度，防止 DOM 渲染异步导致的一一对应关系错位
    const count = Math.min(titles.length, snippets.length);

    for (let i = 0; i < count; i++) {
      const title = titles[i].innerText.trim();
      let snippet = snippets[i].innerText.trim();
      
      // 摘要通常较长，对其进行轻量截断处理
      snippet = snippet.length > 50 ? snippet.slice(0, 50) + "..." : snippet;
      
      extractedItems.push(`【${i + 1}】${title} (${snippet})`);
    }
  } catch (error) {
    // 维持静默失败
  }

  if (extractedItems.length > 0) {
    return `[知乎首页信息流 共 ${extractedItems.length} 条] ` + extractedItems.join(" ｜ ");
  }

  return null;
}