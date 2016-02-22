package com.ryotsuke.sony.liveview;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.wifi.WifiConfiguration;
import android.net.wifi.WifiManager;
import android.util.Base64;
import android.util.Log;
import org.apache.cordova.*;
import org.json.JSONArray;
import org.json.JSONException;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

public class LiveView extends CordovaPlugin {


    private static final String LOG_TAG = "LiveView";
    private CallbackContext connectionCallbackContext;
    private SimpleLiveviewSlicer slicer = new SimpleLiveviewSlicer();
    private final BlockingQueue<byte[]> mJpegQueue = new ArrayBlockingQueue<byte[]>(2);

    private Thread liveViewThread = null;

    /**
     * Sets the context of the Command. This can then be used to do things like
     * get file paths associated with the Activity.
     *
     * @param cordova The context of the main Activity.
     * @param webView The CordovaWebView Cordova is running in.
     */
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
        this.connectionCallbackContext = null;
    }

    /**
     * Executes the request and returns PluginResult.
     *
     * @param action            The action to execute.
     * @param args              JSONArry of arguments for the plugin.
     * @param callbackContext   The callback id used when calling back into JavaScript.
     * @return                  True if the action was valid, false otherwise.
     */
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        if(action.equals("connectToCamera")) {
            if(connectToCamera()) {
                PluginResult pluginResult = new PluginResult(PluginResult.Status.OK);
                callbackContext.sendPluginResult(pluginResult);
            } else {
                PluginResult pluginResult = new PluginResult(PluginResult.Status.ERROR);
                callbackContext.sendPluginResult(pluginResult);
            }
        }
        if(action.equals("connectToInternet")) {
            if(connectToInternet()) {
                PluginResult pluginResult = new PluginResult(PluginResult.Status.OK);
                callbackContext.sendPluginResult(pluginResult);
            } else {
                PluginResult pluginResult = new PluginResult(PluginResult.Status.ERROR);
                callbackContext.sendPluginResult(pluginResult);
            }
        }
        if (action.equals("startLiveView")) {
            if(this.liveViewThread!=null) {
                this.slicer.close();
            }
            try {
                this.connectionCallbackContext = callbackContext;
                this.slicer.open(args.getString(0));

                this.liveViewThread = // A thread for retrieving liveview data from server.
                        new Thread() {
                            @Override
                            public void run() {
                                Log.d(LOG_TAG, "Starting retrieving streaming data from server.");
                                try {
                                    while (!LiveView.this.slicer.isClosed()) {
                                        final SimpleLiveviewSlicer.Payload payload = LiveView.this.slicer.nextPayload();
                                        if (payload == null) { // never occurs
                                            Log.e(LOG_TAG, "Liveview Payload is null.");
                                            continue;
                                        }

                                        if (mJpegQueue.size() == 2) {
                                            mJpegQueue.remove();
                                        }
                                        mJpegQueue.add(payload.jpegData);
                                        LiveView.this.sendUpdate(payload.jpegData);
                                    }
                                } catch (IOException e) {
                                    Log.w(LOG_TAG, "IOException while fetching: " + e.getMessage());
                                } finally {
                                    mJpegQueue.clear();
                                }
                            }
                        };
                this.liveViewThread.start();


                PluginResult pluginResult = new PluginResult(PluginResult.Status.OK);
                pluginResult.setKeepCallback(true);
                callbackContext.sendPluginResult(pluginResult);
            } catch (JSONException e) {
                PluginResult pluginResult = new PluginResult(PluginResult.Status.ERROR);
                callbackContext.sendPluginResult(pluginResult);
            } catch (IOException e) {
                e.printStackTrace();
                PluginResult pluginResult = new PluginResult(PluginResult.Status.ERROR);
                callbackContext.sendPluginResult(pluginResult);
            }
            return true;
        }
        return false;
    }

    /**
     * Stop network receiver.
     */
    public void onDestroy() {
       this.slicer.close();
    }

    //--------------------------------------------------------------------------
    // LOCAL METHODS
    //--------------------------------------------------------------------------

    /**
     * Create a new plugin result and send it back to JavaScript
     *
     * @param connection the network info to set as navigator.connection
     */
    private void sendUpdate(byte[] jpeg) {
        if (connectionCallbackContext != null) {
            PluginResult result = new PluginResult(PluginResult.Status.OK, "data:image/jpeg;base64," + Base64.encodeToString(jpeg, Base64.NO_WRAP));
            result.setKeepCallback(true);
            connectionCallbackContext.sendPluginResult(result);
        }
        webView.postMessage("liveview", "data:image/jpeg;base64," + Base64.encodeToString(jpeg, Base64.NO_WRAP));
    }

    private boolean connectToWifi(String networkSSID) {
        ConnectivityManager connMgr = (ConnectivityManager)
                cordova.getActivity().getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo networkInfo = connMgr.getActiveNetworkInfo();

        if (networkInfo != null && networkInfo.isConnected()) {
            WifiManager wifiManager = (WifiManager)cordova.getActivity().getSystemService(Context.WIFI_SERVICE);
            List<WifiConfiguration> list = wifiManager.getConfiguredNetworks();
            for( WifiConfiguration i : list ) {
                if(i.SSID != null && i.SSID.equals("\"" + networkSSID + "\"")) {
                    if(!wifiManager.getConnectionInfo().getSSID().equals(i.SSID)) {
                      //  wifiManager.disconnect();
                        wifiManager.enableNetwork(i.networkId, true);
                        try {
                            wifiManager.wait(10000);
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
                        //  wifiManager.reconnect();
                    }
                    return true;
                }
            }
            return false;
        } else {
            return false;
        }
    }

    private boolean connectToInternet() {
        return connectToWifi("RABBIT");
    }

    private boolean connectToCamera() {
        return connectToWifi("DIRECT-UpC1:DSC-RX100M2");
    }
}
