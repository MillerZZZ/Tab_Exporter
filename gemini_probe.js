export function extractGeminiData() {
  let resultTitle = "";
  let resultPrompt = "";

  try {
    const titleElements = document.getElementsByClassName("gds-title-m ng-star-inserted");
    if (titleElements && titleElements.length > 0) {
      resultTitle = titleElements[0].innerText.trim();
    }

    const promptElements = document.getElementsByClassName("query-text-line ng-star-inserted");
    if (promptElements && promptElements.length > 0) {
      const rawPrompt = promptElements[0].innerText.trim();
      // 使用你要求的截断逻辑
      resultPrompt = rawPrompt.length > 50 ? rawPrompt.slice(0, 50) + "..." : rawPrompt;
    }
  } catch (error) {
    // 遇到异常静默失败，避免插件崩溃
  }

  if (resultTitle || resultPrompt) {
    const finalTitle = resultTitle || "未命名对话";
    const finalPrompt = resultPrompt ? ` [引语: ${resultPrompt}]` : "";
    return finalTitle + finalPrompt;
  }

  return null;
}