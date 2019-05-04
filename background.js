'use strict';

const settingEnum = chrome.contentSettings.JavascriptContentSetting

function getInverseSetting(setting) {
  if (setting == undefined || setting == settingEnum.ALLOW) {
    return settingEnum.BLOCK;
  } else {
    return settingEnum.ALLOW;
  }
}

function getTitleForSetting(setting) {
  const inverseSetting = getInverseSetting(setting);
  return `Click to ${inverseSetting} Javascript on this page`;
}

function getIconForSetting(setting) {
  if (setting == undefined) {
    setting = settingEnum.ALLOW;
  }
  return {
    '16': `images/${setting}-16.png`,
    '32': `images/${setting}-32.png`,
    '48': `images/${setting}-48.png`,
  };
}

async function setForURL(tabID, url, shouldInvert) {
  url = new URL(url);
  if (url.protocol != 'https:' && url.protocol != 'http:') {
    return chrome.browserAction.disable(tabID);
  }
  chrome.browserAction.enable(tabID);
  var pattern = `${url.origin}/*`;
  const settings = await new Promise(resolve => {
      chrome.contentSettings.javascript.get({'primaryUrl': pattern}, settings => { resolve(settings); });
  });
  const finalSetting = shouldInvert ? getInverseSetting(settings.setting) : settings.setting;
  chrome.contentSettings.javascript.set({'primaryPattern': pattern, 'setting': finalSetting});
  chrome.browserAction.setIcon({'tabId': tabID, 'path': getIconForSetting(finalSetting)});
  chrome.browserAction.setTitle({'tabId': tabID, 'title': getTitleForSetting(finalSetting)});
}

async function setForCurrentTab(shouldInvert) {
  const tabs = await new Promise(resolve => {
    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, tabs => { resolve(tabs); });    
  });
  if (tabs == undefined || tabs.length == 0 || tabs[0].url == undefined) {
    return;
  }
  const url = tabs[0].url;
  const tabID = tabs[0].id;
  await setForURL(tabID, url, shouldInvert);
}

async function toggleForCurrentTab(command) {
  await setForCurrentTab(true);
}

async function setToolbarForCurrentTab() {
  await setForCurrentTab(false);
}

chrome.runtime.onInstalled.addListener(setToolbarForCurrentTab);
chrome.tabs.onUpdated.addListener(setToolbarForCurrentTab);
chrome.tabs.onActivated.addListener(setToolbarForCurrentTab);
chrome.commands.onCommand.addListener(toggleForCurrentTab);
chrome.browserAction.onClicked.addListener(toggleForCurrentTab);