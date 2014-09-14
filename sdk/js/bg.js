chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.GET_SDK_PERMISSION_RULES) {
        if (!window.localStorage.getItem('legoSdkToolPermission')) {
            window.localStorage.setItem('legoSdkToolPermission', '/http:\\/\\/.*\\.baidu\\.com/');
        }
        sendResponse({ permission: window.localStorage.getItem('legoSdkToolPermission') });
    }
    else if (request.RECEIVE_SDK_PERMISSION) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.pageAction.show(tabs[0].id);
        });
    }
}, false);
