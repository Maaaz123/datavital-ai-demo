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
define(['./workbox-f4158c38'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "manifest.webmanifest",
    "revision": "567b79fc0f9fc3a156dc4f6694936449"
  }, {
    "url": "index.html",
    "revision": "99f61723c62790164df7f811bbd1b41f"
  }, {
    "url": "favicon.svg",
    "revision": "294d223cf35255343cf5e00adfb0d52a"
  }, {
    "url": "assets/workbox-window.prod.es5-BBnX5xw4.js",
    "revision": null
  }, {
    "url": "assets/useMutation-D31K5RgA.js",
    "revision": null
  }, {
    "url": "assets/useDomainSituation-BKUnSY7g.js",
    "revision": null
  }, {
    "url": "assets/unavailableKpis-CVWt1YY1.js",
    "revision": null
  }, {
    "url": "assets/typography-D6WISFyv.js",
    "revision": null
  }, {
    "url": "assets/surgery-DAEyN6Jm.js",
    "revision": null
  }, {
    "url": "assets/situationFromKpis-ffeP0NXL.js",
    "revision": null
  }, {
    "url": "assets/radiology-DC9O3iaY.js",
    "revision": null
  }, {
    "url": "assets/pwa-C0sNceBP.js",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-700-normal-CV6qDkkj.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-700-normal-BCh_uG_5.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-600-normal-Y4VTTRme.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-600-normal-5YsyKbU1.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-500-normal-DiU8zqi-.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-500-normal-CvE5C8T-.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-400-normal-Cg2kxhWu.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-400-normal-B8TCSmUq.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-700-normal-BajbvANd.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-700-normal-8-d-IyIQ.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-600-normal-DQgPU_Cg.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-600-normal-B0WRRYJ1.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-500-normal-CqEEAICU.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-500-normal-9VZagAe1.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-400-normal-D127hM_v.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-400-normal-2ppkqaOR.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-700-normal-DqEcQeE5.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-700-normal-CfpNZvy6.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-600-normal-DLTa1BUW.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-600-normal-BR_Ojra4.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-500-normal-DYtqi0QS.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-500-normal-Bf-nb4oT.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-400-normal-Dhut76fR.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-400-normal-BDKaGhyp.woff",
    "revision": null
  }, {
    "url": "assets/patients-CAJN-szq.js",
    "revision": null
  }, {
    "url": "assets/opsDemo-GFxKp_bf.js",
    "revision": null
  }, {
    "url": "assets/laboratory-8UNekmPR.js",
    "revision": null
  }, {
    "url": "assets/index-i_2uxXnN.js",
    "revision": null
  }, {
    "url": "assets/index-CuxWfXta.js",
    "revision": null
  }, {
    "url": "assets/index-BOKu1Rko.js",
    "revision": null
  }, {
    "url": "assets/index-20wj5qlM.css",
    "revision": null
  }, {
    "url": "assets/format-CmbxkdZa.js",
    "revision": null
  }, {
    "url": "assets/executive-C1K0zV4j.js",
    "revision": null
  }, {
    "url": "assets/emergency-DuFaMWFo.js",
    "revision": null
  }, {
    "url": "assets/dataPlatform-D6Txtr2_.js",
    "revision": null
  }, {
    "url": "assets/chartHeadlines-CdzseCym.js",
    "revision": null
  }, {
    "url": "assets/beds-CrMC42rs.js",
    "revision": null
  }, {
    "url": "assets/alerts-VXnRsOf_.js",
    "revision": null
  }, {
    "url": "assets/ai-CN2f4byM.js",
    "revision": null
  }, {
    "url": "assets/WorkforceStatusChip-B_TMgR8r.js",
    "revision": null
  }, {
    "url": "assets/WorkforceEmployeeProfilePage-BMCww4Dm.js",
    "revision": null
  }, {
    "url": "assets/WorkforceDashboard-TU3PzyzT.js",
    "revision": null
  }, {
    "url": "assets/VitalSignsGrid-B5-7eRyJ.js",
    "revision": null
  }, {
    "url": "assets/TableRow-BYjKxNS0.js",
    "revision": null
  }, {
    "url": "assets/TablePagination-CcPYaGOQ.js",
    "revision": null
  }, {
    "url": "assets/SurgeryDashboard-BkV3pSre.js",
    "revision": null
  }, {
    "url": "assets/StatusBadge-D-IJyy08.js",
    "revision": null
  }, {
    "url": "assets/Skeleton-DtpXNf1A.js",
    "revision": null
  }, {
    "url": "assets/SituationSummary-Dz_MA5su.js",
    "revision": null
  }, {
    "url": "assets/RcmDashboard-BRdsErkw.js",
    "revision": null
  }, {
    "url": "assets/RadiologyDashboard-Bh4Ein40.js",
    "revision": null
  }, {
    "url": "assets/PharmacyDashboard-BZypZXal.js",
    "revision": null
  }, {
    "url": "assets/PatientsPage-CTKv5NaJ.js",
    "revision": null
  }, {
    "url": "assets/PatientRiskCard-BWJ0mCXA.js",
    "revision": null
  }, {
    "url": "assets/Patient360Page-CxFBChjx.js",
    "revision": null
  }, {
    "url": "assets/PageIntroduction-btVb1xGy.js",
    "revision": null
  }, {
    "url": "assets/PageHeader-DXujdWuA.js",
    "revision": null
  }, {
    "url": "assets/OverrideDialog-orxE3Wzz.js",
    "revision": null
  }, {
    "url": "assets/OutpatientDashboard-CF3FP7s1.js",
    "revision": null
  }, {
    "url": "assets/OutcomeRiskPage-DHqcHSD3.js",
    "revision": null
  }, {
    "url": "assets/OrchestrationPage-BxZWCIJ1.js",
    "revision": null
  }, {
    "url": "assets/MoreVert-BZKbohKQ.js",
    "revision": null
  }, {
    "url": "assets/ModelPerformancePanel-DeN3TDP3.js",
    "revision": null
  }, {
    "url": "assets/ModelMonitoringPage-K_GZNQhv.js",
    "revision": null
  }, {
    "url": "assets/ModelLimitationsPanel-gKv1BVoL.js",
    "revision": null
  }, {
    "url": "assets/MissingDataPanel-CbbVP5pU.js",
    "revision": null
  }, {
    "url": "assets/MiniListTable-CMAwEYT2.js",
    "revision": null
  }, {
    "url": "assets/MetricBand-BC8i-jK4.js",
    "revision": null
  }, {
    "url": "assets/MedicationSafetyPage-CdgSaxDA.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-6fZQset2.js",
    "revision": null
  }, {
    "url": "assets/LoadingSkeleton-DvaQrYnf.js",
    "revision": null
  }, {
    "url": "assets/LightbulbOutlined-D7USvz6w.js",
    "revision": null
  }, {
    "url": "assets/LaboratoryDashboard-BNIzBi-O.js",
    "revision": null
  }, {
    "url": "assets/KPICard-Dh7vsq8r.js",
    "revision": null
  }, {
    "url": "assets/InpatientDashboard-DhBSRmA7.js",
    "revision": null
  }, {
    "url": "assets/InfoOutlined-Ctz0My8V.js",
    "revision": null
  }, {
    "url": "assets/ImagingPage-C7Akjcue.js",
    "revision": null
  }, {
    "url": "assets/Grid-NWFQD8mB.js",
    "revision": null
  }, {
    "url": "assets/GovernancePage-BN9F-ypd.js",
    "revision": null
  }, {
    "url": "assets/FutureCapabilitiesPage-C5v1IICN.js",
    "revision": null
  }, {
    "url": "assets/Fullscreen-B1RaRHSF.js",
    "revision": null
  }, {
    "url": "assets/ExecutiveDashboard-DA1jABUi.js",
    "revision": null
  }, {
    "url": "assets/ErrorState-Cen_Kkwd.js",
    "revision": null
  }, {
    "url": "assets/ErrorOutline-Bo-j39Bi.js",
    "revision": null
  }, {
    "url": "assets/EmptyState-k4VaVYEE.js",
    "revision": null
  }, {
    "url": "assets/EmergencyDashboard-A3MNxRrJ.js",
    "revision": null
  }, {
    "url": "assets/EChart-4lFXGX4J.js",
    "revision": null
  }, {
    "url": "assets/DownloadOutlined-CK8YOUiu.js",
    "revision": null
  }, {
    "url": "assets/DomainPageHeader-DTkwC7vZ.js",
    "revision": null
  }, {
    "url": "assets/DialogTitle-BA1ntihx.js",
    "revision": null
  }, {
    "url": "assets/DiagnosisSupportPage-BPNb4ZcR.js",
    "revision": null
  }, {
    "url": "assets/DiagnosesDashboard-BB9F5Vdk.js",
    "revision": null
  }, {
    "url": "assets/DeteriorationPage-DQ1JInnS.js",
    "revision": null
  }, {
    "url": "assets/DetailDataTable-DzVS2ysl.js",
    "revision": null
  }, {
    "url": "assets/DemoStoryPage-CGvvfSYB.js",
    "revision": null
  }, {
    "url": "assets/DecisionPriorityList-BM4rDFOk.js",
    "revision": null
  }, {
    "url": "assets/DataQualityOpsPage-mIhA3DSr.js",
    "revision": null
  }, {
    "url": "assets/DataPlatformPage-BaLm90A-.js",
    "revision": null
  }, {
    "url": "assets/DataPipelinesPage-dPjRnvS2.js",
    "revision": null
  }, {
    "url": "assets/DataFreshnessIndicator-B9cFEc-W.js",
    "revision": null
  }, {
    "url": "assets/DashboardShell-B3a6zn9s.js",
    "revision": null
  }, {
    "url": "assets/CopilotPage-yqBBAqPr.js",
    "revision": null
  }, {
    "url": "assets/CompactPageHeader-CywgdQBU.js",
    "revision": null
  }, {
    "url": "assets/CommandCenterPage-DoMbd5b9.js",
    "revision": null
  }, {
    "url": "assets/ClinicalReviewForm-GMpoalsK.js",
    "revision": null
  }, {
    "url": "assets/ClinicalAIPageHeader-B3p2Psq-.js",
    "revision": null
  }, {
    "url": "assets/CheckCircleOutline-DSaF0wMO.js",
    "revision": null
  }, {
    "url": "assets/ChartSection-D01KixDM.js",
    "revision": null
  }, {
    "url": "assets/CardHeader-B66zZ3Nr.js",
    "revision": null
  }, {
    "url": "assets/CardContent-BzWcjWVg.js",
    "revision": null
  }, {
    "url": "assets/BedsDashboard-DPnSH7SK.js",
    "revision": null
  }, {
    "url": "assets/AutoAwesomeOutlined-DKza3V2N.js",
    "revision": null
  }, {
    "url": "assets/AssetPage-CS5zP-4h.js",
    "revision": null
  }, {
    "url": "assets/ArrowBack-Byrvrccw.js",
    "revision": null
  }, {
    "url": "assets/AppointmentsDashboard-Br5RzSWD.js",
    "revision": null
  }, {
    "url": "assets/AnimatedSection-BdzrcVS9.js",
    "revision": null
  }, {
    "url": "assets/AnimatedNumber-BunmO2oS.js",
    "revision": null
  }, {
    "url": "assets/AlertsDashboard-C9p_ohyP.js",
    "revision": null
  }, {
    "url": "assets/AiInsightsPage-DjLYAB3u.js",
    "revision": null
  }, {
    "url": "assets/AiEmergencyIntelligencePage-Dgs8AgWG.js",
    "revision": null
  }, {
    "url": "assets/AiDataQualityAgentPage-Cosz4wmN.js",
    "revision": null
  }, {
    "url": "assets/AiClaimPreventionPage-B42TWvdh.js",
    "revision": null
  }, {
    "url": "assets/AiBedForecastPage-B8rWQlpD.js",
    "revision": null
  }, {
    "url": "assets/AiAppointmentOptimizerPage-D1uQOlhT.js",
    "revision": null
  }, {
    "url": "assets/AccordionSummary-Bo2xv6U0.js",
    "revision": null
  }, {
    "url": "assets/AccessTime-BjlViRXX.js",
    "revision": null
  }, {
    "url": "assets/AIExecutiveBrief-BzoHAtCn.js",
    "revision": null
  }, {
    "url": "favicon.svg",
    "revision": "294d223cf35255343cf5e00adfb0d52a"
  }, {
    "url": "manifest.webmanifest",
    "revision": "567b79fc0f9fc3a156dc4f6694936449"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/datavital-ai-demo/index.html"), {
    denylist: [/^\/api\//]
  }));
  workbox.registerRoute(({
    url
  }) => url.pathname.startsWith("/api/"), new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(({
    request
  }) => request.mode === "navigate", new workbox.NetworkFirst({
    "cacheName": "html-navigations-v4",
    "networkTimeoutSeconds": 3,
    plugins: [new workbox.CacheableResponsePlugin({
      statuses: [0, 200, 404]
    }), new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 86400
    })]
  }), 'GET');
  workbox.registerRoute(({
    request,
    url
  }) => request.destination === "style" || request.destination === "script" || request.destination === "font" || /\.(?:js|css|woff2?|ttf|eot)$/i.test(url.pathname), new workbox.StaleWhileRevalidate({
    "cacheName": "static-assets-v4",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 120,
      maxAgeSeconds: 604800
    })]
  }), 'GET');

}));
