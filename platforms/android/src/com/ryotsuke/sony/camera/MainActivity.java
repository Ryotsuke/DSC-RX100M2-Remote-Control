/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
 */

package com.ryotsuke.sony.camera;

import android.content.Context;
import android.os.Bundle;
import android.os.PowerManager;
import android.view.WindowManager;
import org.apache.cordova.*;

public class MainActivity extends CordovaActivity
{
    PowerManager.WakeLock wl;

    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        cordovaInterface.getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wl = pm.newWakeLock(PowerManager.SCREEN_DIM_WAKE_LOCK, "My Tag");

        // Set by <content src="index.html" /> in config.xml
        loadUrl(launchUrl);

    }

    @Override
    protected void onResume() {
        wl.acquire();
        super.onResume();
    }

    @Override
    protected void onPause() {
        wl.release();
        super.onPause();
    }
}
