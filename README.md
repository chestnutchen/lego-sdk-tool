legoSdkTool
===========

> Chrome extension of lego sdk tool for bdd

## *nix
### How to use
1. download `sdk.crx`
2. use chrome and type `chrome://extensions/` in the address bar
3. drag `sdk.crx` into the page and confirm installing
4. browse a website which hits `http://*.baidu.com/*` and you can see an icon appear at the end of the address bar
5. right click the icon and enter `options` page, configure the authority of this extension and there is a brief tutorial for you

## Windows
### A problem
Chrome Windows above version 37 will block all extension installed outside the chrome app store when we restart chrome.

### A way to avoid this
1. download `legoSdkTool_force_install.reg`
2. double click the `reg` file and it will write force-installation registry into Windows registry.
3. the same as `*nix` step 4-5 

### How to remove
1. download `legoSdkTool_remove.reg`
2. double click the `reg` file and it will remove the registry for this extension.
