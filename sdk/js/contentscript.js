/**
 * legoSdkTool
 * @file contentScript.js
 * @author chestnut
 * @description 连接runtime->bg(本地存储、权限控制), popup->runtime(操作页面sdk)的中间环境
 */

var MESSAGE = {};

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

/**
 * 注入runtimejs
 * @ignore
 */
function injectRuntimeJs() {
    var input = $('<input type="hidden" id="legoSdkToolMessageJson">');
    input.val(JSON.stringify(MESSAGE));
    var runtimeJs = $('<script>');
    runtimeJs.attr('src', chrome.extension.getURL('js/runtime.js'));
    $('head').append(runtimeJs);
    $('body').append(input);
}

/**
 * 事件绑定
 * @ignore
 */
function bindEvents() {
    // 和popup的交互
    chrome.runtime.onMessage.addListener(function(request) {
        switch (request.code) {
            case MESSAGE.INIT:
                // 收到popup初始化sdk对象请求，向页面获取sdk对象
                window.postMessage({ code: MESSAGE.INIT }, '*');
                break;

            case MESSAGE.SET_SDK_VALUE:
                // 收到popup操作页面sdk对象请求，向页面传递操作sdk信息
                window.postMessage({
                    code: MESSAGE.SET_SDK_VALUE_ON_PAGE,
                    name: request.name,
                    value: request.value
                }, '*');
                break;

            default:
                break;
        }
    }, false);

    // 和页面的交互
    window.addEventListener('message', function (e) {
        if (e.data && e.data.code) {
            switch (e.data.code) {
                case MESSAGE.RECEIVE_MATERIAL_ON_PAGE:
                    // 取得material对象
                    var materials = e.data.materials;
                    chrome.runtime.sendMessage({
                        code: MESSAGE.RECEIVE_MATERIAL,
                        materials: materials
                    });
                    break;

                case MESSAGE.RECEIVE_SDK_INFO_ON_PAGE:
                    // 取得sdk信息
                    var ECOM_MA_LEGO = e.data.ECOM_MA_LEGO;
                    chrome.runtime.sendMessage({
                        code: MESSAGE.RECEIVE_SDK_INFO,
                        ECOM_MA_LEGO: ECOM_MA_LEGO
                    });
                    break;

                case MESSAGE.RECEIVE_ERROR_ON_PAGE:
                    // 页面sdk操作失败消息处理
                    chrome.runtime.sendMessage({
                        code: MESSAGE.RECEIVE_ERROR,
                        message: e.data.message
                    });
                    break;

                case MESSAGE.RECEIVE_SET_SUCCESS_ON_PAGE:
                    // 页面sdk操作成功消息处理
                    chrome.runtime.sendMessage({
                        code: MESSAGE.RECEIVE_SET_SUCCESS
                    });
                    break;

                default:
                    break;
            }
        }
    });
}

/**
 * 初始化插件在页面上的权限、交互
 */
(function init() {
    $.get(chrome.extension.getURL('js/message.json'), function (message) {
        MESSAGE = JSON.parse(message);
        // 获取插件权限，注入runtimejs
        chrome.runtime.sendMessage({ code: MESSAGE.GET_SDK_PERMISSION_RULES }, function(response) {
            var permission = response.permission.split(',');

            for (var i = 0, l = permission.length; i < l; i++) {
                if (checkPermission(permission[i])) {
                    chrome.runtime.sendMessage({ code: MESSAGE.RECEIVE_SDK_PERMISSION });
                    bindEvents();
                    injectRuntimeJs();
                    break;
                }
            }
        });
    });
})();
