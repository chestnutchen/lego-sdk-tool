var waiting = (function () {
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
})();

waiting(true);

function sendMessage(data, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, data, callback || function () {});
    });
}

function initPopup(ECOM_MA_LEGO) {
    if (ECOM_MA_LEGO && ECOM_MA_LEGO.length) {
        waiting(true);
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
            $('#sdk-tool-container').html(tmpl);
            $('#sdk-tool-container').delegate('.set-sdk-value-btn, .sdk-get-value-copy', 'click', function (e) {
                var button = $(e.currentTarget);
                var index = button.attr('index');
                if (button.attr('class') === 'set-sdk-value-btn') {
                    sendMessage({
                        SET_SDK_VALUE: true,
                        SDK_NAME: ECOM_MA_LEGO[index].id,
                        value: $('.sdk-set-value:eq(' + index + ')').val()
                    });
                }
                else if (button.attr('class') === 'sdk-get-value-copy') {
                    $('.sdk-raw-value:eq(' + index +')').select();
                    document.execCommand('copy');
                }
            });
            waiting(false);
        });
    }
    else {
        $('#sdkNotFound').show();
        waiting(false);
    }
}

$(function() {
    chrome.runtime.onMessage.addListener(function(request) {
        if (request.RECEIVE_SDK_OBJECT && request.ECOM_MA_LEGO) {
            initPopup(request.ECOM_MA_LEGO);
        }
    });
    sendMessage({ GET_SDK_OBJECT: true }, function (response) {
        if (response && response.RECEIVE_SDK_OBJECT && response.ECOM_MA_LEGO) {
            initPopup(response.ECOM_MA_LEGO);
        }
    });
});