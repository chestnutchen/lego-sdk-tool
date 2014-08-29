$(function(){
    var permission = window.localStorage.getItem('legoSdkToolPermission') || '/http:\\/\\/.*\\.baidu\\.com/';
    $('#sdkPermission').val(permission);
    $('#sdkPermissionSave').click(function () {
        var val = $('#sdkPermission').val() || '/http:\\/\\/.*\\.baidu\\.com/';
        window.localStorage.setItem('legoSdkToolPermission', val);
    });

    var text = '收起';
    $('#check').click(function () {
        var tmp = $(this).text();
        $(this).text(text);
        text = tmp;
        $('#pic').toggle();
    });
});