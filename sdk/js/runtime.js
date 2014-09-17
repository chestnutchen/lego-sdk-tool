/**
 * legoSdkTool
 * @file runtime.js
 * @author chestnut
 * @description 注入页面的js
 */

var input = document.getElementById('legoSdkToolMessageJson');
var LEGOSDKTOOLMESSAGE = JSON.parse(input.value);
document.body.removeChild(input);

window.addEventListener('message', function (e) {
    if (e.data && e.data.code) {
        switch (e.data.code) {
            case LEGOSDKTOOLMESSAGE.CHECK_SDK_ACTION_TYPE:
                if (window.ECOM_MA_LEGO) {
                    window.postMessage({
                        code: LEGOSDKTOOLMESSAGE.RECEIVE_SDK_ACTION_TYPE,
                        type: LEGOSDKTOOLMESSAGE.SDK
                    }, '*');
                }
                else {
                    for (var key in window) {
                        if (key.match(/m[0-9]+_AD_CONFIG/)) {
                            window.postMessage({
                                code: LEGOSDKTOOLMESSAGE.RECEIVE_SDK_ACTION_TYPE,
                                type: LEGOSDKTOOLMESSAGE.METERIAL
                            }, '*');
                        }
                    }
                }
                break;

            case LEGOSDKTOOLMESSAGE.GET_SDK_OBJECT_ON_PAGE:
                var ECOM_MA_LEGO = [];
                if (window.ECOM_MA_LEGO) {
                    var instances = window.ECOM_MA_LEGO.instances;
                    for (var key in instances) {
                        ECOM_MA_LEGO.push({
                            id: key,
                            templateName: instances[key].template.displayName,
                            value: JSON.stringify(instances[key].getValue())
                        });
                    }
                }
                window.postMessage({
                    code: LEGOSDKTOOLMESSAGE.RECEIVE_SDK_OBJECT_ON_PAGE,
                    ECOM_MA_LEGO: ECOM_MA_LEGO
                }, '*');
                break;

            case LEGOSDKTOOLMESSAGE.SET_SDK_VALUE_ON_PAGE:
                if (e.data.name && e.data.value) {
                    var name = e.data.name;
                    var value = e.data.value;
                    var index = e.data.index;
                    if (window.ECOM_MA_LEGO && window.ECOM_MA_LEGO.instances) {
                        try {
                            window.ECOM_MA_LEGO.instances[name].setValue(JSON.parse(value));
                            window.postMessage({
                                code: LEGOSDKTOOLMESSAGE.RECEIVE_SET_SUCCESS_ON_PAGE,
                                index: index,
                                value: value
                            }, '*');
                        }
                        catch (err) {
                            window.postMessage({
                                code: LEGOSDKTOOLMESSAGE.RECEIVE_ERROR_ON_PAGE,
                                message: err.message
                            }, '*');
                        }
                    }
                    else {
                        window.postMessage({
                            code: LEGOSDKTOOLMESSAGE.RECEIVE_ERROR_ON_PAGE,
                            message: '当前页面sdk对象已被移除 :-('
                        }, '*');
                    }
                }
                break;

            default:
                break;
        }
    }
});
