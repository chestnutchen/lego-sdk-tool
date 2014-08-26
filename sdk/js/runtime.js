if (!chrome.extension) {
    window.addEventListener('message', function (e) {
        if (e.data && e.data.GET_SDK_OBJECT_ON_PAGE) {
            var ECOM_MA_LEGO = [];
            if (window.ECOM_MA_LEGO) {
                var instances = window.ECOM_MA_LEGO.instances;
                for (var key in instances) {
                    ECOM_MA_LEGO.push({
                        id: key,
                        templateName: instances[key].template.displayName,
                        value: instances[key].getValue()
                    });
                }
            }
            window.postMessage({
                ECOM_MA_LEGO: ECOM_MA_LEGO,
                RECEIVE_SDK_OBJECT_ON_PAGE: true
            }, '*');
        }
        else if (e.data && e.data.SET_SDK_VALUE_ON_PAGE && e.data.SDK_NAME && e.data.value) {
            var name = e.data.SDK_NAME;
            window.ECOM_MA_LEGO.instances[name].setValue(JSON.parse(e.data.value));
        }
    });
}