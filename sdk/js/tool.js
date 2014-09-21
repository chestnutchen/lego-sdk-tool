var popup = {};
var MESSAGE = {};

var Helper = {
    colors: {
        invalid: '#8B0000',
        valid: '#333',
        warning: '#FFFCD1',
        good: '#6AE450'
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
        var lastTip = {};
        var consecutive = 0;
        var cumulativeTime = 0;
        var forwardStartTime = 0;
        var forwardHide = null;

        function _setColor(isErr) {
            if (isErr) {
               $('#tips').css('color', Helper.colors.invalid);
               $('#tips').css('background-color', Helper.colors.warning);
            }
            else {
               $('#tips').css('color', Helper.colors.valid);
               $('#tips').css('background-color', Helper.colors.good);
            }
        }

        function _hideTip() {
            $('#tips').hide();
            consecutive = 0;
            cumulativeTime = 0;
            showing = false;
        }

        function _showTip(tips, isErr, delayForHideAfterShow) {
            showing = true;
            lastTip = {
                tips: tips,
                isErr: isErr
            };
            $('#tips').text(tips).show();
            _setColor(isErr);
            forwardStartTime = (new Date()).getTime();
            forwardHide = setTimeout(
                function () {
                    _hideTip();
                },
                delayForHideAfterShow
            );
        }

        return function (tips, isErr) {
            if (consecutive > 3) {
                return;
            }

            if (!showing) {
                _showTip(tips, isErr, 1500);
            }
            else {
                var now = (new Date()).getTime();
                var displayedTime = now - forwardStartTime;
                var delayForHideAfterShow = 1500;
                clearTimeout(forwardHide);
                if (lastTip.tips === tips) {
                    consecutive++;
                    cumulativeTime += displayedTime;
                    delayForHideAfterShow = (2000 - cumulativeTime > 500) ? 2000 - cumulativeTime : 500;
                }
                else {
                    consecutive = 0;
                    cumulativeTime = 0;
                }
                _showTip(tips, isErr, delayForHideAfterShow);
            }
        };
    })(),

    parseError: function (errMsg) {
        var tokenErr = errMsg.indexOf('Unexpected token') > -1;
        var endErr = errMsg.indexOf('Unexpected end of input') > -1;
        var message = errMsg;
        if (tokenErr) {
            message = '数据里边有非法字符：' + errMsg.slice('Unexpected token'.length + 1);
        }
        else if (endErr) {
            message = '数据中存在没有闭合的`中括号`或者`花括号`';
        }
        return message;
    },

    sendMessage: function (data, callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, data, callback);
        });
    }
};

Helper.waiting(true);

