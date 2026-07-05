import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

interface AnalyticsPanelProps {}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = () => {
  const [salesmanId, setSalesmanId] = useState('');
  const [months, setMonths] = useState('6');
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [patternsData, setPatternsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!salesmanId) {
      setError('Please enter a salesman ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get performance analysis
      const perfResponse = await api.get(
        `/api/v1/analytics/performance/${salesmanId}?months=${months}`
      );
      setPerformanceData(perfResponse.data);

      // Get sales patterns
      const patternsResponse = await api.get(
        `/api/v1/analytics/patterns/${salesmanId}?months=3`
      );
      setPatternsData(patternsResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Search Panel */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Salesman Analytics" />
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Salesman ID"
                type="number"
                value={salesmanId}
                onChange={(e) => setSalesmanId(e.target.value)}
                size="small"
                sx={{ width: '150px' }}
              />
              <TextField
                label="Months to Analyze"
                type="number"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                size="small"
                sx={{ width: '150px' }}
              />
              <Button variant="contained" onClick={handleAnalyze} disabled={loading || !salesmanId}>
                {loading ? <CircularProgress size={24} /> : 'Analyze'}
              </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </CardContent>
        </Card>
      </Grid>

      {/* Performance Analysis */}
      {performanceData && (
        <>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Sales Trend (Last 6 Months)" />
              <CardContent>
                {performanceData.monthlyBreakdown && performanceData.monthlyBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData.monthlyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `Rs ${(value / 100).toLocaleString()}`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="actualSales"
                        stroke="#82ca9d"
                        name="Actual Sales"
                        dot
                      />
                      <Line
                        type="monotone"
                        dataKey="targetAmount"
                        stroke="#8884d8"
                        name="Target"
                        dot
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography>No data available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Performance Metrics" />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Total Sales</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>
                      Rs {(performanceData.periodAnalysis?.totalSales / 100).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Average Monthly</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>
                      Rs {(performanceData.periodAnalysis?.avgMonthlySales / 100).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Growth Rate</Typography>
                    <Chip
                      label={`${performanceData.periodAnalysis?.growthRate}%`}
                      color={parseFloat(performanceData.periodAnalysis?.growthRate) >= 0 ? 'success' : 'error'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Overall Achievement</Typography>
                    <Typography sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                      {performanceData.periodAnalysis?.overallAchievement}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Best Month</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>
                      {performanceData.bestMonth || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Products */}
          {patternsData && patternsData.topProducts && patternsData.topProducts.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Top Products Sold" />
                <CardContent>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell align="right">Code</TableCell>
                          <TableCell align="right">Invoices</TableCell>
                          <TableCell align="right">Total Quantity</TableCell>
                          <TableCell align="right">Avg Qty/Invoice</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {patternsData.topProducts.map((product: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{product.productName}</TableCell>
                            <TableCell align="right">{product.productCode}</TableCell>
                            <TableCell align="right">{product.invoiceCount}</TableCell>
                            <TableCell align="right">{product.totalQuantity}</TableCell>
                            <TableCell align="right">{product.avgQtyPerInvoice}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Daily Metrics */}
          {patternsData && patternsData.dailyMetrics && (
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Daily Sales Metrics" />
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Average Daily Sales
                      </Typography>
                      <Typography variant="h6">
                        Rs {(patternsData.dailyMetrics.avgDailySales / 100).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Invoice Frequency
                      </Typography>
                      <Typography variant="h6">
                        {patternsData.patterns.invoiceFrequency}
                      </Typography>
                    </Box>
                  </Box>

                  {patternsData.dailyMetrics.busyDaysTop5 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Top Sales Days
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {patternsData.dailyMetrics.busyDaysTop5.map((day: any, idx: number) => (
                          <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                            <Typography variant="body2">{day.date}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              Rs {(day.sales / 100).toLocaleString()}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </>
      )}
    </Grid>
  );
};

export default AnalyticsPanel;
