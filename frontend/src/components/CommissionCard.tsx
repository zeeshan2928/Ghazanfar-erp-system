import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, Box, Typography, Chip, Button } from '@mui/material';
import api from '../services/api';

interface CommissionStatus {
  month: number;
  year: number;
  totalEarned: number;
  pending: number;
  approved: number;
  paid: number;
  commissions: any[];
}

interface CommissionCardProps {
  salesmanId: number;
  month?: number;
  year?: number;
}

const CommissionCard: React.FC<CommissionCardProps> = ({
  salesmanId,
  month,
  year,
}) => {
  const [commission, setCommission] = useState<CommissionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCommissionData();
  }, [salesmanId, month, year]);

  const fetchCommissionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());

      const response = await api.get(
        `/api/v1/commissions/status/${salesmanId}?${params.toString()}`
      );
      setCommission(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load commission');
      console.error('Commission fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Card><CardContent>Loading commission data...</CardContent></Card>;
  }

  if (!commission) {
    return (
      <Card>
        <CardContent>
          <Typography color="textSecondary">No commission data</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={`Commission ${commission.month}/${commission.year}`}
        subheader={`Total Earned: Rs ${(commission.totalEarned / 100).toLocaleString()}`}
      />
      <CardContent>
        {error && (
          <Typography color="error" variant="caption">
            {error}
          </Typography>
        )}

        {/* Commission Status Breakdown */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`Pending: Rs ${(commission.pending / 100).toLocaleString()}`}
              variant="outlined"
              color="warning"
            />
            <Chip
              label={`Approved: Rs ${(commission.approved / 100).toLocaleString()}`}
              variant="outlined"
              color="info"
            />
            <Chip
              label={`Paid: Rs ${(commission.paid / 100).toLocaleString()}`}
              variant="outlined"
              color="success"
            />
          </Box>
        </Box>

        {/* Commission Distribution */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Status Distribution
          </Typography>
          <Box sx={{ display: 'flex', height: '8px', gap: 1 }}>
            {commission.totalEarned > 0 ? (
              <>
                <Box
                  sx={{
                    flex: commission.pending / commission.totalEarned,
                    backgroundColor: '#ff9800',
                    borderRadius: '4px',
                  }}
                />
                <Box
                  sx={{
                    flex: commission.approved / commission.totalEarned,
                    backgroundColor: '#2196f3',
                    borderRadius: '4px',
                  }}
                />
                <Box
                  sx={{
                    flex: commission.paid / commission.totalEarned,
                    backgroundColor: '#4caf50',
                    borderRadius: '4px',
                  }}
                />
              </>
            ) : (
              <Box sx={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px' }} />
            )}
          </Box>
        </Box>

        {/* Recent Commissions */}
        {commission.commissions && commission.commissions.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Recent Commissions
            </Typography>
            <Box sx={{ maxHeight: '200px', overflowY: 'auto' }}>
              {commission.commissions.slice(0, 5).map((c, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 1,
                    borderBottom: '1px solid #e0e0e0',
                    fontSize: '12px',
                  }}
                >
                  <span>{c.invoiceNumber}</span>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <span>Rs {(c.commissionAmount / 100).toLocaleString()}</span>
                    <Chip
                      label={c.status}
                      size="small"
                      variant="outlined"
                      sx={{ height: '20px' }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Button
          variant="outlined"
          size="small"
          fullWidth
          sx={{ mt: 2 }}
          onClick={fetchCommissionData}
        >
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
};

export default CommissionCard;
