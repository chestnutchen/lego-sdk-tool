/**
 * legoSdkTool
 * @file contentScript.js
 * @author chestnut
 * @description 连接runtime->bg(本地存储、权限控制), popup->runtime(操作页面sdk)的中间环境
 */

/* 常量定义 */
var MESSAGE = {};
$.get(chrome.extension.getURL('js/message.json'), function (message) {
    MESSAGE = JSON.parse(message);
});

/* 工具方法 */
/**
 * 权限校验方法
 * @param  {string|regexp} pattern
 * @return {boolean}
 */
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


/* 主要逻辑处理 */
// 获取插件权限
chrome.runtime.sendMessage({ GET_SDK_PERMISSION_RULES: true }, function(response) {
    var permission = response.permission.split(',');

    for (var i = 0, l = permission.length; i < l; i++) {
        if (checkPermission(permission[i])) {
            chrome.runtime.sendMessage({ RECEIVE_SDK_PERMISSION: true });
            // var messageJson = $('<script>');
            // messageJson[0].text = 'window[\'LEGOSDKTOOLMESSAGE\'] = ' + JSON.stringify(MESSAGE) + ';';
            var runtimeJs = $('<script>');
            runtimeJs.attr('src', chrome.extension.getURL('js/runtime.js'));
            // $('head').append(messageJson);
            $('head').append(runtimeJs);
            break;
        }
    }
});

/* 事件监听 */
// 和popup的交互
chrome.runtime.onMessage.addListener(function(request) {
    if (request.GET_SDK_OBJECT) {
        // 收到popup初始化sdk对象请求，向页面获取sdk对象
        window.postMessage({ GET_SDK_OBJECT_ON_PAGE: true }, '*');
    }
    else if (request.SET_SDK_VALUE) {
        // 收到popup操作页面sdk对象请求，向页面传递操作sdk信息
        window.postMessage({
            SET_SDK_VALUE_ON_PAGE: true,
            SDK_NAME: request.SDK_NAME,
            value: request.value
        }, '*');
    }
}, false);

// 和页面的交互
window.addEventListener('message', function (e) {
    if (e.data && e.data.RECEIVE_SDK_OBJECT_ON_PAGE) {
        // 获取sdk对象
        var ECOM_MA_LEGO = e.data.ECOM_MA_LEGO;
        chrome.runtime.sendMessage({ RECEIVE_SDK_OBJECT: true, ECOM_MA_LEGO: ECOM_MA_LEGO });
    }
    else if (e.data.RECEIVE_ERROR_ON_PAGE) {
        // 页面sdk操作失败消息处理
        chrome.runtime.sendMessage({
            RECEIVE_ERROR: true,
            message: e.data.message
        });
    }
    else if (e.data.RECEIVE_SET_SUCCESS_ON_PAGE) {
        // 页面sdk操作成功消息处理
        chrome.runtime.sendMessage({
            RECEIVE_SET_SUCCESS: true
        });
    }
});
