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
    "revision": "315b527b369eae6500b9dcbbd27fe2e1"
  }, {
    "url": "favicon.svg",
    "revision": "294d223cf35255343cf5e00adfb0d52a"
  }, {
    "url": "assets/workbox-window.prod.es5-BBnX5xw4.js",
    "revision": null
  }, {
    "url": "assets/useMutation-DpVweM2M.js",
    "revision": null
  }, {
    "url": "assets/useDomainSituation-CIUeG30e.js",
    "revision": null
  }, {
    "url": "assets/unavailableKpis-CVWt1YY1.js",
    "revision": null
  }, {
    "url": "assets/typography-D6WISFyv.js",
    "revision": null
  }, {
    "url": "assets/surgery-URJQ5RIt.js",
    "revision": null
  }, {
    "url": "assets/situationFromKpis-ffeP0NXL.js",
    "revision": null
  }, {
    "url": "assets/radiology-pjBN1i49.js",
    "revision": null
  }, {
    "url": "assets/pwa-BuEMIx6x.js",
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
    "url": "assets/patients-BALH1l4h.js",
    "revision": null
  }, {
    "url": "assets/opsDemo-CwriF9vM.js",
    "revision": null
  }, {
    "url": "assets/laboratory-BnOJx-oe.js",
    "revision": null
  }, {
    "url": "assets/index-Dthvy27S.css",
    "revision": null
  }, {
    "url": "assets/index-De6faP07.js",
    "revision": null
  }, {
    "url": "assets/index-DWbagWHY.js",
    "revision": null
  }, {
    "url": "assets/index-DMEtTzZp.js",
    "revision": null
  }, {
    "url": "assets/format-aP5SmP9F.js",
    "revision": null
  }, {
    "url": "assets/executive-B7kWLu15.js",
    "revision": null
  }, {
    "url": "assets/emergency-C1awikA_.js",
    "revision": null
  }, {
    "url": "assets/dataPlatform-DsLWju0g.js",
    "revision": null
  }, {
    "url": "assets/chartHeadlines-CdzseCym.js",
    "revision": null
  }, {
    "url": "assets/beds-CqzhWBuC.js",
    "revision": null
  }, {
    "url": "assets/alerts-Bd773EOx.js",
    "revision": null
  }, {
    "url": "assets/ai-SNTqO4ga.js",
    "revision": null
  }, {
    "url": "assets/WorkforceStatusChip-Bw-fyfzA.js",
    "revision": null
  }, {
    "url": "assets/WorkforceEmployeeProfilePage-Bk2AaPmB.js",
    "revision": null
  }, {
    "url": "assets/WorkforceDashboard-2qiLXwUQ.js",
    "revision": null
  }, {
    "url": "assets/VitalSignsGrid-DmtwaME2.js",
    "revision": null
  }, {
    "url": "assets/TableRow-CX6fSsHP.js",
    "revision": null
  }, {
    "url": "assets/TablePagination-CptSfYlG.js",
    "revision": null
  }, {
    "url": "assets/SurgeryDashboard-D98uzLhu.js",
    "revision": null
  }, {
    "url": "assets/StatusBadge-DZmJfkvW.js",
    "revision": null
  }, {
    "url": "assets/Skeleton-CMPxKoi5.js",
    "revision": null
  }, {
    "url": "assets/SituationSummary-Drr0_LhB.js",
    "revision": null
  }, {
    "url": "assets/RcmDashboard-CQ65Ddfd.js",
    "revision": null
  }, {
    "url": "assets/RadiologyDashboard-DMvASmUZ.js",
    "revision": null
  }, {
    "url": "assets/PharmacyDashboard-Brqs7L7M.js",
    "revision": null
  }, {
    "url": "assets/PatientsPage-Bry4T8Rs.js",
    "revision": null
  }, {
    "url": "assets/PatientRiskCard-YHqEgINE.js",
    "revision": null
  }, {
    "url": "assets/Patient360Page-CcCTjVmE.js",
    "revision": null
  }, {
    "url": "assets/PageIntroduction-DM3hIgP_.js",
    "revision": null
  }, {
    "url": "assets/PageHeader-CMV8bUwZ.js",
    "revision": null
  }, {
    "url": "assets/OverrideDialog-C99DPHKN.js",
    "revision": null
  }, {
    "url": "assets/OutpatientDashboard-CJeBGQ8q.js",
    "revision": null
  }, {
    "url": "assets/OutcomeRiskPage-GerOolSI.js",
    "revision": null
  }, {
    "url": "assets/OrchestrationPage-DN9zks_A.js",
    "revision": null
  }, {
    "url": "assets/MoreVert-DLYVt2Xe.js",
    "revision": null
  }, {
    "url": "assets/ModelPerformancePanel-B4xOPDQu.js",
    "revision": null
  }, {
    "url": "assets/ModelMonitoringPage-DBIB9Leo.js",
    "revision": null
  }, {
    "url": "assets/ModelLimitationsPanel-BpjgeSuU.js",
    "revision": null
  }, {
    "url": "assets/MissingDataPanel-BNOvATad.js",
    "revision": null
  }, {
    "url": "assets/MiniListTable-BWfWd5fo.js",
    "revision": null
  }, {
    "url": "assets/MetricBand-BB-d04ra.js",
    "revision": null
  }, {
    "url": "assets/MedicationSafetyPage-ByEoy7HW.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-Bvfz_yh4.js",
    "revision": null
  }, {
    "url": "assets/LoadingSkeleton-ekWrFBLB.js",
    "revision": null
  }, {
    "url": "assets/LightbulbOutlined-BteIoZc9.js",
    "revision": null
  }, {
    "url": "assets/LaboratoryDashboard-Db41S9Mo.js",
    "revision": null
  }, {
    "url": "assets/KPICard-BzL4Jsl3.js",
    "revision": null
  }, {
    "url": "assets/InpatientDashboard-CB03EwAf.js",
    "revision": null
  }, {
    "url": "assets/InfoOutlined-CNSJO4T7.js",
    "revision": null
  }, {
    "url": "assets/ImagingPage-Crrv3roH.js",
    "revision": null
  }, {
    "url": "assets/Grid-CE2-DLLq.js",
    "revision": null
  }, {
    "url": "assets/GovernancePage-bK50edTD.js",
    "revision": null
  }, {
    "url": "assets/FutureCapabilitiesPage-B1PEWxxL.js",
    "revision": null
  }, {
    "url": "assets/Fullscreen-MSyXU_10.js",
    "revision": null
  }, {
    "url": "assets/ExecutiveDashboard-1DuAIc1u.js",
    "revision": null
  }, {
    "url": "assets/ErrorState-BCG3Dyiu.js",
    "revision": null
  }, {
    "url": "assets/ErrorOutline-DcHXvZCc.js",
    "revision": null
  }, {
    "url": "assets/EmptyState-FLikcquh.js",
    "revision": null
  }, {
    "url": "assets/EmergencyDashboard-Dag9ZCZk.js",
    "revision": null
  }, {
    "url": "assets/EChart-SeHhRij2.js",
    "revision": null
  }, {
    "url": "assets/DownloadOutlined-B7B7kQn8.js",
    "revision": null
  }, {
    "url": "assets/DomainPageHeader-D_ftJwGT.js",
    "revision": null
  }, {
    "url": "assets/DialogTitle-CdQMEz3M.js",
    "revision": null
  }, {
    "url": "assets/DiagnosisSupportPage-BB8tP5D0.js",
    "revision": null
  }, {
    "url": "assets/DiagnosesDashboard-1Xxe0Fz2.js",
    "revision": null
  }, {
    "url": "assets/DeteriorationPage-D7NZw7Js.js",
    "revision": null
  }, {
    "url": "assets/DetailDataTable-DFa3hvEs.js",
    "revision": null
  }, {
    "url": "assets/DemoStoryPage-CBfHx8-I.js",
    "revision": null
  }, {
    "url": "assets/DecisionPriorityList-QkvFTj-C.js",
    "revision": null
  }, {
    "url": "assets/DataQualityOpsPage-BevuHZmb.js",
    "revision": null
  }, {
    "url": "assets/DataPlatformPage-6CZQPsYL.js",
    "revision": null
  }, {
    "url": "assets/DataPipelinesPage-D9JDS_rd.js",
    "revision": null
  }, {
    "url": "assets/DataFreshnessIndicator-CWEGc8sS.js",
    "revision": null
  }, {
    "url": "assets/DashboardShell-CRp-QKR4.js",
    "revision": null
  }, {
    "url": "assets/CopilotPage-CX9WTOa9.js",
    "revision": null
  }, {
    "url": "assets/CompactPageHeader-B_Hw2MlL.js",
    "revision": null
  }, {
    "url": "assets/CommandCenterPage-DTIDV8JB.js",
    "revision": null
  }, {
    "url": "assets/ClinicalReviewForm-BRG4Wxjt.js",
    "revision": null
  }, {
    "url": "assets/ClinicalAIPageHeader-Dk3uUMSf.js",
    "revision": null
  }, {
    "url": "assets/CheckCircleOutline-Cmvyy1Pq.js",
    "revision": null
  }, {
    "url": "assets/ChartSection-BGAfAtyI.js",
    "revision": null
  }, {
    "url": "assets/CardHeader-A9cwe3t8.js",
    "revision": null
  }, {
    "url": "assets/CardContent-B9_6ZPDT.js",
    "revision": null
  }, {
    "url": "assets/BedsDashboard-DNYJR0kd.js",
    "revision": null
  }, {
    "url": "assets/AutoAwesomeOutlined-D21Du5rg.js",
    "revision": null
  }, {
    "url": "assets/AssetPage-BEcTIXaS.js",
    "revision": null
  }, {
    "url": "assets/ArrowBack-DoQAj3Yp.js",
    "revision": null
  }, {
    "url": "assets/AppointmentsDashboard-B4sDuCWB.js",
    "revision": null
  }, {
    "url": "assets/AnimatedSection-EAzLoDVQ.js",
    "revision": null
  }, {
    "url": "assets/AnimatedNumber-C2pHSC_n.js",
    "revision": null
  }, {
    "url": "assets/AlertsDashboard-B3Rw_uct.js",
    "revision": null
  }, {
    "url": "assets/AiInsightsPage-xiPu4jHe.js",
    "revision": null
  }, {
    "url": "assets/AiEmergencyIntelligencePage-CWT6fEmy.js",
    "revision": null
  }, {
    "url": "assets/AiDataQualityAgentPage-DHXdkeXU.js",
    "revision": null
  }, {
    "url": "assets/AiClaimPreventionPage-8YuJC9OH.js",
    "revision": null
  }, {
    "url": "assets/AiBedForecastPage-DQsDpMfr.js",
    "revision": null
  }, {
    "url": "assets/AiAppointmentOptimizerPage-BNnwCwJ7.js",
    "revision": null
  }, {
    "url": "assets/AccordionSummary-ByEubPfg.js",
    "revision": null
  }, {
    "url": "assets/AccessTime-DhCzKA8g.js",
    "revision": null
  }, {
    "url": "assets/AIExecutiveBrief-HesM4YhT.js",
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
    "cacheName": "static-assets-v3",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 120,
      maxAgeSeconds: 604800
    })]
  }), 'GET');

}));
