chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.startsWith("chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/")
  ) {
    console.log("🧠 Detected Chrome PDF viewer, injecting scripts...");

    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["libs/pdf.js", "content.js"],
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("❌ Script injection failed:", chrome.runtime.lastError.message);
      } else {
        console.log("✅ Scripts injected into Chrome PDF viewer");
      }
    });
  }
});
