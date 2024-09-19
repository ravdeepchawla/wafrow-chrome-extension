// Function to get local storage data
function getLocalStorageData() {
    const data = localStorage.getItem('userID');
    if (data) {
        chrome.runtime.sendMessage({ type: 'localStorageData', data: data });
    }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getLocalStorage") {
        getLocalStorageData();
    }
});