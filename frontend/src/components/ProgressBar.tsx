import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  showPercentage?: boolean;
  height?: number;
  daysRemaining?: number;
  currency?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  target,
  label = 'Progress',
  showPercentage = true,
  height = 10,
  daysRemaining,
  currency = 'Rs',
}) => {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const isCompleted = percentage >= 100;

  // Determine color based on progress
  let color: 'inherit' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' = 'primary';
  if (isCompleted) {
    color = 'success';
  } else if (percentage >= 75) {
    color = 'info';
  } else if (percentage >= 50) {
    color = 'warning';
  } else if (percentage < 25) {
    color = 'error';
  }

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle2">{label}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {showPercentage && (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 'bold',
                color: isCompleted ? '#2e7d32' : '#1976d2',
              }}
            >
              {Math.round(percentage)}%
            </Typography>
          )}
          {daysRemaining !== undefined && (
            <Typography variant="body2" sx={{ color: '#666' }}>
              {daysRemaining} days left
            </Typography>
          )}
        </Box>
      </Box>

      {/* Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={Math.min(percentage, 100)}
        sx={{
          height: height,
          borderRadius: '4px',
          backgroundColor: '#e0e0e0',
          '& .MuiLinearProgress-bar': {
            borderRadius: '4px',
            backgroundColor: getColorValue(color),
          },
        }}
      />

      {/* Amount Details */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, fontSize: '12px', color: '#666' }}>
        <span>
          {currency} {(current / 100).toLocaleString()} achieved
        </span>
        <span>
          Target: {currency} {(target / 100).toLocaleString()}
        </span>
      </Box>

      {/* Status Message */}
      {isCompleted && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            marginTop: '8px',
            color: '#2e7d32',
            fontWeight: 'bold',
          }}
        >
          ✓ Target Completed!
        </Typography>
      )}
    </Box>
  );
};

function getColorValue(color: string): string {
  const colors: Record<string, string> = {
    primary: '#1976d2',
    success: '#2e7d32',
    warning: '#f57c00',
    error: '#d32f2f',
    info: '#0288d1',
  };
  return colors[color] || colors.primary;
}

export default ProgressBar;
