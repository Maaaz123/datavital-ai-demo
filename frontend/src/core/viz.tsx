import { MONTHS, type Lang } from '@/showcase/copy';
import { scenarioFor, type AnnualFact } from '@/showcase/facts';

type Series = { name: string; values: number[] };

type Figure = {
  title: string;
  categories: string[];
  series: Series[];
  unit: string;
  digits: number;
  note: string;
};

function months(lang: Lang): string[] {
  return MONTHS[lang];
}

function pick(fact: AnnualFact, field: keyof AnnualFact): number {
  const value = fact[field];
  return typeof value === 'number' ? value : 0;
}

const VOLUME: Record<string, keyof AnnualFact> = {
  laboratory: 'labOrders',
  radiology: 'radOrders',
  surgery: 'surgCompleted',
  appointments: 'apptBooked',
  outpatient: 'apptAttended',
  dialysis: 'dialysisSessions',
  mortality: 'deaths',
  'ward-transfer': 'transfersIn',
  'maternal-neonatal': 'births',
  'assessments-vitals': 'admissions',
  'clinical-quality': 'deaths',
  'infection-prevention': 'haiEvents',
  predictions: 'admissions',
  'supply-chain': 'labOrders',
};

export function figureFor(kind: string, topic: string, hospital: string, year: number, lang: Lang): Figure {
  const scenario = scenarioFor(hospital, year);
  const focus = scenario.focus;
  const labels = months(lang);
  if (kind === 'wait') {
    const median = topic === 'radiology' ? 'radTatMedianMin' : 'edWaitMedianMin';
    const p90 = topic === 'radiology' ? 'radTatP90Min' : 'edWaitP90Min';
    return {
      title: topic === 'radiology' ? 'Imaging report time' : 'Door-to-provider wait',
      categories: labels,
      series: [
        { name: 'Median', values: scenario.months.map((month) => pick(month, median)) },
        { name: 'P90', values: scenario.months.map((month) => pick(month, p90)) },
      ],
      unit: 'minutes',
      digits: 0,
      note: 'Median and P90 are separate. The average is not plotted here.',
    };
  }
  if (kind === 'beds') {
    return {
      title: 'Staffed bed snapshot',
      categories: ['Occupied', 'Available', 'Blocked'],
      series: [{ name: 'Beds', values: [focus.occupiedBeds, focus.availableBeds, focus.blockedBeds] }],
      unit: 'beds',
      digits: 0,
      note: 'Occupied, available, and blocked beds sum to staffed beds.',
    };
  }
  if (kind === 'claims') {
    if (topic === 'pharmacy' || topic === 'supply-chain') {
      return {
        title: topic === 'pharmacy' ? 'Medication flow' : 'Supply follows laboratory orders',
        categories: topic === 'pharmacy' ? ['Ordered', 'Dispensed', 'Administered'] : labels,
        series:
          topic === 'pharmacy'
            ? [{ name: 'Orders', values: [focus.pharmOrders, focus.pharmDispensed, focus.pharmAdmin] }]
            : [{ name: 'Laboratory orders', values: scenario.months.map((month) => month.labOrders) }],
        unit: 'orders',
        digits: 0,
        note: topic === 'pharmacy' ? 'Administered does not exceed dispensed, and dispensed does not exceed ordered.' : 'Supply events use laboratory order volume in this story.',
      };
    }
    if (topic === 'pre-authorization') {
      return {
        title: 'Authorization requests',
        categories: ['Requested', 'Denied'],
        series: [{ name: 'Authorizations', values: [focus.preauthRequested, focus.preauthDenied] }],
        unit: 'requests',
        digits: 0,
        note: 'Denied requests are a subset of requested authorizations.',
      };
    }
    return {
      title: 'Claim disposition',
      categories: ['Paid', 'Denied', 'Pending'],
      series: [{ name: 'Claims', values: [focus.claimsPaid, focus.claimsDenied, focus.claimsPending] }],
      unit: 'claims',
      digits: 0,
      note: 'Paid, denied, and pending claims sum to submitted claims.',
    };
  }
  if (kind === 'hospitals') {
    const sites = scenarioFor('ALL', year).sites;
    return {
      title: 'Occupancy across the five hospitals',
      categories: ['North', 'South', 'East', 'West', 'Central'],
      series: [{ name: 'Occupancy', values: sites.map((site) => (site.annual.occupiedBeds / site.annual.staffedBeds) * 100) }],
      unit: 'percent',
      digits: 1,
      note: 'Each bar is occupied beds divided by staffed beds for that hospital.',
    };
  }
  if (kind === 'ledger') {
    return {
      title: 'Revenue identity',
      categories: ['Billed', 'Adjustment', 'Allowed', 'Collected', 'Outstanding'],
      series: [
        {
          name: 'SAR',
          values: [focus.billed, focus.adjustment, focus.allowed, focus.payerPaid + focus.patientPaid, focus.outstanding],
        },
      ],
      unit: 'SAR',
      digits: 0,
      note: 'Billed minus adjustment equals allowed. Collections, write-off, and outstanding sit inside allowed.',
    };
  }
  if (kind === 'workforce') {
    return {
      title: 'Staffing snapshot',
      categories: ['Required', 'Filled'],
      series: [{ name: 'FTE', values: [focus.requiredFte, focus.filledFte] }],
      unit: 'FTE',
      digits: 1,
      note: 'Vacancy is required FTE minus filled FTE.',
    };
  }
  if (kind === 'acuity') {
    return {
      title: 'Emergency acuity mix',
      categories: ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'],
      series: [{ name: 'Arrivals', values: [focus.acuity1, focus.acuity2, focus.acuity3, focus.acuity4, focus.acuity5] }],
      unit: 'arrivals',
      digits: 0,
      note: 'The five acuity counts sum to emergency arrivals.',
    };
  }
  if (kind === 'journey') {
    const response = focus.surveysSent ? (focus.surveysReturned / focus.surveysSent) * 100 : 0;
    const closure = focus.complaintsOpened ? (focus.complaintsClosed / focus.complaintsOpened) * 100 : 0;
    return {
      title: 'Experience rates',
      categories: ['Response', 'Closure', 'Satisfaction'],
      series: [{ name: 'Index', values: [response, closure, focus.satisfaction] }],
      unit: 'percent or index',
      digits: 1,
      note: `Response is ${focus.surveysReturned.toLocaleString('en-US')} of ${focus.surveysSent.toLocaleString('en-US')} surveys. Closure is ${focus.complaintsClosed.toLocaleString('en-US')} of ${focus.complaintsOpened.toLocaleString('en-US')} complaints. Satisfaction is a labelled demo index. Counts are labelled assumptions.`,
    };
  }
  if (kind === 'trust') {
    return {
      title: 'Definition inventory',
      categories: ['Catalog', 'Registry labels', 'Demo assumptions'],
      series: [{ name: 'Definitions', values: [192, 188, 12] }],
      unit: 'definitions',
      digits: 0,
      note: 'These are source classifications, not hospital volumes. 392 definitions in total.',
    };
  }
  const field = VOLUME[topic] ?? 'admissions';
  return {
    title: 'Monthly volume',
    categories: labels,
    series: [{ name: String(field), values: scenario.months.map((month) => pick(month, field)) }],
    unit: 'count',
    digits: 0,
    note: 'Monthly counts from the same scenario as the headline figures.',
  };
}

