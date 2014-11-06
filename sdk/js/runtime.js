/**
 * legoSdkTool
 * @file runtime.js
 * @author chestnut
 * @description 注入页面的js
 */

var LEGOSDKTOOLMESSAGE;
var stickyStyleText;
function initMessage() {
    var messageInput = document.getElementById('legoSdkToolMessageJson');
    LEGOSDKTOOLMESSAGE = JSON.parse(messageInput.value);
    var styleInput = document.getElementById('stickyStyleText');
    stickyStyleText = styleInput.value;
    document.body.removeChild(messageInput);
    document.body.removeChild(styleInput);
}

function initLegoStickyTool() {
    var templateList = [];

    function setRight(right) {
        document.getElementById('legoStickyTool').style.right = right;
    }

    function createUI() {
        var style = document.createElement('style');
        var styleText = document.createTextNode(stickyStyleText);
        style.appendChild(styleText);
        document.head.appendChild(style);

        var tool = document.createElement('tool');
        tool.id = tool.className = 'legoStickyTool';

        // title
        var toolTitle = document.createElement('div');
        toolTitle.className = 'legoStickyTool-title';
        var titleIcon = document.createElement('img');
        titleIcon.src = 'http://ecma.bdimg.com/adtest/599e5eb3d33e419981a0dad13d903726.png';
        titleIcon.width = titleIcon.height = '25';
        toolTitle.appendChild(titleIcon);

        // container
        var toolContainer = document.createElement('div');
        toolContainer.className = 'legoStickyTool-container';
        var toolList = document.createElement('ul');
        toolList.className = 'legoStickyTool-list';
        var toolContent = document.createElement('div');
        toolContent.className = 'legoStickyTool-content';

        // list


        // content

        toolContainer.appendChild(toolList);
        toolContainer.appendChild(toolContent);
        tool.appendChild(toolTitle);
        tool.appendChild(toolContainer);
        document.body.appendChild(tool);

        window.addEventListener('hashchange', function (e) {
            if (!pattern.test(e.newURL)) {
                setRight('-325px');
            }
            else {
                setRight('-300px');
            }
        });

        tool.addEventListener('mouseleave', function () {
            setRight('-300px');
        }, false);

        toolTitle.addEventListener('click', function () {
            setRight('0');
        }, false);
    }

    var items = document.getElementsByClassName('ui-pageableitemlist-item');
    for (var i = 0, l = items.length; i < l; i++) {
        var nameDiv = items[i].getElementsByClassName('ellipsis-text')[0];
        var templateName = nameDiv && nameDiv.innerText;
        var ul = items[i].getElementsByClassName('list-table-operation')[0];
        if (ul.childNodes.length === 9) {
            var href = ul.childNodes[6].childNodes[0].href;
            var templateId = href.slice(href.indexOf('=') + 1);
            templateId && templateList.push({
                elem: items[i],
                templateName: templateName,
                templateId: templateId
            });
        }
    }

    if (templateList.length) {
        createUI();
    }
}

function checkReady() {
    return document.getElementById('listmain');
}

initMessage();
var pattern = /http:\/\/lego(:?-off)?\.baidu\.com\/#\/lego\/template\/list/;
if (pattern.test(location.href)) {
    setTimeout(function () {
        if (checkReady()) {
            initLegoStickyTool();
        }
        else {
            setTimeout(arguments.callee, 500);
        }
    }, 500);
}

window.addEventListener('message', function (e) {
    if (e.data && e.data.code) {
        switch (e.data.code) {
            case LEGOSDKTOOLMESSAGE.INIT:
                var nodata = true;

                if (window.ECOM_MA_LEGO) {
                    nodata = false;
                    var ECOM_MA_LEGO = [];
                    if (window.ECOM_MA_LEGO) {
                        var instances = window.ECOM_MA_LEGO.instances;
                        for (var key in instances) {
                            ECOM_MA_LEGO.push({
                                id: key,
                                templateName: instances[key].template.displayName,
                                templateId: instances[key].template.templateId,
                                value: JSON.stringify(instances[key].getValue(), null, 4),
                                spec: JSON.stringify(instances[key].template.spec, null, 4)
                            });
                        }
                    }
                    window.postMessage({
                        code: LEGOSDKTOOLMESSAGE.RECEIVE_SDK_INFO_ON_PAGE,
                        ECOM_MA_LEGO: ECOM_MA_LEGO
                    }, '*');
                }
                else {
                    var materials = [];
                    for (var key in window) {
                        var hit = /m([0-9]+)_AD_CONFIG/.exec(key);
                        if (hit) {
                            var mcid = hit[1];
                            var elem = document.getElementById('m' + mcid + '_canvas');
                            if (elem) {
                                var oldmcid = elem.getAttribute('oldmcid');
                                var AD_CONFIG = window[key];
                                var RT_CONFIG = window['m' + mcid + '_RT_CONFIG'];
                                materials.push({
                                    mcid: oldmcid ? oldmcid : mcid,
                                    value: AD_CONFIG, // 之后要利用引用传递的特性，就不stringify了
                                    templateId: RT_CONFIG.timestamp
                                });
                            }
                        }
                    }
                    if (materials.length) {
                        nodata = false;
                        window.postMessage({
                            code: LEGOSDKTOOLMESSAGE.RECEIVE_MATERIAL_ON_PAGE,
                            materials: materials
                        }, '*');
                    }
                }

                if (nodata) {
                    window.postMessage({
                        code: LEGOSDKTOOLMESSAGE.NODATA_ON_PAGE
                    }, '*');
                }

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
