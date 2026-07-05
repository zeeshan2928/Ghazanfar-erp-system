import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  Card,
  Grid,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';

const DashboardContainer = styled.div`
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
  }
`;

const StatsGrid = styled(Grid)`
  margin-bottom: 32px;
`;

const StatCard = styled(Card)`
  padding: 24px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;

  .stat-number {
    font-size: 32px;
    font-weight: bold;
    margin: 12px 0;
  }

  .stat-label {
    font-size: 14px;
    opacity: 0.9;
  }

  &.attendance {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  &.pending {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }

  &.approved {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  }
`;

const TableWrapper = styled(TableContainer)`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const StatusChip = styled(Chip)<{ status: string }>`
  && {
    background-color: ${(props) => {
      switch (props.status) {
        case 'PRESENT':
          return '#4caf50';
        case 'ABSENT':
          return '#f44336';
        case 'LEAVE':
          return '#2196f3';
        case 'APPROVED':
          return '#4caf50';
        case 'PENDING':
          return '#ff9800';
        case 'REJECTED':
          return '#f44336';
        default:
          return '#9e9e9e';
      }
    }};
    color: white;
    font-weight: 500;
  }
`;

const ActionButton = styled(Button)`
  && {
    margin-right: 8px;
    margin-bottom: 8px;
  }