export function secondaryFor(kind: string, hospital: string, year: number): Figure {
  const focus = scenarioFor(hospital, year).focus;
  if (kind === 'wait' || kind === 'acuity') {
    return {
      title: 'Arrival mix',
      categories: ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'],
      series: [{ name: 'Arrivals', values: [focus.acuity1, focus.acuity2, focus.acuity3, focus.acuity4, focus.acuity5] }],
      unit: 'arrivals',
      digits: 0,
      note: 'Secondary view of the same arrivals.',
    };
  }
  if (kind === 'beds' || kind === 'workforce') {
    return {
      title: 'Bed identity',
      categories: ['Staffed', 'Occupied + available + blocked'],
      series: [{ name: 'Beds', values: [focus.staffedBeds, focus.occupiedBeds + focus.availableBeds + focus.blockedBeds] }],
      unit: 'beds',
      digits: 0,
      note: 'The two bars match when the snapshot reconciles.',
    };
  }
  if (kind === 'journey') {
    return {
      title: 'Satisfaction by month',
      categories: MONTHS.en,
      series: [{ name: 'Index', values: scenarioFor(hospital, year).months.map((month) => month.satisfaction) }],
      unit: 'index',
      digits: 1,
      note: 'A labelled demo index, not an official survey score.',
    };
  }
  return {
    title: 'Prior-year volume',
    categories: ['This year', 'Prior year'],
    series: [
      {
        name: 'Admissions',
        values: [focus.admissions, scenarioFor(hospital, Math.max(2024, year - 1)).focus.admissions],
      },
    ],
    unit: 'admissions',
    digits: 0,
    note: 'The prior year uses the same hospital and the year factor in the scenario.',
  };
}

