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

var mainPattern = /http:\/\/lego(:?-off)?\.baidu\.com/;
var listPattern = /http:\/\/lego(:?-off)?\.baidu\.com\/#\/lego\/template\/list/;
// TODO: 缺个遮罩层
function initLegoStickyTool() {
    var templateList = [];
    var templateListByIndex = {};
    var selectedTemplates = [];
    var posShow = '-502px';
    var posHide = '-537px';

    function setRight(right) {
        document.getElementById('legoStickyTool').style.right = right;
    }

    var getCard = (function () {
        var store = {};
        return function (url, templateId) {
            if (store[templateId]) {
                return store[templateId];
            }
            var card = document.createElement('div');
            card.id = 'legoStickyTool-style-card-' + templateId;
            card.className = 'legoStickyTool-style-card';
            var container = document.createElement('div');
            container.className = 'legoStickyTool-style-card-img-con';
            var img = document.createElement('img');
            img.src = url;
            var label = document.createElement('label');
            label.innerText = templateId;
            container.appendChild(img);
            card.appendChild(container);
            card.appendChild(label);
            store[templateId] = card;
            return card;
        };
    })();

    function addCard(card) {
        document.getElementById('legoStickyTool-present').appendChild(card);
    }

    function removeCard(card) {
        document.getElementById('legoStickyTool-present').removeChild(card);
    }

    function showNoCardTips() {
        document.getElementById('legoStickyTool-present-none').style.display = 'block';
    }

    function hideNoCardTips() {
        document.getElementById('legoStickyTool-present-none').style.display = 'none';
    }

    function checkSelectAll() {
        document.getElementById('legoStickyTool-select-all').checked = 'checked';
    }

    function uncheckSelectAll() {
        document.getElementById('legoStickyTool-select-all').checked = '';
    }

    function createLiCallback(li, templateId, screenshot) {
        return function () {
            var index = selectedTemplates.indexOf(templateId);
            if (index !== -1) {
                selectedTemplates.splice(index, 1);
                li.className = li.className.replace(/item\-selected/, '');
                removeCard(getCard(screenshot, templateId));
                if (selectedTemplates.length === 0) {
                    showNoCardTips();
                }
            }
            else {
                selectedTemplates.push(templateId);
                li.className += ' item-selected';
                addCard(getCard(screenshot, templateId));
                hideNoCardTips();
            }
            if (selectedTemplates.length === templateList.length) {
                checkSelectAll();
            }
            else {
                uncheckSelectAll();
            }
        };
    }

    function selectAll(isSelectAll) {
        var lis = document.getElementsByClassName('legoStickyTool-list-item');
        if (isSelectAll) {
            selectedTemplates = templateList.map(function (template) {
                return template.templateId;
            });
            [].forEach.call(lis, function (li, i) {
                if (li.className.indexOf('item-selected') === -1) {
                    li.className += ' item-selected';
                    var screenshot = templateList[i].screenshot;
                    var templateId = templateList[i].templateId;
                    addCard(getCard(screenshot, templateId));
                }
            });
            hideNoCardTips();
        }
        else {
            selectedTemplates = [];
            [].forEach.call(lis, function (li, i) {
                if (li.className.indexOf('item-selected') !== -1) {
                    li.className = li.className.replace(' item-selected', '');
                }
            });
            document.getElementById('legoStickyTool-present').innerHTML
                = '<p id="legoStickyTool-present-none" class="legoStickyTool-present-none">无</p>';
            showNoCardTips();
        }
    }

    function commitToUpdate(templateIds) {
        var failure = {};

        function next(templateId, status, step, url, data, response) {
            if (response && (response.success === true || response.success === 'true')) {
                var result = response.result;
                if (step === 1) {
                    data[2] = [
                        'templateId=' + templateId,
                        'flags=' + JSON.stringify(result.flags),
                        'impls=' + JSON.stringify(result.impls),
                        'spec=' + result.spec,
                        'objectVersion=' + result.objectVersion
                    ].join('&');
                }
                else if (step === 2 && status !== 'RELEASED') {
                    return;
                }

                if (step < 3) {
                    walk(templateId, status, step + 1, url, data);
                }
            }
            else {
                // 重试一次
                if (!failure[templateId]) {
                    walk(templateId, status, step, url, data);
                    failure[templateId] = {
                        templateId: templateId,
                        message: response.message
                    };
                }
                else {
                    // TODO: 提示没有更新成功
                    switch (step) {
                        case 0:
                            break;

                        case 1:
                            break;

                        case 2:
                            break;

                        case 3:
                            break;

                        default:
                            break;
                    }
                }
            }
        }

        function walk(templateId, status, step, url, data) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 304)) {
                    next(templateId, status, step, url, data, JSON.parse(xhr.responseText));
                }
            };
            xhr.open('post', url[step]);
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            xhr.send(data[step]);
        }

        templateIds.forEach(function (templateId, i) {
            var apps = templateListByIndex[templateId].apps;
            var objectVersion = templateListByIndex[templateId].objectVersion;
            var newObjectVersion = parseInt(objectVersion, 10) + 1;
            var status = templateListByIndex[templateId].status;
            var step = 0;
            var url = [
                'http://lego-off.baidu.com/data/template/disable',
                'http://lego-off.baidu.com/data/template/detail',
                'http://lego-off.baidu.com/data/template/impls/submit',
                'http://lego-off.baidu.com/data/template/publish'
            ];
            var data = [
                'templateId=' + templateId + '&objectVersion=' + objectVersion,
                'templateId=' + templateId,
                null,
                'apps=' + apps + '&templateId=' + templateId + '&objectVersion' + newObjectVersion
            ];

            if (status === 'RELEASED') {
                walk(templateId, status, step, url, data);
            }
            else {
                walk(templateId, status, step + 1, url, data);
            }
        });
    }

    function collectList(items) {
        templateList = [];
        templateListByIndex = {};
        items.forEach(function (item, i) {
            var templateId = item.templateId;
            if (templateId && item.templateType === 'JS') {
                var store = {
                    templateName: item.templateName,
                    templateId: templateId,
                    screenshot: item.screenshot,
                    apps: JSON.stringify(item.apps),
                    status: item.status,
                    objectVersion: item.objectVersion
                };
                templateList.push(store);
                templateListByIndex[templateId] = store;
            }
        });
    }

    function getNewList(cb) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 304)) {
                var response = JSON.parse(xhr.responseText);
                if (response.success === true || response.success === 'true') {
                    collectList(response.page.result);
                    cb();
                }
                else {
                    console.log(response);
                }
            }
        };
        xhr.open('post', 'http://lego-off.baidu.com/data/template/list');
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        var index = location.href.indexOf('~');
        var param = index !== -1
            ? location.href.slice(index + 1).replace(/(page)|(order)/g, 'page.$1$2')
            : 'status=&keyword=&creator=&templateId=&appId=&tags=[]&page.pageSize=30&page.pageNo=1&page.orderBy=&page.order=';
        xhr.send(param);
    }

    function createUI() {
        var style = document.createElement('style');
        style.innerHTML = stickyStyleText;
        document.head.appendChild(style);

        // 手误搞了个自定义标签，留着好了
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
        templateList.forEach(function(template, i) {
            var templateId = template.templateId;
            var screenshot = template.screenshot;
            var li = document.createElement('li');
            li.className = 'legoStickyTool-list-item';
            var span = document.createElement('span');
            span.innerText = template.templateName;
            li.appendChild(span);
            toolList.appendChild(li);

            li.addEventListener('click', createLiCallback(li, templateId, screenshot));
        });

        // content
        var contentPresentText = document.createElement('p');
        contentPresentText.className = 'legoStickyTool-present-text';
        contentPresentText.innerText = '当前选中的样式:';
        var present = document.createElement('div');
        present.id = present.className = 'legoStickyTool-present';
        present.innerHTML = '<p id="legoStickyTool-present-none" class="legoStickyTool-present-none">无</p>';

        var operation = document.createElement('div');
        operation.className = 'legoStickyTool-operation';
        var leftSide = document.createElement('div');
        leftSide.className = 'legoStickyTool-operation-left';
        var selectAllInput = document.createElement('input');
        selectAllInput.type = 'checkbox';
        selectAllInput.id = 'legoStickyTool-select-all';
        var selectAllText = document.createElement('label');
        selectAllText.className = 'legoStickyTool-select-all-text';
        selectAllText.setAttribute('for', selectAllInput.id);
        selectAllText.innerText = '全选';
        var commitButton = document.createElement('button');
        commitButton.className = 'legoStickyTool-commit';
        commitButton.innerText = '提交';
        var templateIdTextarea = document.createElement('textarea');
        templateIdTextarea.id = templateIdTextarea.className = 'legoStickyTool-templateId';
        templateIdTextarea.placeholder = '可输入额外的templateId，逗号或换行分割';

        leftSide.appendChild(selectAllInput);
        leftSide.appendChild(selectAllText);
        leftSide.appendChild(commitButton);
        operation.appendChild(leftSide);
        operation.appendChild(templateIdTextarea);
        toolContent.appendChild(contentPresentText);
        toolContent.appendChild(present);
        toolContent.appendChild(operation);
        toolContainer.appendChild(toolList);
        toolContainer.appendChild(toolContent);
        tool.appendChild(toolTitle);
        tool.appendChild(toolContainer);
        document.body.appendChild(tool);

        window.addEventListener('hashchange', function (e) {
            if (!listPattern.test(e.newURL)) {
                setRight(posHide);
            }
            else {
                setRight(posShow);
                getNewList(function () {
                    if (templateList.length) {
                        document.body.removeChild(tool);
                        createUI();
                    }
                });
            }
        });

        tool.addEventListener('mouseleave', function () {
            setRight('-502px');
        }, false);

        toolTitle.addEventListener('click', function () {
            setRight('0');
        }, false);

        selectAllInput.addEventListener('change', function () {
            this.checked ? selectAll(true) : selectAll(false);
        });

        commitButton.addEventListener('click', function () {
            var idString = templateIdTextarea.value.replace(/(\r\n)|\r|\n/g, ',');
            var ids = [];
            if (idString) {
                ids = idString.split(',');
                ids.forEach(function (id, i) {
                    if (selectedTemplates.indexOf(id) !== -1) {
                        ids.splice(i, 1);
                    }
                });
            }
            var templateIds = selectedTemplates.concat(ids);
            templateIds.length > 0 && commitToUpdate(templateIds);
        }, false);
    }

    getNewList(function () {
        if (templateList.length) {
            createUI();
        }
    });
}

initMessage();
if (mainPattern.test(location.href)) {
    initLegoStickyTool();
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
