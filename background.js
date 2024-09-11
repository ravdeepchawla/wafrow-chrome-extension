 chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.active) {
        if (tab.url.startsWith("https://wafrow.com")) {
            chrome.tabs.sendMessage(tabId, {action: "getLocalStorage"});
        }
    }
});

// Listen for messages from the injected script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'localStorageData') {
        chrome.storage.local.set({ 'userID': message.data })
    }
});