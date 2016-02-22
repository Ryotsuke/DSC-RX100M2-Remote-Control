cordova.define("com.ryotsuke.sony.liveview.LiveView", function(require, exports, module) {

var exec = require('cordova/exec'),
    cordova = require('cordova'),
    channel = require('cordova/channel'),
    utils = require('cordova/utils');


function LiveView() {
}

/**
 * Get connection info
 *
 * @param {Function} successCallback The function to call when the Connection data is available
 * @param {Function} errorCallback The function to call when there is an error getting the Connection data. (OPTIONAL)
 */
LiveView.prototype.startLiveView = function(url, successCallback, errorCallback) {
    exec(successCallback, errorCallback, "LiveView", "startLiveView", [url]);
};

LiveView.prototype.connectToCamera = function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "LiveView", "connectToCamera", []);
};

LiveView.prototype.connectToInternet = function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "LiveView", "connectToInternet", []);
};

var me = new LiveView();


module.exports = me;
});
