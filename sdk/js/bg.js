var MESSAGE = {};

function bindEvents() {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        switch (request.code) {
            case MESSAGE.GET_SDK_PERMISSION_RULES:
                if (!window.localStorage.getItem('legoSdkToolPermission')) {
                    window.localStorage.setItem('legoSdkToolPermission', '/http:\\/\\/.*\\.baidu\\.com/');
                }
                sendResponse({ permission: window.localStorage.getItem('legoSdkToolPermission') });
                break;

            case MESSAGE.RECEIVE_SDK_PERMISSION:
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    chrome.pageAction.show(tabs[0].id);
                });
                break;

            default:
                break;
        }
    }, false);
}

(function init() {
    $.get(chrome.extension.getURL('js/message.json'), function (message) {
        MESSAGE = JSON.parse(message);
        bindEvents();
    });
})();
