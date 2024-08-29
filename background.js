// Function to inject and execute content script
function injectContentScript(tabId) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: getLocalStorageData
    });
  }
  
  // Function to be injected into the page
  function getLocalStorageData() {
    const data = localStorage.getItem('userID');
    if (data) {
      chrome.runtime.sendMessage({ type: 'localStorageData', data: data });
    }
  }
   
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.active) {
        if (tab.url.includes("127.0.0.1:8000")) {
            injectContentScript(tabId);
        }
    }
});

// Listen for messages from the injected script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'localStorageData') {
        chrome.storage.local.set({ 'userID': message.data })
    }
});