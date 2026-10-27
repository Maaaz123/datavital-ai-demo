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
    "revision": "0ac9c5e4d2c3bfcbff2571bba52a8b3f"
  }, {
    "url": "favicon.svg",
    "revision": "294d223cf35255343cf5e00adfb0d52a"
  }, {
    "url": "assets/workbox-window.prod.es5-BBnX5xw4.js",
    "revision": null
  }, {
    "url": "assets/useMutation-kxzxgxXB.js",
    "revision": null
  }, {
    "url": "assets/useDomainSituation-D8Z-hOeg.js",
    "revision": null
  }, {
    "url": "assets/unavailableKpis-CVWt1YY1.js",
    "revision": null
  }, {
    "url": "assets/typography-D6WISFyv.js",
    "revision": null
  }, {
    "url": "assets/surgery-BCJtWvhz.js",
    "revision": null
  }, {
    "url": "assets/situationFromKpis-ffeP0NXL.js",
    "revision": null
  }, {
    "url": "assets/radiology-CYIAR1Lo.js",
    "revision": null
  }, {
    "url": "assets/pwa-soRmuryB.js",
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
    "url": "assets/patients-oCYud8qk.js",
    "revision": null
  }, {
    "url": "assets/opsDemo-BdBmED5f.js",
    "revision": null
  }, {
    "url": "assets/laboratory-DjFkCcNQ.js",
    "revision": null
  }, {
    "url": "assets/index-DCpKeLA7.js",
    "revision": null
  }, {
    "url": "assets/index-CnSYMkEc.js",
    "revision": null
  }, {
    "url": "assets/index-BwHfm2jk.js",
    "revision": null
  }, {
    "url": "assets/index-BWOzYDk7.css",
    "revision": null
  }, {
    "url": "assets/format-BNjnU6or.js",
    "revision": null
  }, {
    "url": "assets/executive-BHADC04L.js",
    "revision": null
  }, {
    "url": "assets/emergency-CfyXCoIg.js",
    "revision": null
  }, {
    "url": "assets/dataPlatform-BzV-rPFP.js",
    "revision": null
  }, {
    "url": "assets/chartHeadlines-CdzseCym.js",
    "revision": null
  }, {
    "url": "assets/beds-CZRUG0Oz.js",
    "revision": null
  }, {
    "url": "assets/alerts-BI0AHvXy.js",
    "revision": null
  }, {
    "url": "assets/ai-BRHyUPMy.js",
    "revision": null
  }, {
    "url": "assets/WorkforceStatusChip-DjD_wi0j.js",
    "revision": null
  }, {
    "url": "assets/WorkforceEmployeeProfilePage-e5ekBVoY.js",
    "revision": null
  }, {
    "url": "assets/WorkforceDashboard-DSwwV8jx.js",
    "revision": null
  }, {
    "url": "assets/VitalSignsGrid-CtB700C5.js",
    "revision": null
  }, {
    "url": "assets/TableRow-BLUgEyTd.js",
    "revision": null
  }, {
    "url": "assets/TablePagination-D2LUB94P.js",
    "revision": null
  }, {
    "url": "assets/SurgeryDashboard-Dl_WIeu1.js",
    "revision": null
  }, {
    "url": "assets/StatusBadge-z6Cfz6dT.js",
    "revision": null
  }, {
    "url": "assets/Skeleton-B2FGQPZe.js",
    "revision": null
  }, {
    "url": "assets/SituationSummary-O2c2lb1p.js",
    "revision": null
  }, {
    "url": "assets/RcmDashboard-CQVAhqFb.js",
    "revision": null
  }, {
    "url": "assets/RadiologyDashboard-Bq1P4ZvF.js",
    "revision": null
  }, {
    "url": "assets/PharmacyDashboard-D88c28Fu.js",
    "revision": null
  }, {
    "url": "assets/PatientsPage-CpLRfrLV.js",
    "revision": null
  }, {
    "url": "assets/PatientRiskCard-XCb_WSBz.js",
    "revision": null
  }, {
    "url": "assets/Patient360Page-BDelKsSa.js",
    "revision": null
  }, {
    "url": "assets/PageIntroduction-DSsR-nHf.js",
    "revision": null
  }, {
    "url": "assets/PageHeader-DpUsIY9i.js",
    "revision": null
  }, {
    "url": "assets/OverrideDialog-B4w3zXma.js",
    "revision": null
  }, {
    "url": "assets/OutpatientDashboard-BaS6ZkHp.js",
    "revision": null
  }, {
    "url": "assets/OutcomeRiskPage-DPUfKLa0.js",
    "revision": null
  }, {
    "url": "assets/OrchestrationPage-Co7r4iL6.js",
    "revision": null
  }, {
    "url": "assets/MoreVert-DHinXRdH.js",
    "revision": null
  }, {
    "url": "assets/ModelPerformancePanel-C-ijxDkd.js",
    "revision": null
  }, {
    "url": "assets/ModelMonitoringPage-CRlVS5mD.js",
    "revision": null
  }, {
    "url": "assets/ModelLimitationsPanel-DCRWkfDn.js",
    "revision": null
  }, {
    "url": "assets/MissingDataPanel-wFbgJb10.js",
    "revision": null
  }, {
    "url": "assets/MiniListTable-Bw06N4Vf.js",
    "revision": null
  }, {
    "url": "assets/MetricBand-DxgQKren.js",
    "revision": null
  }, {
    "url": "assets/MedicationSafetyPage-C1VPBU60.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-L-IeFr2N.js",
    "revision": null
  }, {
    "url": "assets/LoadingSkeleton-CB6LLhvt.js",
    "revision": null
  }, {
    "url": "assets/LightbulbOutlined-C5p97fmE.js",
    "revision": null
  }, {
    "url": "assets/LaboratoryDashboard-bwAytJU6.js",
    "revision": null
  }, {
    "url": "assets/KPICard-D3ZHOnCs.js",
    "revision": null
  }, {
    "url": "assets/InpatientDashboard-kxfRBDln.js",
    "revision": null
  }, {
    "url": "assets/InfoOutlined-Dwu2qNTo.js",
    "revision": null
  }, {
    "url": "assets/ImagingPage-CYjB_e5Y.js",
    "revision": null
  }, {
    "url": "assets/Grid-BvNiJpzY.js",
    "revision": null
  }, {
    "url": "assets/GovernancePage-CM_xyxDr.js",
    "revision": null
  }, {
    "url": "assets/FutureCapabilitiesPage-x15tymjC.js",
    "revision": null
  }, {
    "url": "assets/Fullscreen-D99WTdCF.js",
    "revision": null
  }, {
    "url": "assets/ExecutiveDashboard-TuRzbq2R.js",
    "revision": null
  }, {
    "url": "assets/ErrorState-Rdkm8qr8.js",
    "revision": null
  }, {
    "url": "assets/ErrorOutline-BPLkIbH4.js",
    "revision": null
  }, {
    "url": "assets/EmptyState-BTQ0qUOJ.js",
    "revision": null
  }, {
    "url": "assets/EmergencyDashboard-0u8-6QVd.js",
    "revision": null
  }, {
    "url": "assets/EChart-CUQicKR1.js",
    "revision": null
  }, {
    "url": "assets/DownloadOutlined-CHA4lkRW.js",
    "revision": null
  }, {
    "url": "assets/DomainPageHeader-DDZjzo62.js",
    "revision": null
  }, {
    "url": "assets/DialogTitle-BCWJ5Pyf.js",
    "revision": null
  }, {
    "url": "assets/DiagnosisSupportPage-Cb7dVE-6.js",
    "revision": null
  }, {
    "url": "assets/DiagnosesDashboard-CTGT63Se.js",
    "revision": null
  }, {
    "url": "assets/DeteriorationPage-DA314i4P.js",
    "revision": null
  }, {
    "url": "assets/DetailDataTable-CDLox57A.js",
    "revision": null
  }, {
    "url": "assets/DemoStoryPage-D8XacQQ1.js",
    "revision": null
  }, {
    "url": "assets/DecisionPriorityList-xIrsvYMt.js",
    "revision": null
  }, {
    "url": "assets/DataQualityOpsPage-DDK8IjWK.js",
    "revision": null
  }, {
    "url": "assets/DataPlatformPage-Cm8qMb-X.js",
    "revision": null
  }, {
    "url": "assets/DataPipelinesPage-Dgmnyxck.js",
    "revision": null
  }, {
    "url": "assets/DataFreshnessIndicator-BEQAdDpC.js",
    "revision": null
  }, {
    "url": "assets/DashboardShell-KbGiuAOm.js",
    "revision": null
  }, {
    "url": "assets/CopilotPage-CYO25Djf.js",
    "revision": null
  }, {
    "url": "assets/CompactPageHeader-CAUYTxsy.js",
    "revision": null
  }, {
    "url": "assets/CommandCenterPage-CzjoXlLX.js",
    "revision": null
  }, {
    "url": "assets/ClinicalReviewForm-D0jN1-RO.js",
    "revision": null
  }, {
    "url": "assets/ClinicalAIPageHeader-DrIOYJdA.js",
    "revision": null
  }, {
    "url": "assets/CheckCircleOutline-DE-UEoy_.js",
    "revision": null
  }, {
    "url": "assets/ChartSection-ConwLzXN.js",
    "revision": null
  }, {
    "url": "assets/CardHeader-hdD6K93E.js",
    "revision": null
  }, {
    "url": "assets/CardContent-DDgtH13f.js",
    "revision": null
  }, {
    "url": "assets/BedsDashboard-C-eDHw3I.js",
    "revision": null
  }, {
    "url": "assets/AutoAwesomeOutlined-DTf8t0Li.js",
    "revision": null
  }, {
    "url": "assets/AssetPage-BGr_AcD1.js",
    "revision": null
  }, {
    "url": "assets/ArrowBack-CluLzLTR.js",
    "revision": null
  }, {
    "url": "assets/AppointmentsDashboard-yWTtgJpj.js",
    "revision": null
  }, {
    "url": "assets/AnimatedSection-DCjgtCgj.js",
    "revision": null
  }, {
    "url": "assets/AnimatedNumber-DqgNOV7R.js",
    "revision": null
  }, {
    "url": "assets/AlertsDashboard-sGPLFqjH.js",
    "revision": null
  }, {
    "url": "assets/AiInsightsPage-MqAcnmWI.js",
    "revision": null
  }, {
    "url": "assets/AiEmergencyIntelligencePage-SiGRtXmi.js",
    "revision": null
  }, {
    "url": "assets/AiDataQualityAgentPage-BIWxquC2.js",
    "revision": null
  }, {
    "url": "assets/AiClaimPreventionPage-C4A6QZld.js",
    "revision": null
  }, {
    "url": "assets/AiBedForecastPage-D2ixTW8V.js",
    "revision": null
  }, {
    "url": "assets/AiAppointmentOptimizerPage-B54tm1eQ.js",
    "revision": null
  }, {
    "url": "assets/AccordionSummary-pajnTbs8.js",
    "revision": null
  }, {
    "url": "assets/AccessTime-FDi6_O3c.js",
    "revision": null
  }, {
    "url": "assets/AIExecutiveBrief-CvcLhMno.js",
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
