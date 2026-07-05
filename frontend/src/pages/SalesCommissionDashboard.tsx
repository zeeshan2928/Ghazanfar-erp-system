import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ProgressBar from '../components/ProgressBar';
import SalesTargetCard from '../components/SalesTargetCard';
import CommissionCard from '../components/CommissionCard';
import TeamPerformanceTable from '../components/TeamPerformanceTable';
import ImportDataModal from '../components/ImportDataModal';
import AnalyticsPanel from '../components/AnalyticsPanel';
import api from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const SalesCommissionDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonthData, setCurrentMonthData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current month target
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Fetch team targets for current month
      const teamResponse = await api.get(
        `/api/v1/targets/team/summary?year=${currentYear}&month=${currentMonth}`
      );
      setTeamData(teamResponse.data.comparison || []);

      // Fetch performance data for chart
      const performanceResponse = await api.get(
        `/api/v1/analytics/team/comparison?year=${currentYear}&month=${currentMonth}`
      );
      setPerformanceData(performanceResponse.data.comparison || []);

      // Transform data for display
      setCurrentMonthData({
        month: currentMonth,
        year: currentYear,
        stats: teamResponse.data.teamStats,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <h1>Sales Commission Dashboard</h1>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      </Box>

      {/* Key Metrics Cards */}
      {currentMonthData && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Total Team Sales</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>
                    Rs {(currentMonthData.stats.totalSales / 100).toLocaleString()}
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Team Target</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>
                    Rs {(currentMonthData.stats.totalTarget / 100).toLocaleString()}
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Achievement</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: '#2e7d32' }}>
                    {currentMonthData.stats.teamAchievement}%
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Team Members</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>
                    {currentMonthData.stats.totalSalesmen}
                  </div>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Overview" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Individual Performance" id="tab-1" aria-controls="tabpanel-1" />
          <Tab label="Analytics" id="tab-2" aria-controls="tabpanel-2" />
          <Tab label="Commissions" id="tab-3" aria-controls="tabpanel-3" />
          <Tab label="Import Data" id="tab-4" aria-controls="tabpanel-4" />
        </Tabs>
      </Box>

      {/* Tab 0: Overview */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <Card>
              <CardHeader title="Team Performance Comparison" />
              <CardContent>
                {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="salesmanName" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value) => `Rs ${(value / 100).toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="targetAmount" fill="#8884d8" name="Target" />
                      <Bar dataKey="actualSales" fill="#82ca9d" name="Actual Sales" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div>No data available</div>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Card>
              <CardHeader title="Achievement Distribution" />
              <CardContent>
                {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={performanceData}
                        dataKey="achievement"
                        nameKey="salesmanName"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {performanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div>No data available</div>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 1: Individual Performance */}
      <TabPanel value={tabValue} index={1}>
        <TeamPerformanceTable data={teamData} onRefresh={fetchDashboardData} />
      </TabPanel>

      {/* Tab 2: Analytics */}
      <TabPanel value={tabValue} index={2}>
        <AnalyticsPanel />
      </TabPanel>

      {/* Tab 3: Commissions */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Commission Overview" />
              <CardContent>
                <div>Commission management features coming soon</div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 4: Import Data */}
      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title="Import Sales Data"
                action={
                  <button
                    onClick={() => setShowImportModal(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Import CSV
                  </button>
                }
              />
              <CardContent>
                <ImportDataModal
                  open={showImportModal}
                  onClose={() => setShowImportModal(false)}
                  onSuccess={handleImportSuccess}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Container>
  );
};

export default SalesCommissionDashboard;
