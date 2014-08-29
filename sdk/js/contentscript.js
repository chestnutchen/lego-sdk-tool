function checkPermission(pattern) {
    var url = location.href;
    pattern = pattern.replace(/(?:^\s+)|(?:\s+$)/, '');
    if (pattern.match('\/.*\/')){
        pattern = new RegExp(pattern.slice(1, pattern.length - 1));
        return pattern.test(url);
    }
    else {
        return url.indexOf('pattern') > -1;
    }
}

(function () {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = chrome.extension.getURL('js/runtime.js');
    document.head.appendChild(script);
})();

chrome.runtime.sendMessage({ GET_SDK_PERMISSION: true }, function(response) {
    var permission = response.permission.split(',');

    for (var i = 0, l = permission.length; i < l; i++) {
        if (checkPermission(permission[i])) {
            chrome.runtime.sendMessage({ RECEIVE_SDK_PERMISSION: true });
            break;
        }
    }
});

window.addEventListener('message', function (e) {
    if (e.data && e.data.RECEIVE_SDK_OBJECT_ON_PAGE) {
        var ECOM_MA_LEGO = e.data.ECOM_MA_LEGO;
        chrome.runtime.sendMessage({ RECEIVE_SDK_OBJECT: true, ECOM_MA_LEGO: ECOM_MA_LEGO });
    }
    else if (e.data.RECEIVE_ERROR_ON_PAGE) {
        chrome.runtime.sendMessage({
            RECEIVE_ERROR: true,
            message: e.data.message
        });
    }
    else if (e.data.RECEIVE_SET_SUCCESS_ON_PAGE) {
        chrome.runtime.sendMessage({
            RECEIVE_SET_SUCCESS: true
        });
    }
});

chrome.runtime.onMessage.addListener(function(request) {
    if (request.GET_SDK_OBJECT) {
        window.postMessage({ GET_SDK_OBJECT_ON_PAGE: true }, '*');
    }
    else if (request.SET_SDK_VALUE) {
        window.postMessage({
            SET_SDK_VALUE_ON_PAGE: true,
            SDK_NAME: request.SDK_NAME,
            value: request.value
        }, '*');
    }
}, false);