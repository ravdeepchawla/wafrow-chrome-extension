chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.getApiToken) {
      chrome.storage.sync.get(['apiToken'], function(result) {
        sendResponse({apiToken: result.apiToken});
      });
      return true;
    }
  });
