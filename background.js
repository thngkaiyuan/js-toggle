'use strict';

const settingEnum = chrome.contentSettings.JavascriptContentSetting

/**
 * Returns the inverse of the given setting. For example, if the given Javascript setting is
 * either undefined or allow, then the function will return the block setting. Otherwise, the
 * function will assume that the given setting is block and return its inverse - an allow.
 *
 * @param {JavascriptContentSetting} setting     The JavascriptContentSetting which we want to invert.
 * @return {JavascriptContentSetting}            The inverse of the given setting.
 */
function getInverseSetting(setting) {
  if (setting == undefined || setting == settingEnum.ALLOW) {
    return settingEnum.BLOCK;
  } else {
    return settingEnum.ALLOW;
  }
}

/**
 * Returns the "title" or hover text of the extension icon in the browser toolbar for a particular setting
 * (allow/block). It currently describes what will happen if the user clicks on the extension icon.
 *
 * @param {JavascriptContentSetting} setting     The JavascriptContentSetting which we use to compose the title.
 * @return {string}                              The text that will be displayed when the user hovers over the
 *                                               extension's toolbar icon.
 */
function getTitleForSetting(setting) {
  const inverseSetting = getInverseSetting(setting);
  return `Click to ${inverseSetting} Javascript on this page`;
}

/**
 * Returns the path(s) of the extension's toolbar icon for a particular setting (allow/block).
 *
 * @param {JavascriptContentSetting} setting     The JavascriptContentSetting that decides what icon will be displayed.
 * @return {{[size: string]: string}}            A dictionary of sizes to relative file paths for icons of those sizes.
 */
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

/**
 * This is the function that actually persists all the browser settings (e.g. Javascript block/allow,
 * extension's toolbar icon, extension's toolbar title) for a given tab.
 *
 * @param {number} tabID              ID of the tab that we're operating on.
 * @param {string} url                URL loaded in the given tab.
 * @param {boolean} shouldInvert      Whether we should invert the Javascript setting of the given tab.
 */
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

/**
 * Queries the current active tab for its ID and framed URL before invoking setForURL() with those information
 * to set the browser settings for the current active tab.
 *
 * @param {boolean} shouldInvert      Whether we should invert the Javascript setting of the current active tab.
 */
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

/**
 * Toggles the Javascript setting of the current active tab (i.e. allow/undefined → block, and vice-versa).
 */
async function toggleForCurrentTab(command) {
  await setForCurrentTab(true);
}

/**
 * Sets the browser's settings (e.g. extension's toolbar icon/title) for the current active tab without inverting
 * its existing Javascript setting.
 */
async function setToolbarForCurrentTab() {
  await setForCurrentTab(false);
}

/**
 * Listeners for updating the extension's toolbar icon/title when tab/URL is changed, for instance.
 */
chrome.runtime.onInstalled.addListener(setToolbarForCurrentTab);
chrome.tabs.onUpdated.addListener(setToolbarForCurrentTab);
chrome.tabs.onActivated.addListener(setToolbarForCurrentTab);

/**
 * Listeners for toggling the current Javascript setting when the extension's hotkey/command is pressed, or when the
 * extension's toolbar icon is clicked.
 */
chrome.commands.onCommand.addListener(toggleForCurrentTab);
chrome.browserAction.onClicked.addListener(toggleForCurrentTab);