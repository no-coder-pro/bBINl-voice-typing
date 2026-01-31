let activeTabs = {};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }

  chrome.runtime.setUninstallURL("https://bbinl.site/bBINl-voice-typing/");
  chrome.action.setIcon({ path: "icons/icon48.png" });
  chrome.action.setBadgeText({ text: "" });
});

function updateBadgeAndIcon(tabId, status) {
  let iconPath = "icons/icon48.png";
  let badgeText = "";
  let badgeColor = "#4CAF50";

  const tabState = activeTabs[tabId] || { isActive: false, isListening: false };

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
      if (tabState.isActive) {
        iconPath = "icons/icon48_active.png";
        badgeText = "ON";
      } else {
        iconPath = "icons/icon48.png";
        badgeText = "";
      }
  }

  chrome.action.setIcon({ tabId: tabId, path: iconPath });
  chrome.action.setBadgeText({ tabId: tabId, text: badgeText });
  if (badgeText) {
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: badgeColor });
  }
}

chrome.action.onClicked.addListener((tab) => {
  const tabId = tab.id;
  const tabState = activeTabs[tabId] || { isActive: false, isListening: false };

  if (!tabState.isActive) {
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
          activeTabs[tabId] = { isActive: true, isListening: true };
          updateBadgeAndIcon(tabId, "listening");
        }
      });
    });
  } else {
    // If it's active but icon clicked, we toggle the state or stop it
    chrome.tabs.sendMessage(tabId, { action: "stopListening" }, (response) => {
      activeTabs[tabId].isListening = false;
      updateBadgeAndIcon(tabId, "active");
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : null;
  if (!tabId) return;

  if (request.action === "updateIcon") {
    if (activeTabs[tabId]) {
      activeTabs[tabId].isListening = (request.status === "listening");
    }
    updateBadgeAndIcon(tabId, request.status);
  } else if (request.action === "updateBackgroundActiveState") {
    if (request.isActive) {
      activeTabs[tabId] = { isActive: true, isListening: request.isListening || false };
      updateBadgeAndIcon(tabId, request.isListening ? "listening" : "active");
    } else {
      delete activeTabs[tabId];
      updateBadgeAndIcon(tabId, "default");
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && activeTabs[tabId] && activeTabs[tabId].isActive) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['toast.js', 'content.js']
    }, () => {
      if (!chrome.runtime.lastError) {
        if (activeTabs[tabId].isListening) {
          chrome.tabs.sendMessage(tabId, { action: "startListening" });
        } else {
          // Just restore the widget without starting recognition
          chrome.tabs.sendMessage(tabId, { action: "restoreState" });
        }
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
