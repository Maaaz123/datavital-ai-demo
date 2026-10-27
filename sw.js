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
define(['./workbox-27418b2a'], (function (workbox) { 'use strict';

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
    "revision": "163441bea88b1b7f293fa93be5f6113d"
  }, {
    "url": "favicon.svg",
    "revision": "294d223cf35255343cf5e00adfb0d52a"
  }, {
    "url": "assets/workbox-window.prod.es5-BBnX5xw4.js",
    "revision": null
  }, {
    "url": "assets/useMutation-CmwDKOCg.js",
    "revision": null
  }, {
    "url": "assets/useDomainSituation-pAJHR7g7.js",
    "revision": null
  }, {
    "url": "assets/unavailableKpis-CVWt1YY1.js",
    "revision": null
  }, {
    "url": "assets/typography-D6WISFyv.js",
    "revision": null
  }, {
    "url": "assets/surgery-CmGS5lYX.js",
    "revision": null
  }, {
    "url": "assets/situationFromKpis-ffeP0NXL.js",
    "revision": null
  }, {
    "url": "assets/radiology-C_P9PT-K.js",
    "revision": null
  }, {
    "url": "assets/pwa-CxqollrA.js",
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
    "url": "assets/patients-D4LWOBDB.js",
    "revision": null
  }, {
    "url": "assets/opsDemo-NeoFx5AJ.js",
    "revision": null
  }, {
    "url": "assets/laboratory-xsKQX2Gx.js",
    "revision": null
  }, {
    "url": "assets/index-DOHCCaye.js",
    "revision": null
  }, {
    "url": "assets/index-CNVhQg1p.js",
    "revision": null
  }, {
    "url": "assets/index-C6PJkJAZ.css",
    "revision": null
  }, {
    "url": "assets/index-BTO_e-qP.js",
    "revision": null
  }, {
    "url": "assets/format-D_3kuBCI.js",
    "revision": null
  }, {
    "url": "assets/executive-Lo90xbi5.js",
    "revision": null
  }, {
    "url": "assets/emergency-Bz46bEVv.js",
    "revision": null
  }, {
    "url": "assets/dataPlatform-D40x8czl.js",
    "revision": null
  }, {
    "url": "assets/chartHeadlines-CdzseCym.js",
    "revision": null
  }, {
    "url": "assets/beds-DOKZpPW1.js",
    "revision": null
  }, {
    "url": "assets/alerts-DgrwGFqO.js",
    "revision": null
  }, {
    "url": "assets/ai-QN5B9ij3.js",
    "revision": null
  }, {
    "url": "assets/WorkforceStatusChip-Dv0rND8v.js",
    "revision": null
  }, {
    "url": "assets/WorkforceEmployeeProfilePage-BmTlPDNJ.js",
    "revision": null
  }, {
    "url": "assets/WorkforceDashboard-C4MoY7c5.js",
    "revision": null
  }, {
    "url": "assets/VitalSignsGrid-DTda7pwx.js",
    "revision": null
  }, {
    "url": "assets/TableRow-NctH7TRB.js",
    "revision": null
  }, {
    "url": "assets/TablePagination-Cff2Yl43.js",
    "revision": null
  }, {
    "url": "assets/SurgeryDashboard-BTOUSiHe.js",
    "revision": null
  }, {
    "url": "assets/StatusBadge-DEqMNSpo.js",
    "revision": null
  }, {
    "url": "assets/Skeleton-BnWLCmjj.js",
    "revision": null
  }, {
    "url": "assets/SituationSummary-CUx8vp3C.js",
    "revision": null
  }, {
    "url": "assets/RcmDashboard-CpRldP5U.js",
    "revision": null
  }, {
    "url": "assets/RadiologyDashboard-Bzwv0LUE.js",
    "revision": null
  }, {
    "url": "assets/PharmacyDashboard-3OQ2eIbk.js",
    "revision": null
  }, {
    "url": "assets/PatientsPage-BEczebwY.js",
    "revision": null
  }, {
    "url": "assets/PatientRiskCard-CDybdIgc.js",
    "revision": null
  }, {
    "url": "assets/Patient360Page-xD0X8-Dr.js",
    "revision": null
  }, {
    "url": "assets/PageIntroduction-DOwFqX5c.js",
    "revision": null
  }, {
    "url": "assets/PageHeader-BfZO6-zM.js",
    "revision": null
  }, {
    "url": "assets/OverrideDialog-DfAQjm2O.js",
    "revision": null
  }, {
    "url": "assets/OutpatientDashboard-CnMNBhkc.js",
    "revision": null
  }, {
    "url": "assets/OutcomeRiskPage-CBB-kXfk.js",
    "revision": null
  }, {
    "url": "assets/OrchestrationPage-BGtgF7hp.js",
    "revision": null
  }, {
    "url": "assets/MoreVert-X5S-UjNU.js",
    "revision": null
  }, {
    "url": "assets/ModelPerformancePanel-lYQVXoRW.js",
    "revision": null
  }, {
    "url": "assets/ModelMonitoringPage-hRa6SDrg.js",
    "revision": null
  }, {
    "url": "assets/ModelLimitationsPanel-b6mnils1.js",
    "revision": null
  }, {
    "url": "assets/MissingDataPanel-Bw9guiSp.js",
    "revision": null
  }, {
    "url": "assets/MiniListTable-SfKf-peC.js",
    "revision": null
  }, {
    "url": "assets/MetricBand-Cs9prXk7.js",
    "revision": null
  }, {
    "url": "assets/MedicationSafetyPage-DrF4nE3I.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-CQ2zqWWL.js",
    "revision": null
  }, {
    "url": "assets/LoadingSkeleton-DnjGQPtC.js",
    "revision": null
  }, {
    "url": "assets/LightbulbOutlined-B_j_h7cM.js",
    "revision": null
  }, {
    "url": "assets/LaboratoryDashboard-GjySxKIx.js",
    "revision": null
  }, {
    "url": "assets/KPICard-D0cCnFZv.js",
    "revision": null
  }, {
    "url": "assets/InpatientDashboard-CR28xOwe.js",
    "revision": null
  }, {
    "url": "assets/InfoOutlined-CoRDtlYh.js",
    "revision": null
  }, {
    "url": "assets/ImagingPage-D3DHfqaI.js",
    "revision": null
  }, {
    "url": "assets/Grid-wQuGR2Pm.js",
    "revision": null
  }, {
    "url": "assets/GovernancePage-DtZvghnK.js",
    "revision": null
  }, {
    "url": "assets/FutureCapabilitiesPage-BPUnTvfz.js",
    "revision": null
  }, {
    "url": "assets/Fullscreen-BzZsmdyG.js",
    "revision": null
  }, {
    "url": "assets/ExecutiveDashboard-Co01FDpM.js",
    "revision": null
  }, {
    "url": "assets/ErrorState-ry2kk3Y9.js",
    "revision": null
  }, {
    "url": "assets/ErrorOutline-D7uxx3I9.js",
    "revision": null
  }, {
    "url": "assets/EmptyState-CnvkwX88.js",
    "revision": null
  }, {
    "url": "assets/EmergencyDashboard-tuqfShod.js",
    "revision": null
  }, {
    "url": "assets/EChart-BlXwQuEf.js",
    "revision": null
  }, {
    "url": "assets/DownloadOutlined-RhGU8M5B.js",
    "revision": null
  }, {
    "url": "assets/DomainPageHeader-cHd-fhr3.js",
    "revision": null
  }, {
    "url": "assets/DialogTitle-B0X_wxjp.js",
    "revision": null
  }, {
    "url": "assets/DiagnosisSupportPage-HdpArwh6.js",
    "revision": null
  }, {
    "url": "assets/DiagnosesDashboard-Dl0B1GXs.js",
    "revision": null
  }, {
    "url": "assets/DeteriorationPage-DHDgpdFd.js",
    "revision": null
  }, {
    "url": "assets/DetailDataTable-CP55xZaN.js",
    "revision": null
  }, {
    "url": "assets/DemoStoryPage-BNfy976h.js",
    "revision": null
  }, {
    "url": "assets/DecisionPriorityList-BXymFrfr.js",
    "revision": null
  }, {
    "url": "assets/DataQualityOpsPage-C2uhgxO5.js",
    "revision": null
  }, {
    "url": "assets/DataPlatformPage-B1FPyWA0.js",
    "revision": null
  }, {
    "url": "assets/DataPipelinesPage-DMYuRGHV.js",
    "revision": null
  }, {
    "url": "assets/DataFreshnessIndicator-CB86Tli1.js",
    "revision": null
  }, {
    "url": "assets/DashboardShell-DNz2rm_5.js",
    "revision": null
  }, {
    "url": "assets/CopilotPage-CzXnqSsd.js",
    "revision": null
  }, {
    "url": "assets/CompactPageHeader-Bu0KuR28.js",
    "revision": null
  }, {
    "url": "assets/CommandCenterPage-Bqj8tc2-.js",
    "revision": null
  }, {
    "url": "assets/ClinicalReviewForm-CT_37fYG.js",
    "revision": null
  }, {
    "url": "assets/ClinicalAIPageHeader-DFdBLinz.js",
    "revision": null
  }, {
    "url": "assets/CheckCircleOutline-CycHjUPt.js",
    "revision": null
  }, {
    "url": "assets/ChartSection-DCcVFONn.js",
    "revision": null
  }, {
    "url": "assets/CardHeader-CKyaFAf1.js",
    "revision": null
  }, {
    "url": "assets/CardContent-CjPyxpi9.js",
    "revision": null
  }, {
    "url": "assets/BedsDashboard-D4KxfhHG.js",
    "revision": null
  }, {
    "url": "assets/AutoAwesomeOutlined-BB_5Ewcb.js",
    "revision": null
  }, {
    "url": "assets/AssetPage-BJ7X-guI.js",
    "revision": null
  }, {
    "url": "assets/ArrowBack-D3Ta3nCa.js",
    "revision": null
  }, {
    "url": "assets/AppointmentsDashboard-BASXIm5p.js",
    "revision": null
  }, {
    "url": "assets/AnimatedSection-DKOqLXTK.js",
    "revision": null
  }, {
    "url": "assets/AnimatedNumber-R0sQPvVO.js",
    "revision": null
  }, {
    "url": "assets/AlertsDashboard-DtHIsne7.js",
    "revision": null
  }, {
    "url": "assets/AiInsightsPage-BerXa4Nw.js",
    "revision": null
  }, {
    "url": "assets/AiEmergencyIntelligencePage-OTG27-6O.js",
    "revision": null
  }, {
    "url": "assets/AiDataQualityAgentPage-BzRR3J9b.js",
    "revision": null
  }, {
    "url": "assets/AiClaimPreventionPage-CyBVgeGO.js",
    "revision": null
  }, {
    "url": "assets/AiBedForecastPage-D6tU7lwC.js",
    "revision": null
  }, {
    "url": "assets/AiAppointmentOptimizerPage-CHN4XaV9.js",
    "revision": null
  }, {
    "url": "assets/AccordionSummary-B39XDQAa.js",
    "revision": null
  }, {
    "url": "assets/AccessTime-DUNOyPNG.js",
    "revision": null
  }, {
    "url": "assets/AIExecutiveBrief-BDlm4cIG.js",
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
    "cacheName": "html-navigations",
    "networkTimeoutSeconds": 3,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 86400
    })]
  }), 'GET');
  workbox.registerRoute(({
    request,
    url
  }) => request.destination === "style" || request.destination === "script" || request.destination === "font" || /\.(?:js|css|woff2?|ttf|eot)$/i.test(url.pathname), new workbox.StaleWhileRevalidate({
    "cacheName": "static-assets-v2",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 120,
      maxAgeSeconds: 604800
    })]
  }), 'GET');

}));
