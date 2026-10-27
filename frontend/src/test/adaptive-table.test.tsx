import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import i18n from '@/i18n';
import DetailDataTable from '@/components/dashboard/DetailDataTable';
import { mockMatchMediaForWidth } from './matchMedia';

const theme = createTheme();

type Row = { id: string; name: string; status: string };

const columns: ColumnDef<Row>[] = [
  { id: 'id', header: 'ID', accessorKey: 'id' },
  { id: 'name', header: 'Name', accessorKey: 'name' },
  { id: 'status', header: 'Status', accessorKey: 'status' },
];

const rows: Row[] = [
  { id: 'P-001', name: 'Ahmad Ali', status: 'Active' },
  { id: 'P-002', name: 'Sara Noor', status: 'Discharged' },
];

function withProviders(children: React.ReactNode) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </I18nextProvider>
  );
}

describe('DetailDataTable adaptive layout', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders adaptive record cards on mobile viewports', () => {
    mockMatchMediaForWidth(375);
    render(
      withProviders(
        <DetailDataTable title="Patients" data={rows} columns={columns} totalRecords={2} page={1} pageSize={25} />,
      ),
    );
    expect(screen.getByTestId('adaptive-record-cards')).toBeInTheDocument();
    expect(screen.getByText('Ahmad Ali')).toBeInTheDocument();
    expect(screen.getByText('Sara Noor')).toBeInTheDocument();
  });
});
