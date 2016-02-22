var cameraPreview = $('.camera-preview');
var cameraControls = $('.camera-controls');
var appStatus = $('.app-status');
var cameraURL = "http://10.0.0.1:10000/camera";
var uniqueId = 1000;

var app = {
    // Application Constructor
    initialize: function () {
        app.cameraControls(false);
        this.bindEvents();
        $('#timer').hide();
        this.settings = {
            interval: localStorage.getItem('interval') || 1,
            timeout: localStorage.getItem('timeout') || 3,
            repeats: localStorage.getItem('repeats') || 3
        }
        this.updateFromSettings();
        $(".button-collapse").sideNav();
    },
    updateSettings: function () {
        this.settings = {
            timeout: +$('#photo_timeout').val(),
            repeats: +$('#photo_repeat').val(),
            interval: +$('#photo_interval').val()
        };
        console.log("Settings saved " + JSON.stringify(this.settings));
        localStorage.setItem("interval", this.settings.interval);
        localStorage.setItem("timeout", this.settings.timeout);
        localStorage.setItem("repeats", this.settings.repeats);
    },
    updateFromSettings: function () {
        $('#photo_timeout').val(this.settings.timeout);
        $('#photo_repeat').val(this.settings.repeats);
        $('#photo_interval').val(this.settings.interval);
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        appStatus.find('.js-action-refresh').on('click', function () {
            app.tryConnectToCamera();
        });

        cameraControls.find('.js-action-shoot').on('click', function () {
            app.doShooting().then(function () {
            }, function (err) {
                console.log("CAMERA:SHOOTING:ERR " + JSON.stringify(err));
                alert("CAMERA:SHOOTING:ERR " + JSON.stringify(err));
                app.cameraControls(false);
                appStatus.find('.js-camera-status').removeClass('blue-text').addClass('red-text').html("Failed during shooting").closest('div').fadeIn();
            });
        });
        cameraControls.find('.js-action-liveview').on('click', function () {
            app.startLiveView();
        });
        cameraControls.find('.js-action-gallery').on('click', function () {

            app.openLastFile();
        });
        $('#photo_timeout,#photo_repeat,#photo_interval').bind('change', function () {
            app.updateSettings();
        });


        $(".js-menu-reconnect").click(function () {
            app.tryConnectToCamera();
        });
        $(".js-menu-liveview").click(function () {
            app.startLiveView();
        });
        $(".js-menu-exit").click(function () {
            app.exit();
        });
        $(".js-menu-gallery").click(function () {
            app.openLastFile();
        });
    },
    toggleMenu: function () {
        $('.button-collapse').sideNav('show');
    },
    exit: function () {
        LiveView.connectToInternet(function () {
            navigator.app.exitApp();
        }, function () {
            navigator.app.exitApp();
        });
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function () {
        app.receivedEvent('deviceready');

        setTimeout(function () {
            document.addEventListener("menubutton", function () {
                app.toggleMenu();
            }, true);
        }, 100);

    },
    cameraMethod: function (method, params) {
        var data = {
            method: method,
            params: params || [],
            version: "1.0",
            id: uniqueId++
        };
        console.log("CAMERA:SEND:" + method + JSON.stringify(data) + ":url=" + cameraURL);

        return new Promise(function (resolve, reject) {
            cordovaHTTP.postJson(cameraURL, data, {}, function (response) {
                console.log("CAMERA:CONNECTED:" + method + ":" + response.data);
                try {
                    var res = JSON.parse(response.data);
                    if (res.error) {
                        console.log("CAMERA:CONNECTED:ERR:" + method + ":" + JSON.stringify(res.error));
                        reject(res.error);
                    } else {
                        console.log("CAMERA:CONNECTED:OK:" + method + ":" + JSON.stringify(res.result));
                        resolve(res.result);
                    }
                } catch (e) {
                    console.error("CAMERA:ERROR:JSON parsing error");
                    reject("JSON parsing error");
                }
            }, function (response) {
                console.log("CAMERA:ERROR:" + method + ":" + response.status + ":" + response.error);
                reject(response.error);
            });
            /* $.ajax({
             method: "POST",
             url: cameraURL,
             data: JSON.stringify(data),
             success: function (res, r, xhr) {
             console.log("1CAMERA:CONNECTED:" + method + ":" + xhr.responseText);
             if (res.error) {
             console.log("1CAMERA:CONNECTED:ERR:" + method + ":" + JSON.stringify(res.error));
             reject(res.error);
             } else {
             console.log("1CAMERA:CONNECTED:OK:" + method + ":" + JSON.stringify(res.result));
             resolve(res.result);
             }
             },
             error: function (err, errCode, errString) {
             console.log("1CAMERA:ERROR:" + method + ":" + errString + ":" + err.status + ":" + err.responseText + ":" + err.message);
             reject(errCode);
             }
             });*/
        });

    },
    doShooting: function () {
        this.updateSettings();
        var photo_timeout = this.settings.timeout,
            photo_repeat = this.settings.repeats,
            photo_interval = this.settings.interval;

        return new Promise(function (resolve, reject) {
            app.timeout(photo_timeout, photo_repeat + " photo left").then(function () {
                console.log("Shooting...");
                function shoot() {
                    photo_repeat--;
                    app.shoot(true, 3).then(function () {
                        console.log("Shooting OK " + photo_repeat + " left");
                        if (photo_repeat) {
                            app.timeout(photo_interval, photo_repeat + " photo left").then(function () {
                                shoot();
                            }, reject);
                        } else {
                            app.startLiveView().then(resolve, reject);
                        }
                    }, reject);
                }

                shoot();
            }, reject);
        });
    },
    showMessage: function (main, secondary) {
        if (app.hideMessageTimeout) {
            clearTimeout(app.hideMessageTimeout);
        }
        var timer = $('#timer'),
            secondsEl = timer.find('.js-seconds'),
            repeatsEl = timer.find('.js-repeats');
        secondsEl.html(main);
        repeatsEl.html(secondary);
        timer.show();
    },
    hideMessage: function () {
        if (app.hideMessageTimeout) {
            clearTimeout(app.hideMessageTimeout);
        }
        app.hideMessageTimeout = setTimeout(function () {
            $('#timer').hide();
        }, 300);
    },
    timeout: function (seconds, text) {
        if (seconds) {
            return new Promise(function (resolve, reject) {
                var startTime = Date.now();
                if (app.interval) {
                    reject("Previous timer not finished");
                }
                app.showMessage(seconds.toFixed(1), text);
                app.interval = setInterval(function () {
                    var passed = (Date.now() - startTime) / 1000;
                    if (passed > seconds) {
                        clearInterval(app.interval);
                        app.interval = null;
                        app.hideMessage();
                        resolve();
                    } else {
                        app.showMessage((seconds - passed).toFixed(1), text);
                    }
                }, 50);
            });

        } else {
            return Promise.resolve();
        }

    },
    cameraControls: function (on) {
        if (on) {
            cameraControls.children('a').fadeIn();
            cameraControls.children('div').fadeIn();
            appStatus.find('.js-action-refresh').hide();
        } else {
            cameraControls.children('a').fadeOut();
            cameraControls.children('div').fadeOut();
            appStatus.find('.js-action-refresh').show();
        }
    },
    loadLiveView: function (url) {
        $(window).off("liveview");
        LiveView.startLiveView(url, function (e) {
            if (e) {
                //console.log("LIVEVIEW:OK " + (e && e.length) + e.substring(0, 14) + "...");
                cameraPreview.css({
                    'background-image': 'url(' + e + ')'
                });
            }
        }, function (e) {
            console.log("LIVEVIEW:ERROR " + JSON.stringify(e));
        });
    },
    storeLastFile: function (file) {
        localStorage.setItem("fileNative", "" + file.nativeURL);
        localStorage.setItem("fileRelative", "" + file.fullPath);
    },
    openLastFile: function () {
        if (localStorage.getItem("fileNative")) {
            console.log("Gallery opening " + localStorage.getItem("fileNative"));
            cordova.plugins.fileOpener2.open(localStorage.getItem("fileNative"), "image/jpeg");
        }
    },
    loadImage: function (imageUrlObj) {
        return new Promise(function (resolve, reject) {
            var imageUrl = "" + imageUrlObj;

            console.log("Load image " + imageUrl);
            var downloadUrl = imageUrl;
            var relativeFilePath = "PlayMemories/" + (imageUrl.split('/').pop().split('?').shift());  // using an absolute path also does not work
            setTimeout(function () {
                try {
                    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
                        var fileTransfer = new FileTransfer();
                        console.log(fileSystem.root.toURL() + '/' + relativeFilePath);
                        console.log("new FileTransfer Start");
                        fileTransfer.download(
                            downloadUrl,

                            // The correct path!
                            fileSystem.root.toURL() + '/' + relativeFilePath,

                            function (entry) {
                                app.storeLastFile(entry);

                                var img = new Image();
                                img.src = entry.nativeURL;
                                img.onload = function () {
                                    resolve({
                                        width: this.width,
                                        height: this.height
                                    });
                                };
                                img.onerror = function () {
                                    reject(imageUrl + ' is of unknown dimensions.');
                                };
                            },
                            function (error) {
                                console.log("Error during download. Code = " + error.code);
                                reject("Error during download. Code = " + error.code);
                            }
                        );
                    });
                } catch (e) {
                    console.log("Error " + JSON.stringify(e));
                    reject("Error " + JSON.stringify(e));
                }
            }, 100);

        });
    },
    startLiveView: function () {
        app.showMessage('<i class="mdi-av-videocam"></i>', "liveview");
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                app.cameraMethod("startLiveview").then(function (data) {
                    app.loadLiveView(data[0]);
                    app.liveView = true;
                    app.hideMessage();
                }, reject);
            }, 500);
        });
    },
    stopLiveView: function () {
        return app.cameraMethod("stopLiveview").then(function (data) {
            cameraPreview.css({
                'background-image': ''
            });
            app.liveView = false;
        });
    },
    getCameraStatus: function (wait) {
        return new Promise(function (resolve, reject) {
            app.cameraMethod("receiveEvent", [!!wait]).then(function (data) {
                var resolved = false;
                data.forEach(function (currentValue, index) {
                    if (currentValue && currentValue['type'] && currentValue['type'] === 'cameraStatus') {
                        resolve(currentValue.cameraStatus)
                    }
                });
                if (!resolved) {
                    reject("No value returned");
                }
            }, reject);
        });
    },
    getShootMode: function () {
        return new Promise(function (resolve, reject) {
            app.cameraMethod("getShootMode", ["still"]).then(function (data) {
                resolve(data[0]);
            }, reject);
        });
    },
    setShootMode: function (mode) {
        return new Promise(function (resolve, reject) {
            app.getShootMode().then(function (currentMode) {
                if (currentMode != mode) {
                    app.cameraMethod("setShootMode", [mode]).then(function () {
                        resolve(mode);
                    }, reject);
                } else {
                    resolve(mode);
                }
            }, reject)
        });
    },
    shoot: function (preview, tries) {
        app.cameraControls(false);
        app.showMessage('<i class="mdi-image-camera-alt"></i>', "shooting");
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                app.setShootMode("still").then(function () {
                    app.cameraMethod("actTakePicture").then(function (data) {
                        app.cameraControls(true);
                        app.showMessage('<i class="mdi-file-file-download"></i>', "downloading");
                        app.loadImage(data[0]).then(function () {
                            if (preview) {
                                cameraPreview.css({
                                    'background-image': 'url("' + data[0] + '")'
                                });
                            }
                            app.hideMessage();
                            resolve();
                        }, reject);
                    }, function (error) {
                        if (tries > 1) {
                            console.log("Retrying shooting " + tries);
                            setTimeout(function () {
                                app.shoot(preview, tries - 1).then(resolve, reject);
                            }, 500);
                        } else {
                            app.hideMessage();
                            reject(error)
                        }
                    });
                }, reject);
            }, 100);
        });
    },
    tryConnectToCamera: function () {
        appStatus.find('.js-camera-status').removeClass('red-text').addClass('blue-text').html("Searching camera...").closest('div').fadeIn();
        app.cameraControls(false);
        appStatus.find('.js-action-refresh').hide();
        app.showMessage('<i class="mdi-av-repeat"></i>', "connecting");
        LiveView.connectToCamera(function (gateway) {
            app.showMessage('<i class="mdi-av-repeat"></i>', "negotiating");
            $.ajax({
                method: "GET",
                url: "http://10.0.0.1:1900/scalarwebapi_dd.xml",
                success: function (res, r, xhr) {
                    var xml = $($.parseXML(xhr.responseText));
                    var apiURL = xml.find("X_ScalarWebAPI_ActionList_URL").text();
                    console.log(xhr.responseText, apiURL);
                    app.cameraMethod("getVersions").then(function () {
                        app.cameraControls(true);
                        appStatus.find('.js-camera-status').html("Camera ready").closest('div').fadeOut();
                        //app.cameraMethod("getVersions");
                        //app.cameraMethod("getAvailableApiList");
                        //app.cameraMethod("receiveEvent", ["cameraStatus"]);
                        //app.cameraMethod("receiveEvent", []);
                        app.startLiveView();
                    }, function () {
                        app.hideMessage();
                        appStatus.find('.js-action-refresh').show();
                        appStatus.find('.js-camera-status').removeClass('blue-text').addClass('red-text').html("Failed during version check").closest('div').fadeIn();
                    });
                },
                error: function () {
                    app.hideMessage();
                    appStatus.find('.js-action-refresh').show();
                    appStatus.find('.js-camera-status').removeClass('blue-text').addClass('red-text').html("Failed during API init").closest('div').fadeIn();
                }
            });


        }, function () {
            app.hideMessage();
            appStatus.find('.js-action-refresh').show();
            appStatus.find('.js-camera-status').removeClass('blue-text').addClass('red-text').html("Failed connecting to camera WIFI ").closest('div').fadeIn();
        });

    },
    // Update DOM on a Received Event
    receivedEvent: function (id) {
        appStatus.find('.js-init-status').html("Cordova ready").closest('div').fadeOut();
        console.log('Received Event: ' + id);
        app.tryConnectToCamera();
    }
};

app.initialize();