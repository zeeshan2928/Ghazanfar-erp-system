import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  LinearProgress,
  Button,
  Typography,
} from '@mui/material';

interface PerformanceRow {
  salesmanId: number;
  salesmanName: string;
  email?: string;
  targetAmount: number;
  actualSales: number;
  achievement: number;
  variance: number;
  invoiceCount: number;
  avgInvoiceValue: number;
  commission: number;
}

interface TeamPerformanceTableProps {
  data: PerformanceRow[];
  onRefresh?: () => void;
}

const TeamPerformanceTable: React.FC<TeamPerformanceTableProps> = ({
  data,
  onRefresh,
}) => {
  const [sortBy, setSortBy] = useState<keyof PerformanceRow>('achievement');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    }

    return 0;
  });

  const handleSort = (column: keyof PerformanceRow) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getAchievementColor = (achievement: number) => {
    if (achievement >= 100) return '#4caf50'; // Green
    if (achievement >= 75) return '#2196f3'; // Blue
    if (achievement >= 50) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getStatusChip = (achievement: number) => {
    if (achievement >= 100) return <Chip label="On Track" color="success" size="small" />;
    if (achievement >= 75) return <Chip label="Good" color="info" size="small" />;
    if (achievement >= 50) return <Chip label="Needs Work" color="warning" size="small" />;
    return <Chip label="Behind" color="error" size="small" />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Team Performance</Typography>
        {onRefresh && (
          <Button variant="outlined" size="small" onClick={onRefresh}>
            Refresh
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>
                <SortHeader
                  label="Salesman"
                  column="salesmanName"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
              </TableCell>
              <TableCell align="right">
                <SortHeader
                  label="Target"
                  column="targetAmount"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
              </TableCell>
              <TableCell align="right">
                <SortHeader
                  label="Actual Sales"
                  column="actualSales"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
              </TableCell>
              <TableCell align="center">
                <SortHeader
                  label="Achievement"
                  column="achievement"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
              </TableCell>
              <TableCell align="right">
                <SortHeader
                  label="Variance"
                  column="variance"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
              </TableCell>
              <TableCell align="right">Invoices</TableCell>
              <TableCell align="right">Avg Value</TableCell>
              <TableCell align="right">Commission</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.length > 0 ? (
              sortedData.map((row) => (
                <TableRow key={row.salesmanId} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {row.salesmanName}
                      </Typography>
                      {row.email && (
                        <Typography variant="caption" sx={{ color: '#666' }}>
                          {row.email}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    Rs {(row.targetAmount / 100).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    Rs {(row.actualSales / 100).toLocaleString()}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <Box sx={{ width: '60px' }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(row.achievement, 100)}
                          sx={{
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getAchievementColor(row.achievement),
                            },
                          }}
                        />
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'bold',
                          color: getAchievementColor(row.achievement),
                          minWidth: '40px',
                        }}
                      >
                        {Math.round(row.achievement)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{
                        color: row.variance >= 0 ? '#4caf50' : '#f44336',
                        fontWeight: 500,
                      }}
                    >
                      {row.variance >= 0 ? '+' : ''}
                      Rs {(row.variance / 100).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{row.invoiceCount}</TableCell>
                  <TableCell align="right">
                    Rs {(row.avgInvoiceValue / 100).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Rs {(row.commission / 100).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{getStatusChip(row.achievement)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No data available</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface SortHeaderProps {
  label: string;
  column: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

const SortHeader: React.FC<SortHeaderProps> = ({
  label,
  column,
  sortBy,
  sortOrder,
  onSort,
}) => (
  <Box
    onClick={() => onSort(column)}
    sx={{
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      '&:hover': {
        opacity: 0.7,
      },
    }}
  >
    {label}
    {sortBy === column && (
      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
    )}
  </Box>
);

export default TeamPerformanceTable;
