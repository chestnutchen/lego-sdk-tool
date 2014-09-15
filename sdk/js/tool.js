var MESSAGE = {};

var Helper = {
    colors: {
        invalid: '#8B0000',
        valid: '#333',
        warning: '#FFFACD',
        good: '#C0FF3E'
    },

    waiting: (function () {
        var isShow = false;
        return function (toShow) {
            if (toShow && !isShow) {
                $('.sdk-tool-mask').first().show();
                $('.sdk-tool-waiting').first().show();
                isShow = true;
            }
            else if (!toShow && isShow) {
                $('.sdk-tool-mask').first().hide();
                $('.sdk-tool-waiting').first().hide();
                isShow = false;
            }
        };
    })(),

    showTip: (function () {
        var showing = false;
        var queue = [];

        function hideTip(queue) {
            return function () {
                if (!queue.length) {
                    $('#tips').hide();
                    showing = false;
                }
            };
        }

        function setColor(isErr) {
            if (isErr) {
               $('#tips').css('color', '');
               $('#tips').css('background-color', '');
            }
            else {
               $('#tips').css('color', '');
               $('#tips').css('background-color', '');
            }
        }

        return function (tips, isErr) {
            if (!showing) {
                $('#tips').text(tips).show();
                setColor(isErr);
                showing = true;
                setTimeout(hideTip(queue), 2000);
            }
            else {
                queue.push(tips);
                setTimeout(function () {
                    $('#tips').text(queue.shift()).show();
                    setColor(isErr);
                    if (!queue.length) {
                        setTimeout(hideTip(queue), 1500);
                    }
                    else {
                        setTimeout(hideTip(queue), 500);
                    }
                }, 2000);
            }
        };
    })(),

    parseError: function (errMsg) {
    },

    sendMessage: function (data, callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, data, callback);
        });
    }
};

Helper.waiting(true);

function sdkPopup() {
    var bindEvents = function (ECOM_MA_LEGO) {
        $('#sdk-tool-main').undelegate('.set-sdk-value-btn, .sdk-get-value-copy', 'click');
        $('#sdk-tool-main').delegate('.set-sdk-value-btn, .sdk-get-value-copy', 'click', function (e) {
            var button = $(e.currentTarget);
            var index = button.attr('index');
            if (button.hasClass('set-sdk-value-btn')) {
                if (!$('.sdk-set-value:eq(' + index + ')').val()) {
                    Helper.showTip('亲忘了填数据...', true);
                    return;
                }
                Helper.sendMessage({
                    code: MESSAGE.SET_SDK_VALUE,
                    name: ECOM_MA_LEGO[index].id,
                    value: $('.sdk-set-value:eq(' + index + ')').val()
                });
            }
            else if (button.hasClass('sdk-get-value-copy')) {
                $('.sdk-raw-value:eq(' + index +')').select();
                document.execCommand('copy');
                Helper.showTip('复制成功!');
            }
        });
        Helper.waiting(false);
    };

    this.init = function (ECOM_MA_LEGO) {
        if (ECOM_MA_LEGO && ECOM_MA_LEGO.length) {
            Helper.waiting(true);
            $.get(chrome.extension.getURL('../templateForSdk.html'), function (data) {
                var template = data;
                var tmpl = '';
                $.each(ECOM_MA_LEGO, function (index, editor) {
                    var temp = template.replace(/%editorValue%/g, JSON.stringify(editor.value, null, 4));
                    temp = temp.replace(/%legend%/, editor.templateName);
                    temp = temp.replace(/%index%/g, index);
                    if (index === ECOM_MA_LEGO.length - 1) {
                        temp = temp.replace(/%sdk\-editor\-fieldset\-last%/, ' sdk-editor-fieldset-last');
                    }
                    else {
                        temp = temp.replace(/%sdk\-editor\-fieldset\-last%/, '');
                    }
                    tmpl += temp;
                });
                $('#sdk-tool-main').html(tmpl);

                bindEvents(ECOM_MA_LEGO);
            });
        }
        else {
            $('#sdk-tool-main').hide();
            $('#sdkNotFound').show();
            Helper.waiting(false);
        }
    };
}

function materialPopup() {
    var bindEvents = function () {

    };

    this.init = function (materials) {

    };
}

$(function() {
    $.get(chrome.extension.getURL('js/message.json'), function (message) {
        MESSAGE = JSON.parse(message);
        chrome.runtime.onMessage.addListener(function(request) {
            switch (request.code) {
                case MESSAGE.RECEIVE_MATERIALS:
                    if (request.materials && request.materials.length) {
                        var popup = new materialPopup();
                        popup.init(request.materials);
                    }
                    break;

                case MESSAGE.RECEIVE_SDK_OBJECT:
                    if (request.ECOM_MA_LEGO) {
                        var popup = new sdkPopup();
                        popup.init(request.ECOM_MA_LEGO);
                    }
                    break;

                case MESSAGE.RECEIVE_ERROR:
                    var errMsg = request.message;
                    var message = '';
                    if (request.message) {
                        var tokenErr = errMsg.indexOf('Unexpected token') > -1;
                        var endErr = errMsg.indexOf('Unexpected end of input') > -1;
                        if (tokenErr) {
                            message = '数据里边有非法字符：' + errMsg.slice('Unexpected token'.length + 1);
                        }
                        else if (endErr) {
                            message = '数据中存在没有闭合的`中括号`或者`花括号`';
                        }
                    }
                    Helper.showTip(message || '发生了一些错误，中国或成最大输家', true);
                    console.log(errMsg);
                    break;

                case MESSAGE.RECEIVE_SET_SUCCESS:
                    Helper.showTip('设置成功!');
                    break;

                default:
                    break;
            }
        });
        Helper.sendMessage({ code: MESSAGE.GET_SDK_OBJECT });
    });
});
