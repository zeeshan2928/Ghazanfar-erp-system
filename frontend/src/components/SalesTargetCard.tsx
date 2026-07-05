import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, Box, Typography, Button, Chip } from '@mui/material';
import ProgressBar from './ProgressBar';
import api from '../services/api';

interface SalesTargetCardProps {
  salesmanId: number;
  month?: number;
  year?: number;
  compact?: boolean;
}

interface TargetData {
  id: number;
  targetAmount: number;
  targetQuantity?: number;
  status: string;
  progressPercentage: number;
  daysRemaining: number;
  daysInMonth: number;
  performance?: {
    totalSalesAmount: number;
    totalInvoices: number;
  };
}

const SalesTargetCard: React.FC<SalesTargetCardProps> = ({
  salesmanId,
  month,
  year,
  compact = false,
}) => {
  const [target, setTarget] = useState<TargetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTargetData();
  }, [salesmanId, month, year]);

  const fetchTargetData = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = month && year
        ? `/api/v1/targets?salesmanId=${salesmanId}&month=${month}&year=${year}&take=1`
        : `/api/v1/targets/salesman/${salesmanId}/current`;

      const response = await api.get(url);
      const data = response.data.data ? response.data.data[0] : response.data;
      setTarget(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load target');
      console.error('Target fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Card><CardContent>Loading target data...</CardContent></Card>;
  }

  if (!target) {
    return (
      <Card>
        <CardContent>
          <Typography color="textSecondary">No target assigned</Typography>
        </CardContent>
      </Card>
    );
  }

  const actualSales = target.performance?.totalSalesAmount || 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={`Target ${month}/${year || new Date().getFullYear()}`}
        action={
          <Chip
            label={target.status}
            color={target.status === 'COMPLETED' ? 'success' : 'primary'}
            size="small"
          />
        }
      />
      <CardContent>
        {error && (
          <Typography color="error" variant="caption">
            {error}
          </Typography>
        )}

        <ProgressBar
          current={actualSales}
          target={target.targetAmount}
          showPercentage={true}
          daysRemaining={target.daysRemaining}
        />

        {!compact && (
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Invoices
                  </Typography>
                  <Typography variant="h6">
                    {target.performance?.totalInvoices || 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Avg Invoice Value
                  </Typography>
                  <Typography variant="h6">
                    {target.performance?.totalInvoices
                      ? `Rs ${Math.round(actualSales / target.performance.totalInvoices / 100)}`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Button
              variant="outlined"
              size="small"
              fullWidth
              sx={{ mt: 2 }}
              onClick={fetchTargetData}
            >
              Refresh
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Temp Grid for layout - this should use MUI Grid
const Grid: React.FC<any> = ({ container, spacing, children, item, xs, ...props }) => {
  if (item) {
    return <Box sx={{ flex: `0 0 calc(${100 / 12 * xs}% - ${spacing}px)` }}>{children}</Box>;
  }
  return (
    <Box sx={{ display: 'flex', gap: spacing ? `${spacing * 8}px` : '0' }}>
      {children}
    </Box>
  );
};

export default SalesTargetCard;
