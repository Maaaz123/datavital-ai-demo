/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-d3a36d94'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "refresh.html",
    "revision": "564164eddb28b2f7cb6a31a4efdf6d2d"
  }, {
    "url": "manifest.webmanifest",
    "revision": "6b8f00d8ded200a112f8c6d493b331e0"
  }, {
    "url": "index.html",
    "revision": "0dc96e12899de3a23a6fb973a77609e4"
  }, {
    "url": "favicon.svg",
    "revision": "294d223cf35255343cf5e00adfb0d52a"
  }, {
    "url": "assets/workbox-window.prod.es5-BBnX5xw4.js",
    "revision": null
  }, {
    "url": "assets/pwa-C9-noxGH.js",
    "revision": null
  }, {
    "url": "assets/manrope-vietnamese-800-normal-bvg7iBCV.woff",
    "revision": null
  }, {
    "url": "assets/manrope-vietnamese-800-normal-ClPWri-A.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-vietnamese-700-normal-pt65Fn2Z.woff",
    "revision": null
  }, {
    "url": "assets/manrope-vietnamese-700-normal-CUqMx5-1.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-vietnamese-600-normal-lA7a_7Ok.woff",
    "revision": null
  }, {
    "url": "assets/manrope-vietnamese-600-normal-C1J5PCl_.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-vietnamese-500-normal-DaZ8i3XM.woff",
    "revision": null
  }, {
    "url": "assets/manrope-vietnamese-500-normal-DCXiE_xi.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-latin-ext-800-normal-DdFx7KEb.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-latin-ext-800-normal-BQAQsuQc.woff",
    "revision": null
  }, {
    "url": "assets/manrope-latin-ext-700-normal-eVCcYqtJ.woff",
    "revision": null
  }, {
    "url": "assets/manrope-latin-ext-700-normal-DYOwVNan.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-latin-ext-600-normal-u5Pl7hTU.woff",
    "revision": null
  }, {
    "url": "assets/manrope-latin-ext-600-normal-_gBojHdJ.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-latin-ext-500-normal-dm74KBQw.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-latin-ext-500-normal-EtoS1VaI.woff",
    "revision": null
  }, {
    "url": "assets/manrope-latin-800-normal-uHUdIJgA.woff",
    "revision": null
  }, {
    "url": "assets/manrope-latin-800-normal-BfWYOv1c.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-latin-700-normal-DGRFkw-m.woff",
    "revision": null
  }, {
    "url": "assets/manrope-latin-700-normal-BZp_XxE4.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-latin-600-normal-BqgrALkZ.woff",
    "revision": null
  }, {
    "url": "assets/manrope-latin-600-normal-4f0koTD-.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-latin-500-normal-DMZssgOp.woff",
    "revision": null
  }, {
    "url": "assets/manrope-latin-500-normal-BYYD-dBL.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-greek-800-normal-CDvU698_.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-greek-800-normal-Bw-67qu9.woff",
    "revision": null
  }, {
    "url": "assets/manrope-greek-700-normal-DyfsrCpP.woff",
    "revision": null
  }, {
    "url": "assets/manrope-greek-700-normal-CHUG9PD8.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-greek-600-normal-CF2i9ZRY.woff",
    "revision": null
  }, {
    "url": "assets/manrope-greek-600-normal-BoRV6lzK.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-greek-500-normal-GeMIHyWm.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-greek-500-normal-DyxYGEtJ.woff",
    "revision": null
  }, {
    "url": "assets/manrope-cyrillic-800-normal-BuEMjQU-.woff",
    "revision": null
  }, {
    "url": "assets/manrope-cyrillic-800-normal-AvdZ5mAV.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-cyrillic-700-normal-Dw_fZAg2.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-cyrillic-700-normal-7JNVKxyl.woff",
    "revision": null
  }, {
    "url": "assets/manrope-cyrillic-600-normal-It4mZcQk.woff",
    "revision": null
  }, {
    "url": "assets/manrope-cyrillic-600-normal-DvRl3Mj-.woff2",
    "revision": null
  }, {
    "url": "assets/manrope-cyrillic-500-normal-CNwnNrRC.woff",
    "revision": null
  }, {
    "url": "assets/manrope-cyrillic-500-normal-B1OEZity.woff2",
    "revision": null
  }, {
    "url": "assets/index-DvmHiSYY.js",
    "revision": null
  }, {
    "url": "assets/index-DNRt8v24.css",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-vietnamese-700-normal-CkEo6LDy.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-vietnamese-700-normal-BV5B8Are.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-vietnamese-600-normal-DpPYBSTl.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-vietnamese-600-normal-DgdngZtN.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-vietnamese-500-normal-e4dixQRQ.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-vietnamese-500-normal-BEb3_waV.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-vietnamese-400-normal-fK1oJ5dG.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-vietnamese-400-normal-DG4YqDda.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-ext-700-normal-aMgXseD4.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-ext-700-normal-DZH6Xh-4.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-ext-600-normal-DOrvGEcy.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-ext-600-normal-DIrixKbi.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-ext-500-normal-DakdToA3.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-ext-500-normal-D0aIdm-b.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-ext-400-normal-RBey6euL.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-ext-400-normal-C5H60-Va.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-700-normal-Bxkt5Cjx.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-700-normal-Bth3BMcD.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-600-normal-CuJfVYMP.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-600-normal-Cu4Hd6ag.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-500-normal-BgVn5rGT.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-500-normal-6ng42L7E.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-400-normal-CYLoc0-x.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-latin-400-normal-CDDApCn2.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-greek-700-normal-wyJ6jzdA.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-greek-700-normal-CkZN0sRy.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-greek-600-normal-DzTrcv_p.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-greek-600-normal-D-CqTdkO.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-greek-500-normal-JMMifIXV.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-greek-500-normal-CuWXN6rf.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-greek-400-normal-_efipK4i.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-greek-400-normal-D9ESIMu3.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-ext-700-normal-DCQwxkRk.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-ext-700-normal-BmRLXWpJ.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-ext-600-normal-DUMzJB7m.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-ext-600-normal-Bz0x94Yp.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-ext-500-normal-DB5PtV2g.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-ext-500-normal-Cs5J6C77.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-ext-400-normal-g30qAdWV.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-ext-400-normal-Dsrv2Tcn.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-700-normal-RFb1v-CK.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-700-normal-D_uavGvn.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-600-normal-BGq0mW3O.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-600-normal-71GNu3SW.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-500-normal-CocWQlwt.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-500-normal-ByOcLdNv.woff",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-400-normal-DZqxrq2p.woff2",
    "revision": null
  }, {
    "url": "assets/ibm-plex-sans-cyrillic-400-normal-BTotfTJu.woff",
    "revision": null
  }, {
    "url": "favicon.svg",
    "revision": "294d223cf35255343cf5e00adfb0d52a"
  }, {
    "url": "manifest.webmanifest",
    "revision": "6b8f00d8ded200a112f8c6d493b331e0"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//, /refresh\.html$/]
  }));
  workbox.registerRoute(({
    url
  }) => url.pathname.startsWith("/api/"), new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(({
    request
  }) => request.mode === "navigate", new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(({
    request,
    url
  }) => request.destination === "style" || request.destination === "script" || request.destination === "font" || /\.(?:js|css|woff2?|ttf|eot)$/i.test(url.pathname), new workbox.NetworkFirst({
    "cacheName": "static-assets-v33",
    "networkTimeoutSeconds": 3,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 120,
      maxAgeSeconds: 21600
    })]
  }), 'GET');

}));
