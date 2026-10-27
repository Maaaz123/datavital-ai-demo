export interface AppBreadcrumbItem {
  label: string;
  path: string;
  last: boolean;
}

type Translate = (key: string, options?: { defaultValue?: string }) => string;

/**
 * Build header breadcrumbs for the current pathname.
 * Workforce employee profiles collapse to: Workforce → Employee profile
 * so raw IDs (emp-1001, unknown-id) never appear in the chrome.
 */
export function buildAppBreadcrumbs(
  pathname: string,
  t: Translate,
  routeLabels: Record<string, string>,
): AppBreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'workforce' && segments[1] === 'employees' && segments[2]) {
    return [
      {
        label: t('nav.workforceCrumb', { defaultValue: 'Workforce' }),
        path: '/workforce',
        last: false,
      },
      {
        label: t('nav.workforceEmployee', { defaultValue: 'Employee profile' }),
        path: `/${segments.join('/')}`,
        last: true,
      },
    ];
  }

  return segments.map((seg, idx) => {
    let label = routeLabels[seg] ? t(routeLabels[seg]) : seg;
    if (/^emp-\d+$/i.test(seg)) {
      label = t('nav.workforceEmployee', { defaultValue: 'Employee profile' });
    }
    return {
      label,
      path: `/${segments.slice(0, idx + 1).join('/')}`,
      last: idx === segments.length - 1,
    };
  });
}
