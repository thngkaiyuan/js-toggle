'use strict';

var settingEnum = chrome.contentSettings.JavascriptContentSetting

function getInverseSetting(setting) {
  if (setting == undefined || setting == settingEnum.ALLOW) {
    return settingEnum.BLOCK;
  } else {
    return settingEnum.ALLOW;
  }
}

function getTitleForSetting(setting) {
  var inverseSetting = getInverseSetting(setting);
  return `Click to ${inverseSetting} Javascript on this page`;
}

function getIconForSetting(setting) {
  if (setting == undefined) {
    setting = settingEnum.ALLOW;
  }
  return {
    '16': `images/${setting}-16.png`,
    '32': `images/${setting}-32.png`,
    '48': `images/${setting}-48.png`
  };
}

function setForURL(tabID, url, shouldInvert) {
  url = new URL(url);
  if (url.protocol != 'https:' && url.protocol != 'http:') {
    return chrome.browserAction.disable(tabID);
  }
  chrome.browserAction.enable(tabID);
  var pattern = `${url.origin}/*`;
  chrome.contentSettings.javascript.get(
    {'primaryUrl': pattern},
    function (settings) {
      var finalSetting = shouldInvert ? getInverseSetting(settings.setting) : settings.setting;
      chrome.contentSettings.javascript.set(
        {'primaryPattern': pattern, 'setting': finalSetting}
      );
      chrome.browserAction.setIcon(
        {'tabId': tabID, 'path': getIconForSetting(finalSetting)}
      );
      chrome.browserAction.setTitle(
        {'tabId': tabID, 'title': getTitleForSetting(finalSetting)}
      );
    }
  );
}

function setForCurrentTab(shouldInvert) {
  chrome.tabs.query(
    {'active': true, 'lastFocusedWindow': true},
    function (tabs) {
      if (tabs == undefined || tabs.length == 0 || tabs[0].url == undefined) {
        return;
      }
      var url = tabs[0].url;
      var tabID = tabs[0].id;
      setForURL(tabID, url, shouldInvert);
    }
  );
}

function toggleForCurrentTab(command) {
  setForCurrentTab(true);
}

function setToolbarForCurrentTab() {
  setForCurrentTab(false);
}

chrome.runtime.onInstalled.addListener(setToolbarForCurrentTab);
chrome.tabs.onUpdated.addListener(setToolbarForCurrentTab);
chrome.tabs.onActivated.addListener(setToolbarForCurrentTab);
chrome.commands.onCommand.addListener(toggleForCurrentTab);
chrome.browserAction.onClicked.addListener(toggleForCurrentTab);