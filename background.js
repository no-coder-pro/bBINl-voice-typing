let activeTabs = {};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
    chrome.tabs.create({ url: "https://t.me/no_coder_xone" });
  }

  chrome.runtime.setUninstallURL("https://bbinl.site/bBINl-voice-typing/");
  chrome.action.setIcon({ path: "icons/icon48.png" });
  chrome.action.setBadgeText({ text: "" });
});

function updateBadgeAndIcon(tabId, status) {
  let iconPath = "icons/icon48.png";
  let badgeText = "";
  let badgeColor = "#4CAF50";

  switch (status) {
    case "active":
      iconPath = "icons/icon48_active.png";
      badgeText = "ON";
      badgeColor = "#4CAF50";
      break;
    case "listening":
      iconPath = "icons/icon48_listening.png";
      badgeText = "REC";
      badgeColor = "#f44336";
      break;
    case "error":
      iconPath = "icons/icon48_error.png";
      badgeText = "ERR";
      badgeColor = "#FFC107";
      break;
    default:
      iconPath = "icons/icon48.png";
      badgeText = "";
  }

  chrome.action.setIcon({ tabId: tabId, path: iconPath });
  chrome.action.setBadgeText({ tabId: tabId, text: badgeText });
  if (badgeText) {
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: badgeColor });
  }
}

chrome.action.onClicked.addListener((tab) => {
  const tabId = tab.id;
  const isActive = !!activeTabs[tabId];

  if (!isActive) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['toast.js', 'content.js']
    }, () => {
      if (chrome.runtime.lastError) {
        updateBadgeAndIcon(tabId, "error");
        return;
      }
      chrome.tabs.sendMessage(tabId, { action: "startListening" }, (response) => {
        if (chrome.runtime.lastError || !response || response.status !== "started") {
          updateBadgeAndIcon(tabId, "error");
        } else {
          activeTabs[tabId] = true;
          updateBadgeAndIcon(tabId, "active");
        }
      });
    });
  } else {
    chrome.tabs.sendMessage(tabId, { action: "stopListening" }, (response) => {
      activeTabs[tabId] = false;
      updateBadgeAndIcon(tabId, "default");
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : null;
  if (!tabId) return;

  if (request.action === "updateIcon") {
    updateBadgeAndIcon(tabId, request.status);
  } else if (request.action === "updateBackgroundActiveState") {
    activeTabs[tabId] = request.isActive;
    if (!request.isActive) {
      updateBadgeAndIcon(tabId, "default");
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && activeTabs[tabId]) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['toast.js', 'content.js']
    }, () => {
      if (!chrome.runtime.lastError) {
        chrome.tabs.sendMessage(tabId, { action: "startListening" });
      } else {
        delete activeTabs[tabId];
        updateBadgeAndIcon(tabId, "default");
      }
    });
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId;
  chrome.tabs.sendMessage(tabId, { action: "getListeningState" }, (response) => {
    if (chrome.runtime.lastError) {
      updateBadgeAndIcon(tabId, "default");
    } else {
      if (response.isListening) {
        updateBadgeAndIcon(tabId, "listening");
      } else if (activeTabs[tabId]) {
        updateBadgeAndIcon(tabId, "active");
      } else {
        updateBadgeAndIcon(tabId, "default");
      }
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete activeTabs[tabId];
});
