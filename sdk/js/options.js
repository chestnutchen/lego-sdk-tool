var Permission = {
    get: function () {
        return window.localStorage.getItem('legoSdkToolPermission') || '/https?:\\/\\/.*\\.baidu\\.com/';
    },
    set: function (permission) {
        window.localStorage.setItem('legoSdkToolPermission', permission);
        $('#sdkPermission').val(permission);
    },
    patch: function () {
        // 挖了个坑，把http升级到两者兼容，太难看了。。。
        var permission = this.get();
        if (permission === '/http:\\/\\/.*\\.baidu\\.com/') {
            permission = '/https?:\\/\\/.*\\.baidu\\.com/';
        }
        this.set(permission);
    }
};

$(function () {
    Permission.patch();

    $('#sdkPermissionSave').click(function () {
        var val = $('#sdkPermission').val();
        Permission.set(val);
        $('#successTip').show(0).delay(2000).hide(0);
    });

    var text = '收起';
    $('#check').click(function () {
        var tmp = $(this).text();
        $(this).text(text);
        text = tmp;
        $('#pic').toggle();
    });
});