`;

interface LabourStaffMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  salary: number;
  isActive: boolean;
}

interface AttendanceRecord {
  id: number;
  employeeId: number;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  attendanceDate: string;
  hoursWorked?: number;
}

interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  daysUsed: number;
}

const LabourDashboard: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<LabourStaffMember[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'staff' | 'attendance' | 'leave'>('staff');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    position: '',
    salary: 0,
  });

  const [stats, setStats] = useState({
    totalStaff: 0,
    presentToday: 0,
    pendingLeaves: 0,
    averageAttendance: 0,
  });

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [staffRes, attendanceRes, leavesRes] = await Promise.all([
        apiClient.get(`/labour/staff/${organizationId}`),
        apiClient.get(`/labour/attendance/${organizationId}`),
        apiClient.get(`/labour/leaves/pending/${organizationId}`),
      ]);

      setStaffMembers(staffRes.data.data || []);
      setAttendanceRecords(attendanceRes.data.data || []);
      setLeaveRequests(leavesRes.data.data || []);

      calculateStats(staffRes.data.data, attendanceRes.data.data, leavesRes.data.data);
    } catch (err) {
      setError('Failed to load labour dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (staff: LabourStaffMember[], attendance: AttendanceRecord[], leaves: LeaveRequest[]) => {
    const today = new Date().toISOString().split('T')[0];
    const presentToday = attendance.filter(
      (a) => a.attendanceDate === today && a.status === 'PRESENT',
    ).length;

    const totalAttendance = attendance.length;
    const presentDays = attendance.filter((a) => a.status === 'PRESENT').length;
    const averageAttendance = totalAttendance > 0 ? (presentDays / totalAttendance) * 100 : 0;

    setStats({
      totalStaff: staff.length,
      presentToday,
      pendingLeaves: leaves.filter((l) => l.approvalStatus === 'PENDING').length,
      averageAttendance: Math.round(averageAttendance),
    });
  };

  const handleOpenDialog = (type: 'staff' | 'attendance' | 'leave') => {
    setDialogType(type);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      position: '',
      salary: 0,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'salary' ? parseFloat(value) : value,
    }));
  };

  const handleAddStaff = async () => {
    try {
      await apiClient.post(`/labour/staff`, {
        organizationId: parseInt(organizationId || '1'),
        ...formData,
      });
      loadData();
      handleCloseDialog();
    } catch (err) {
      setError('Failed to add staff member');
      console.error(err);
    }
  };

  const handleApproveLeave = async (leaveId: number) => {
    try {
      await apiClient.post(`/labour/leaves/${leaveId}/approve`, {
        approvedBy: user?.id,
      });
      loadData();
    } catch (err) {
      setError('Failed to approve leave');
    }
  };

  const handleRejectLeave = async (leaveId: number) => {
    try {
      await apiClient.post(`/labour/leaves/${leaveId}/reject`, {});
      loadData();
    } catch (err) {
      setError('Failed to reject leave');
    }
  };

  if (loading) {
    return (
      <DashboardContainer>
        <CircularProgress />
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <HeaderSection>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Labour Management Dashboard
        </Typography>
        <ActionButton
          variant="contained"
          color="primary"
          startIcon={<PersonAddIcon />}
          onClick={() => handleOpenDialog('staff')}
        >
          Add Staff Member
        </ActionButton>
      </HeaderSection>

      {error && <Alert severity="error" sx={{ marginBottom: '24px' }}>{error}</Alert>}

      {/* Statistics Cards */}
      <StatsGrid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <div className="stat-label">Total Staff</div>
            <div className="stat-number">{stats.totalStaff}</div>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard className="attendance">
            <div className="stat-label">Present Today</div>
            <div className="stat-number">{stats.presentToday}</div>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard className="pending">
            <div className="stat-label">Pending Leaves</div>
            <div className="stat-number">{stats.pendingLeaves}</div>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard className="approved">
            <div className="stat-label">Avg Attendance</div>
            <div className="stat-number">{stats.averageAttendance}%</div>
          </StatCard>
        </Grid>
      </StatsGrid>

      {/* Staff Members Table */}
      <Card sx={{ marginBottom: '32px' }}>
        <Typography variant="h6" sx={{ padding: '16px', fontWeight: 'bold' }}>
          Staff Members
        </Typography>
        <TableWrapper>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Department</strong></TableCell>
                <TableCell><strong>Position</strong></TableCell>
                <TableCell><strong>Salary</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staffMembers.map((staff) => (
                <TableRow key={staff.id} hover>
                  <TableCell>{`${staff.firstName} ${staff.lastName}`}</TableCell>
                  <TableCell>{staff.email}</TableCell>
                  <TableCell>{staff.department}</TableCell>
                  <TableCell>{staff.position}</TableCell>
                  <TableCell>Rs. {(staff.salary / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <StatusChip
                      label={staff.isActive ? 'Active' : 'Inactive'}
                      status={staff.isActive ? 'APPROVED' : 'ABSENT'}
                    />
                  </TableCell>
                  <TableCell>
                    <ActionButton size="small" variant="outlined" startIcon={<EditIcon />}>
                      Edit
                    </ActionButton>
                    <ActionButton size="small" variant="outlined" color="error" startIcon={<DeleteIcon />}>
                      Delete
                    </ActionButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrapper>
      </Card>

      {/* Pending Leave Requests */}
      <Card sx={{ marginBottom: '32px' }}>
        <Typography variant="h6" sx={{ padding: '16px', fontWeight: 'bold' }}>
          Pending Leave Requests
        </Typography>
        <TableWrapper>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Employee</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>From Date</strong></TableCell>
                <TableCell><strong>To Date</strong></TableCell>
                <TableCell><strong>Days</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveRequests
                .filter((l) => l.approvalStatus === 'PENDING')
                .map((leave) => (
                  <TableRow key={leave.id} hover>
                    <TableCell>Employee {leave.employeeId}</TableCell>
                    <TableCell>{leave.leaveType}</TableCell>
                    <TableCell>{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                    <TableCell>{leave.daysUsed}</TableCell>
                    <TableCell>
                      <StatusChip label="Pending" status="PENDING" />
                    </TableCell>
                    <TableCell>
                      <ActionButton
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleApproveLeave(leave.id)}
                      >
                        Approve
                      </ActionButton>
                      <ActionButton
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => handleRejectLeave(leave.id)}
                      >
                        Reject
                      </ActionButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableWrapper>
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={dialogOpen && dialogType === 'staff'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Staff Member</DialogTitle>
        <DialogContent sx={{ paddingTop: '16px' }}>
          <TextField
            fullWidth
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Department"
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Position"
            name="position"
            value={formData.position}
            onChange={handleInputChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Salary (in paisa)"
            name="salary"
            type="number"
            value={formData.salary}
            onChange={handleInputChange}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAddStaff} variant="contained" color="primary">
            Add Staff
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContainer>
  );
};

export default LabourDashboard;
