$(function(){
    var permission = window.localStorage.getItem('legoSdkToolPermission') || '/http:\\/\\/.*\\.baidu\\.com/';
    $('#sdkPermission').val(permission);
    $('#sdkPermissionSave').click(function () {
        var val = $('#sdkPermission').val() || '/http:\\/\\/.*\\.baidu\\.com/';
        window.localStorage.setItem('legoSdkToolPermission', val);
    });
});