function formatTick(value: number, digits: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString('en-US', { maximumFractionDigits: digits });
}

export function Chart({ figure }: { figure: Figure }) {
  const { title, categories, series, unit, digits, note } = figure;
  const flat = series.flatMap((item) => item.values);
  const max = Math.max(...flat.map((value) => Math.abs(value)), 1);
  const width = 720;
  const height = 240;
  const padL = 52;
  const padR = 12;
  const padT = 16;
  const padB = 36;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const groupW = innerW / Math.max(categories.length, 1);
  const barW = Math.max(4, Math.min(22, (groupW * 0.72) / series.length));
  const allZero = flat.every((value) => value === 0);
  const ticks = [0, max / 2, max];

  return (
    <figure className="gc-chart" data-chart-state={allZero ? 'zero' : 'ok'}>
      <figcaption>
        <strong>{title}</strong>
        <span>{note}</span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}. ${note}`}>
        <title>{title}</title>
        {ticks.map((tick, index) => {
          const y = padT + innerH - (tick / max) * innerH;
          return (
            <g key={`${index}-${tick}`}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} />
              <text x={padL - 8} y={y + 4} textAnchor="end">
                {formatTick(tick, digits)}
              </text>
            </g>
          );
        })}
        {categories.map((category, categoryIndex) =>
          series.map((item, seriesIndex) => {
            const value = item.values[categoryIndex] ?? 0;
            const h = (Math.abs(value) / max) * innerH;
            const x = padL + categoryIndex * groupW + (groupW - series.length * barW) / 2 + seriesIndex * barW;
            const y = padT + innerH - h;
            return <rect key={`${category}-${item.name}`} x={x} y={y} width={Math.max(barW - 3, 2)} height={Math.max(h, value === 0 ? 0 : 1.5)} rx="3" fill={seriesIndex === 0 ? '#0f6e6a' : '#8c6a3d'}><title>{`${category} ${item.name}: ${value}`}</title></rect>;
          }),
        )}
        {categories.map((category, index) => (
          <text key={category} x={padL + index * groupW + groupW / 2} y={height - 12} textAnchor="middle">
            {category.length > 14 ? `${category.slice(0, 12)}…` : category}
          </text>
        ))}
      </svg>
      <table>
        <caption>{`${title} (${unit})`}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((item) => (
              <th key={item.name} scope="col">{item.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category, index) => (
            <tr key={category}>
              <th scope="row">{category}</th>
              {series.map((item) => (
                <td key={item.name}>{item.values[index].toLocaleString('en-US', { maximumFractionDigits: digits })}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