function Popup() {
    this._setValue = function (editor, value) {
        editor.setValue(value);
        editor.moveCursorTo(0, 0);
        editor.clearSelection();
    };

    this._beautifyJSON = function (editor, type) {
        var value = editor.getValue();
        if (type === 'format') {
            value = JSON.stringify(JSON.parse(value), null, 4);
        }
        else {
            value = JSON.stringify(JSON.parse(value));
        }
        this._setValue(editor, value);
    };

    this._initTemplate = function (template, index, length, impl, extraFun) {
        var temp = template.replace(
            /%legend%/,
            impl.templateName
        );
        temp = temp.replace(/%index%/g, index);
        if (index === length - 1) {
            temp = temp.replace(/%fieldset\-last%/, ' fieldset-last');
        }
        else {
            temp = temp.replace(/%fieldset\-last%/, '');
        }

        if (typeof extraFun === 'function') {
            extraFun();
        }

        return temp;
    };

    this._getAndPaintNameSpaceInfo = function (datasource) {
        $.each(datasource, function (index, impl) {
            var templateId = impl.templateId;
            if (templateId) {
                var lego = templateId > 20000000
                    ? 'lego-off'
                    : 'lego';

                $.ajax(
                    'http://' + lego + '.baidu.com/data/template/detail',
                    {
                        dataType: 'json',
                        data: {
                            templateId: templateId
                        },
                        header: {
                            'X-Request-By': 'ERApplication',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    }
                ).done(function (data) {
                    if (data
                        && data.success !== false
                        && data.success !== 'false'
                        && data.result
                        && data.result.impls
                    ) {
                        var ns = data.result.impls[0].ns;
                        datasource[index].namespace = ns;
                        var legend = $('legend:eq(' + index + ')');
                        legend.html(
                            legend.html()
                                + ' - ' + templateId
                                + ' - '
                                + '<a target="_blank" title="去素材库改spec" href="'
                                + 'http://' + lego + '.baidu.com/#/lego/template/js/perform/update~id='
                                    + templateId + '">'
                                    + ns
                                + '</a>'
                        );
                    }
                });
            }
        });
    };
}

function sdkPopup() {
    Popup.call(this);

    var me = this;
    var _editorGet = [];
    var _editorSet = [];

    function _bindEvents(datasource) {
        $('#sdk-tool-main').off(
            'click',
            '.sdk-set-value-btn, .sdk-copy-value, '
                + '.sdk-toggle-value-and-spec, '
                + '.sdk-toggle-get-and-set, .sdk-paste-value, '
                + '.editor-operation'
        );
        $('#sdk-tool-main').on(
            'click',
            '.sdk-set-value-btn, .sdk-copy-value, '
                + '.sdk-toggle-value-and-spec, '
                + '.sdk-toggle-get-and-set, .sdk-paste-value, '
                + '.editor-operation',
            function (e) {
                var button = $(e.currentTarget);
                var index = button.attr('index');
                if (button.hasClass('sdk-set-value-btn')) {
                    var valueToSet = _editorSet[index].getValue();
                    if (!valueToSet) {
                        Helper.showTip('亲忘了填数据...', true);
                        return;
                    }
                    Helper.sendMessage({
                        code: MESSAGE.SET_SDK_VALUE,
                        name: datasource[index].id,
                        index: index,
                        value: valueToSet
                    });
                }
                else if (button.hasClass('sdk-copy-value')) {
                    $('.sdk-raw-value:eq(' + index +')')
                        .val(_editorGet[index].getValue())
                        .select();
                    document.execCommand('copy');

                    Helper.showTip('复制成功!');
                }
                else if (button.hasClass('sdk-paste-value')) {
                    _editorSet[index].setValue('');
                    var rawValueTextarea = $('.sdk-set-value .ace_text-input:eq(' + index +')');
                    rawValueTextarea.select();
                    document.execCommand('paste');

                    Helper.showTip('粘贴成功!');
                }
                else if (button.hasClass('editor-operation')) {
                    var editor = _editorGet[index];
                    var type = 'format';
                    if (button.attr('class').indexOf('set') !== -1) {
                        editor = _editorSet[index];
                    }
                    if (button.attr('class').indexOf('compact') !== -1) {
                        type = 'compact';
                    }
                    try {
                        me._beautifyJSON(editor, type);
                    }
                    catch (err) {
                        var message = Helper.parseError(err.message);
                        Helper.showTip(message, true);
                    }
                }
                else if (button.hasClass('sdk-toggle-get-and-set')) {
                    var target = $('.sdk-fieldset:eq(' + index +')');
                    target.hasClass('sdk-fieldset-toggle')
                        ? button.attr('title', '收起')
                        : button.attr('title', '展开');
                    target.toggleClass('sdk-fieldset-toggle');
                    setTimeout(
                        function () {
                            _editorGet[index].resize();
                            _editorSet[index].resize();
                        },
                        301
                    );
                }
                else if (button.hasClass('sdk-toggle-value-and-spec')) {
                    if (datasource[index].spec) {
                        if (button.hasClass('sdk-view-value')) {
                            me._setValue(_editorGet[index], datasource[index].value);
                            button.attr('title', '查看spec');
                        }
                        else {
                            me._setValue(_editorGet[index], datasource[index].spec);
                            button.attr('title', '查看value');
                        }
                        button.toggleClass('sdk-view-value');
                    }
                }
            }
        );
    }

    function _initAceEditor(datasource) {
        $('.sdk-fieldset').each(function (index, element) {
            var get = $(element).find('.sdk-get-value')[0];
            var set = $(element).find('.sdk-set-value')[0];

            var jsonEditorGet = new ace.edit(get);
            jsonEditorGet.session.setMode('ace/mode/json');
            jsonEditorGet.setTheme('ace/theme/monokai');
            jsonEditorGet.setValue(datasource[index].value);
            jsonEditorGet.setReadOnly(true);
            jsonEditorGet.clearSelection();

            var jsonEditorSet = new ace.edit(set);
            jsonEditorSet.session.setMode('ace/mode/json');
            jsonEditorSet.setTheme('ace/theme/monokai');
            jsonEditorSet.setValue('{}');
            jsonEditorSet.focus();
            jsonEditorSet.moveCursorTo(0, 1);
            jsonEditorSet.clearSelection();

            _editorGet.push(jsonEditorGet);
            _editorSet.push(jsonEditorSet);
        });
    }

    this.datasource = [];

    this.init = function (ECOM_MA_LEGO) {
        if (ECOM_MA_LEGO && ECOM_MA_LEGO.length) {
            this.datasource = ECOM_MA_LEGO;
            Helper.waiting(true);
            $.get(chrome.extension.getURL('../templateForSdk.html'), function (data) {
                var template = data;
                var length = ECOM_MA_LEGO.length;
                var tmpl = '';
                $.each(ECOM_MA_LEGO, function (index, impl) {
                    tmpl += me._initTemplate(template, index, length, impl);
                });
                $('#sdk-tool-main').html(tmpl);
                me._getAndPaintNameSpaceInfo(ECOM_MA_LEGO);
                _initAceEditor(ECOM_MA_LEGO);
                _bindEvents(ECOM_MA_LEGO);
            });
        }
        else {
            $('#sdk-tool-main').hide();
            $('#sdkNotFound').show();
        }
        Helper.waiting(false);
    };

    this.setValue = function (value, index) {
        _editorGet[index].value = value;
        this._setValue(_editorGet[index], value);
    };
}

function materialPopup() {
    Popup.call(this);

    var me = this;
    var _editorSet = [];

    var _bindEvents = function () {
        $('#sdk-tool-main').off(
            'click',
            '.material-copy-value, .editor-operation'
        );
        $('#sdk-tool-main').on(
            'click',
            '.material-copy-value, .editor-operation',
            function (e) {
                var button = $(e.currentTarget);
                var index = button.attr('index');
                if (button.hasClass('')) {

                }
            }
        );

    };

    this.init = function (materials) {
        if (materials && materials.length) {

        }
        else {
            $('#sdk-tool-main').hide();
            $('#sdkNotFound').show();
        }
        Helper.waiting(false);
    };
}

$(function() {
    $.get(chrome.extension.getURL('js/message.json'), function (message) {
        MESSAGE = JSON.parse(message);
        chrome.runtime.onMessage.addListener(function(request) {
            switch (request.code) {
                case MESSAGE.RECEIVE_MATERIAL:
                    if (request.materials && request.materials.length) {
                        popup = new materialPopup();
                        popup.init(request.materials);
                    }
                    break;

                case MESSAGE.RECEIVE_SDK_INFO:
                    if (request.ECOM_MA_LEGO) {
                        popup = new sdkPopup();
                        popup.init(request.ECOM_MA_LEGO);
                    }
                    break;

                case MESSAGE.RECEIVE_ERROR:
                    var errMsg = request.message;
                    var message = '';
                    if (errMsg) {
                        message = Helper.parseError(errMsg);
                    }
                    Helper.showTip(message || '发生了一些错误，中国或成最大输家', true);
                    break;

                case MESSAGE.RECEIVE_SET_SUCCESS:
                    if (request.value) {
                        popup.setValue(request.value, request.index);
                    }
                    Helper.showTip('设置成功!');
                    break;

                default:
                    break;
            }
        });
        Helper.sendMessage({ code: MESSAGE.INIT });
    });
});
