$(function(){
    var permission = window.localStorage.getItem('legoSdkToolPermission') || '/https?:\\/\\/.*\\.baidu\\.com/';
    $('#sdkPermission').val(permission);
    $('#sdkPermissionSave').click(function () {
        var val = $('#sdkPermission').val() || '/https?:\\/\\/.*\\.baidu\\.com/';
        // 挖了个坑，把http升级到两者兼容，太难看了。。。
        if (val === '/http:\\/\\/.*\\.baidu\\.com/') {
            val = '/https?:\\/\\/.*\\.baidu\\.com/';
        }
        window.localStorage.setItem('legoSdkToolPermission', val);
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
