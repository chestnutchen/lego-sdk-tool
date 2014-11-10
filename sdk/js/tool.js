/**
 * legoSdkTool
 * @file tool.js
 * @author chestnut
 * @description 弹窗页的逻辑
 */

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
                $('#mask').show();
                $('#waiting').show();
                isShow = true;
            }
            else if (!toShow && isShow) {
                $('#mask').hide();
                $('#waiting').hide();
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
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, data, callback);
        });
    }
};

Helper.waiting(true);

function Popup() {
    this.datasource = [];

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

    this._previous = function (index) {
        var previous = parseInt(index, 10) - 1;
        var top = $('fieldset:eq(' + previous + ')').offset().top;
        $('#container').scrollTop($('#container').scrollTop() + top - 10);
    };

    this._next = function (index) {
        var next = parseInt(index, 10) + 1;
        var top = $('fieldset:eq(' + next + ')').offset().top;
        $('#container').scrollTop($('#container').scrollTop() + top - 10);
    };

    this._getNameSpaceInfo = function (templateId, domain) {
        return $.ajax(
            'http://' + domain + '.baidu.com/data/template/detail',
            {
                dataType: 'json',
                data: {
                    templateId: templateId
                },
                header: {
                    'X-Request-By': 'ERApplication',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                timeout: 1500
            }
        );
    };

    function _bindEvents() {
        $('#menu').on('click', 'li', function (e) {
            var li = $(e.currentTarget);
            var index = li.attr('index');
            $('#main').css('top', -581 * index + 'px');
            $('#menu li.current').removeClass('current');
            li.addClass('current');
        });
    }

    this._initMenu = function (datasource) {
        var tmpl = '';
        $.each(datasource, function (index, impl) {
            var className = index === 0 ? 'class="current"' : '';
            var img = impl.screenshot ? '<img src="' + impl.screenshot + '" />' : '';
            tmpl += ''
                + '<li index="' + index + '" ' + className + '>'
                    + img
                    + (impl.templateName || impl.mcid)
                + '</li>';
        });
        $('#menu ul').html(tmpl).parent().show();
        _bindEvents();
    };

    this.init = function () {
        $('#main').hide();
        $('#sdkNotFound').show();
        Helper.waiting(false);
    };
}

function SdkPopup() {
    Popup.call(this);

    var me = this;
    var _editorGet = [];
    var _editorSet = [];

    this.setValue = function (value, index) {
        _editorGet[index].value = value;
        this._setValue(_editorGet[index], value);
    };

    function _bindEvents(datasource) {
        $('#main').off(
            'click',
            '.sdk-set-value-btn, .sdk-copy-value, '
                + '.sdk-toggle-value-and-spec, '
                + '.sdk-toggle-get-and-set, .sdk-paste-value, '
                + '.editor-operation'
        );
        $('#main').on(
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
                    $('.sdk-raw-value:eq(' + index + ')')
                        .val(_editorGet[index].getValue())
                        .select();
                    document.execCommand('copy');

                    Helper.showTip('复制成功!');
                }
                else if (button.hasClass('sdk-paste-value')) {
                    _editorSet[index].setValue('');
                    var rawValueTextarea = $('.sdk-set-value .ace_text-input:eq(' + index + ')');
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
                    var target = $('.sdk-fieldset:eq(' + index + ')');
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

    function _initTemplate(template, index, length, impl) {
        var templateIdText = impl.templateId
            ? '<span class="text-separate">|</span>' + impl.templateId
            : '';
        var temp = template.replace(
            /%legend%/,
            impl.templateName + templateIdText
        );
        temp = temp.replace(/%index%/g, index);

        var down = '';
        var downClass = '';
        var up = '';
        var upClass = '';
        if (index === length - 1) {
            down = 'disabled';
            downClass = ' icon-not-allowed';
        }
        if (index === 0) {
            up = 'disabled';
            upClass = ' icon-not-allowed';
        }
        temp = temp.replace(/%down\-disabled%/, down);
        temp = temp.replace(/%down\-disabled\-class%/, downClass);
        temp = temp.replace(/%up\-disabled%/, up);
        temp = temp.replace(/%up\-disabled\-class%/, upClass);

        return temp;
    }

    this.init = function (datasource, templateUrl) {
        if (datasource && datasource.length) {
            this.datasource = datasource;
            $.get(chrome.extension.getURL(templateUrl), function (html) {
                var template = html;
                var length = datasource.length;
                var tmpl = '';
                $.each(datasource, function (index, impl) {
                    tmpl += _initTemplate(template, index, length, impl);
                });
                me._initMenu(datasource);
                $('#main').append(tmpl);

                $.each(datasource, function (index, impl) {
                    var templateId = impl.templateId;
                    if (templateId) {
                        var domain = templateId > 20000000
                            ? 'lego-off'
                            : 'lego';
                        me._getNameSpaceInfo(templateId, domain).done(function (data) {
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
                                        + '<span class="text-separate">|</span>'
                                        + '<a target="_blank" title="去素材库改spec" href="'
                                        + 'http://' + domain + '.baidu.com/#/lego/template/js/perform/update~id='
                                            + templateId + '">'
                                            + ns
                                        + '</a>'
                                );
                            }
                        });
                    }
                });
                _initAceEditor(datasource);
                _bindEvents(datasource);
            });
        }
        else {
            $('#main').hide();
            $('#sdkNotFound').show();
        }
        Helper.waiting(false);
    };
}

function MaterialPopup() {
    Popup.call(this);

    var me = this;
    var _editorGet = [];

    function _bindEvents(datasource) {
        $('#main').off(
            'click',
            '.material-copy-value, .material-toggle-value-and-spec, '
                + '.editor-operation'
        );
        $('#main').on(
            'click',
            '.material-copy-value, .material-toggle-value-and-spec, '
                + '.editor-operation',
            function (e) {
                var button = $(e.currentTarget);
                var index = button.attr('index');
                if (button.hasClass('material-copy-value')) {
                    $('.material-raw-value:eq(' + index + ')')
                        .val(_editorGet[index].getValue())
                        .select();
                    document.execCommand('copy');

                    Helper.showTip('复制成功!');
                }
                else if (button.hasClass('material-toggle-value-and-spec')) {
                    if (datasource[index].spec) {
                        if (button.hasClass('material-view-value')) {
                            me._setValue(_editorGet[index], JSON.stringify(datasource[index].value, null, 4));
                            button.attr('title', '查看spec');
                        }
                        else {
                            me._setValue(_editorGet[index], datasource[index].spec);
                            button.attr('title', '查看value');
                        }
                        button.toggleClass('material-view-value');
                    }
                }
                else if (button.hasClass('editor-operation')) {
                    var type = button.attr('class').indexOf('format') !== -1
                        ? 'format'
                        : 'compact';

                    try {
                        me._beautifyJSON(_editorGet[index], type);
                    }
                    catch (err) {
                        var message = Helper.parseError(err.message);
                        Helper.showTip(message, true);
                    }
                }
            }
        );
    }

    function _initAceEditor(datasource) {
        $('.material-fieldset').each(function (index, element) {
            var get = $(element).find('.material-get-value')[0];

            var jsonEditorGet = new ace.edit(get);
            jsonEditorGet.session.setMode('ace/mode/json');
            jsonEditorGet.setTheme('ace/theme/monokai');
            jsonEditorGet.setValue(JSON.stringify(datasource[index].value, null, 4));
            jsonEditorGet.setReadOnly(true);
            jsonEditorGet.clearSelection();

            _editorGet.push(jsonEditorGet);
        });
    }

    function _initTemplate(template, index, length, impl) {
        var temp = template.replace(/%index%/g, index);

        var legend = impl.templateName
            ? impl.templateName + '<span class="text-separate">|</span>' + impl.mcid
                + '<span class="text-separate">|</span>' + impl.templateId
            : impl.mcid + '<span class="text-separate">|</span>' + impl.templateId;
        temp = temp.replace(
            /%legend%/,
            legend
        );

        var templateInfo = impl.ns
            ? ''
                + '<span class="material-template-info">'
                    + '<a target="_blank" title="去素材库改spec" href="'
                    + 'http://' + impl.domain + '.baidu.com/#/lego/template/js/perform/update~id='
                        + impl.templateId + '">'
                        + impl.ns
                    + '</a>'
                    + '<span class="text-separate">|</span>'
                    + '<a class="material-preview" href="###">'
                        + '<span>预览图</span>'
                        + '<img class="material-screenshot" src="' + impl.screenshot + '">'
                    + '</a>'
                + '</span>'
            : '<span>↓该物料的数据：</span>';
        temp = temp.replace(/%templateInfo%/, templateInfo);

        if (impl.spec) {
            temp = temp.replace(/%spec\-disabled%/, '');
            temp = temp.replace(/%spec\-disabled-class%/, '');
        }
        else {
            temp = temp.replace(/%spec\-disabled%/, 'disabled');
            temp = temp.replace(/%spec\-disabled\-class%/, ' icon-not-allowed');
        }

        return temp;
    }

    function _getDecodedUrl(url, cb) {
        return $.get(
            'http://10.95.21.39:8203/hy-tools/click_decoder.php?clkstr=' + url,
            cb
        );
    }

    this.init = function (datasource, templateUrl) {
        var urlPrefixBzc = 'http://bzclk.baidu.com/adrc.php?t=';
        var urlPrefixWWW = 'http://www.baidu.com/adrc.php?t=';
        function walkAndAdd(object, deferredToDecodes) {
            $.each(object, function (key, value) {
                if (typeof value === 'object') {
                    walkAndAdd(value, deferredToDecodes);
                }
                else if (typeof value === 'string'
                    && (value.indexOf(urlPrefixBzc) === 0 || value.indexOf(urlPrefixWWW) === 0)
                ) {
                    deferredToDecodes.push(_getDecodedUrl(value.slice(value.indexOf('=') + 1), function (html) {
                        var regexp = /<br\/>.+extra.+?\[(.+?)\]/;
                        if (html) {
                            var res = regexp.exec(html);
                            if (res && res[1]) {
                                object[key] = res[1];
                            }
                        }
                    }));
                }
            });
        }

        if (datasource && datasource.length) {
            this.datasource = datasource;
            $.get(chrome.extension.getURL(templateUrl), function (html) {
                var template = html;
                var length = datasource.length;
                var tmpl = '';
                var deferreds = [];
                var deferredInfos = [];
                var deferredToDecodes = [];
                $.each(datasource, function (index, impl) {
                    var templateId = impl.templateId;
                    if (templateId) {
                        var domain = templateId > 20000000
                            ? 'lego-off'
                            : 'lego';
                        impl.domain = domain;
                        deferredInfos.push(
                            me._getNameSpaceInfo(templateId, domain)
                        );
                        walkAndAdd(impl, deferredToDecodes);
                    }
                    else {
                        tmpl += _initTemplate(template, index, length, impl);
                    }
                });
                deferreds = deferredInfos.concat(deferredToDecodes);

                $.when.apply($, deferreds).always(function () {
                    var infos = Array.prototype.slice.call(arguments, 0, deferredInfos.length);
                    $.each(infos, function (index, mixRes) {
                        var response = mixRes[0];
                        var impl = datasource[index];
                        if (response
                            && response.success !== false
                            && response.success !== 'false'
                            && response.result
                            && response.result.impls
                        ) {
                            var result = response.result;
                            var temp = result.impls[0];
                            impl.templateName = result.templateName;
                            impl.screenshot = result.screenshot;
                            impl.spec = JSON.stringify(JSON.parse(result.spec), null, 4);
                            impl.ns = temp.ns;
                        }
                        tmpl += _initTemplate(template, index, length, impl);
                    });
                    me._initMenu(datasource);
                    $('#main').append(tmpl);
                    _initAceEditor(datasource);
                    _bindEvents(datasource);
                    Helper.waiting(false);
                });
            });
        }
        else {
            $('#main').hide();
            $('#sdkNotFound').show();
            Helper.waiting(false);
        }
    };
}

$(function() {
    $.get(chrome.extension.getURL('js/message.json'), function (message) {
        MESSAGE = JSON.parse(message);
        chrome.runtime.onMessage.addListener(function (request) {
            switch (request.code) {
                case MESSAGE.RECEIVE_MATERIAL:
                    if (request.materials && request.materials.length) {
                        popup = new MaterialPopup();
                        popup.init(request.materials, '../templateForMaterial.html');
                    }
                    break;

                case MESSAGE.RECEIVE_SDK_INFO:
                    if (request.ECOM_MA_LEGO) {
                        popup = new SdkPopup();
                        popup.init(request.ECOM_MA_LEGO, '../templateForSdk.html');
                    }
                    break;

                case MESSAGE.NODATA:
                    popup = new Popup();
                    popup.init();
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
        Helper.sendMessage({code: MESSAGE.INIT});
    });
});
