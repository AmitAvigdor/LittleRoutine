import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppStore } from '@/stores/appStore';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FileText, Download, FileJson, Table } from 'lucide-react';
import { clsx } from 'clsx';

type ExportFormat = 'json' | 'csv';
type DateRange = 'all' | 'thisMonth' | 'lastMonth' | 'custom';

export function ExportView() {
  const { user } = useAuth();
  const { selectedBaby } = useAppStore();
  const [format, setFormat] = useState<ExportFormat>('json');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});

  const collections = [
    { id: 'feedingSessions', label: 'Feeding Sessions' },
    { id: 'pumpSessions', label: 'Pump Sessions' },
    { id: 'bottleSessions', label: 'Bottle Sessions' },
    { id: 'sleepSessions', label: 'Sleep Sessions' },
    { id: 'diaperChanges', label: 'Diaper Changes' },
    { id: 'growthEntries', label: 'Growth Entries' },
    { id: 'milestones', label: 'Milestones' },
    { id: 'vaccinations', label: 'Vaccinations' },
    { id: 'solidFoods', label: 'Solid Foods' },
    { id: 'teethingEvents', label: 'Teething Events' },
  ];

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case 'thisMonth':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case 'lastMonth':
        return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      default:
        return null;
    }
  };

  const fetchData = async () => {
    if (!user || !selectedBaby) return {};

    const data: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};
    const dateFilter = getDateFilter();

    for (const col of collections) {
      try {
        const q = query(
          collection(db, col.id),
          where('babyId', '==', selectedBaby.id)
        );
        const snapshot = await getDocs(q);

        let docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Apply date filter if needed
        if (dateFilter) {
          docs = docs.filter(doc => {
            const docDate = (doc as { date?: string; startTime?: string; timestamp?: string }).date
              || (doc as { startTime?: string }).startTime
              || (doc as { timestamp?: string }).timestamp;
            return docDate && docDate >= dateFilter;
          });
        }

        data[col.id] = docs;
        counts[col.id] = docs.length;
      } catch (error) {
        console.error(`Error fetching ${col.id}:`, error);
        data[col.id] = [];
        counts[col.id] = 0;
      }
    }

    setStats(counts);
    return data;
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await fetchData();

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `baby-track-export-${selectedBaby?.name || 'data'}-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        // CSV export - flatten data
        const csvRows: string[] = [];

        for (const [collectionName, items] of Object.entries(data)) {
          if ((items as unknown[]).length === 0) continue;

          // Add section header
          csvRows.push(`\n--- ${collectionName} ---`);

          // Get headers from first item
          const firstItem = (items as Record<string, unknown>[])[0];
          const headers = Object.keys(firstItem);
          csvRows.push(headers.join(','));

          // Add data rows
          for (const item of items as Record<string, unknown>[]) {
            const values = headers.map(h => {
              const val = item[h];
              if (val === null || val === undefined) return '';
              if (typeof val === 'string' && val.includes(',')) {
                return `"${val.replace(/"/g, '""')}"`;
              }
              return String(val);
            });
            csvRows.push(values.join(','));
          }
        }

        content = csvRows.join('\n');
        filename = `baby-track-export-${selectedBaby?.name || 'data'}-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  };

  const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);

  if (!selectedBaby) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please select a baby first
      </div>
    );
  }

  return (
    <div>
      <Header title="Export Data" showBabySwitcher={false} />

      <div className="px-4 py-4 space-y-4">
        {/* Format Selection */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Export Format</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setFormat('json')}
              className={clsx(
                'flex-1 flex flex-col items-center p-4 rounded-lg border-2 transition-colors',
                format === 'json'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <FileJson className={clsx('w-8 h-8 mb-2', format === 'json' ? 'text-primary-500' : 'text-gray-400')} />
              <span className={clsx('font-medium', format === 'json' ? 'text-primary-700' : 'text-gray-600')}>
                JSON
              </span>
              <span className="text-xs text-gray-400">Complete data</span>
            </button>
            <button
              onClick={() => setFormat('csv')}
              className={clsx(
                'flex-1 flex flex-col items-center p-4 rounded-lg border-2 transition-colors',
                format === 'csv'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <Table className={clsx('w-8 h-8 mb-2', format === 'csv' ? 'text-primary-500' : 'text-gray-400')} />
              <span className={clsx('font-medium', format === 'csv' ? 'text-primary-700' : 'text-gray-600')}>
                CSV
              </span>
              <span className="text-xs text-gray-400">Spreadsheet</span>
            </button>
          </div>
        </Card>

        {/* Date Range */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Date Range</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'lastMonth', label: 'Last Month' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setDateRange(option.id as DateRange)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  dateRange === option.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Preview */}
        {Object.keys(stats).length > 0 && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Data Preview</h3>
            <div className="space-y-2">
              {collections.map((col) => (
                <div key={col.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{col.label}</span>
                  <span className="font-medium">{stats[col.id] || 0} records</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                <span>Total</span>
                <span>{totalRecords} records</span>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handlePreview}
            disabled={loading}
          >
            <FileText className="w-4 h-4 mr-2" />
            {loading ? 'Loading...' : 'Preview Data'}
          </Button>

          <Button
            className="w-full"
            onClick={handleExport}
            disabled={loading}
          >
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
          </Button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Exporting data for {selectedBaby.name}
        </p>
      </div>
    </div>
  );
}
