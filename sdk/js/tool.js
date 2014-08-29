var Helper = {
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
               $('#tips').css('color', '#8B0000');
               $('#tips').css('background-color', '#FFFACD');
            }
            else {
               $('#tips').css('color', '#333');
               $('#tips').css('background-color', '#C0FF3E');
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
                        setTimeout(hideTip(queue), 2000);
                    }
                    else {
                        setTimeout(hideTip(queue), 1000);
                    }
                }, 2000);
            }
        };
    })(),

    sendMessage: function (data, callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, data, callback || function () {});
        });
    }
};

Helper.waiting(true);

var Popup = (function () {
    var bindEvents = function (ECOM_MA_LEGO) {
        $('#sdk-tool-main').undelegate('.set-sdk-value-btn, .sdk-get-value-copy', 'click');
        $('#sdk-tool-main').delegate('.set-sdk-value-btn, .sdk-get-value-copy', 'click', function (e) {
            var button = $(e.currentTarget);
            var index = button.attr('index');
            if (button.attr('class') === 'set-sdk-value-btn') {
                if (!$('.sdk-set-value:eq(' + index + ')').val()) {
                    Helper.showTip('亲忘了填数据...', true);
                    return;
                }
                Helper.sendMessage({
                    SET_SDK_VALUE: true,
                    SDK_NAME: ECOM_MA_LEGO[index].id,
                    value: $('.sdk-set-value:eq(' + index + ')').val()
                });
            }
            else if (button.attr('class') === 'sdk-get-value-copy') {
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
            $.get(chrome.extension.getURL('../template.html'), function (data) {
                var template = data;
                var tmpl = '';
                if (ECOM_MA_LEGO.length < 2) {
                    template = template.replace(/%sdk\-editor\-fieldset\-first%/, '');
                }
                $.each(ECOM_MA_LEGO, function (index, editor) {
                    var temp = template.replace(/%editorValue%/g, JSON.stringify(editor.value, null, 4));
                    temp = temp.replace(/%legend%/, editor.templateName);
                    temp = temp.replace(/%index%/g, index);
                    if (ECOM_MA_LEGO.length > 1 && index === 0) {
                        temp = temp.replace(/%sdk\-editor\-fieldset\-first%/, ' sdk-editor-fieldset-first');
                    }
                    tmpl += temp;
                });
                $('#sdk-tool-main').html(tmpl);
                $('.sdk-get-value').each(function (index, elem) {
                    if (elem.scrollHeight > 300) {
                        elem.style.width = '480px';
                    }
                });

                bindEvents(ECOM_MA_LEGO);
            });
        }
        else {
            $('#sdk-tool-main').hide();
            $('#sdkNotFound').show();
            Helper.waiting(false);
        }
    };

    return this;
})();

$(function() {
    chrome.runtime.onMessage.addListener(function(request) {
        if (request.RECEIVE_SDK_OBJECT && request.ECOM_MA_LEGO) {
            Popup.init(request.ECOM_MA_LEGO);
        }
        else if (request.RECEIVE_ERROR) {
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
        }
        else if (request.RECEIVE_SET_SUCCESS) {
            Helper.showTip('设置成功!');
        }
    });
    Helper.sendMessage({ GET_SDK_OBJECT: true }, function (response) {
        if (response && response.RECEIVE_SDK_OBJECT && response.ECOM_MA_LEGO) {
            Popup.init(response.ECOM_MA_LEGO);
        }
    });
});