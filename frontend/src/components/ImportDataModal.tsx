import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from '@mui/material';
import api from '../services/api';

interface ImportDataModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ImportDataModal: React.FC<ImportDataModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [salesmanField, setSalesmanField] = useState('salesman_name');
  const [amountField, setAmountField] = useState('sales_amount');
  const [monthField, setMonthField] = useState('');
  const [yearField, setYearField] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const text = await file.text();
      setCsvContent(text);
      setError(null);
    }
  };

  const handleValidate = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/api/v1/imports/validate', {
        csvContent,
        salesmanField,
        amountField,
        monthField: monthField || undefined,
        yearField: yearField || undefined,
        previewRows: 5,
      });

      setValidationResult(response.data);
      if (!response.data.isValid) {
        setError('Validation failed. Please check the errors below.');
      } else {
        setStep(1);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/api/v1/imports/sales', {
        csvContent,
        filename: csvFile?.name || 'import.csv',
        salesmanField,
        amountField,
        monthField: monthField || undefined,
        yearField: yearField || undefined,
      });

      setImportResult(response.data);
      setStep(2);
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setCsvFile(null);
    setCsvContent('');
    setSalesmanField('salesman_name');
    setAmountField('sales_amount');
    setMonthField('');
    setYearField('');
    setError(null);
    setValidationResult(null);
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Import Sales Data</DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          <Step>
            <StepLabel>Upload & Configure</StepLabel>
          </Step>
          <Step>
            <StepLabel>Validate</StepLabel>
          </Step>
          <Step>
            <StepLabel>Complete</StepLabel>
          </Step>
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Step 0: Upload & Configure */}
        {step === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                1. Select CSV File
              </Typography>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                style={{ display: 'block', marginBottom: '16px' }}
              />
              {csvFile && (
                <Typography variant="body2" color="success.main">
                  ✓ {csvFile.name} ({csvFile.size} bytes)
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                2. Map CSV Columns
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <TextField
                  label="Salesman Column (e.g., 'salesman_name')"
                  value={salesmanField}
                  onChange={(e) => setSalesmanField(e.target.value)}
                  size="small"
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <TextField
                  label="Amount Column (e.g., 'sales_amount')"
                  value={amountField}
                  onChange={(e) => setAmountField(e.target.value)}
                  size="small"
                />
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Month Column (Optional)"
                  value={monthField}
                  onChange={(e) => setMonthField(e.target.value)}
                  size="small"
                  flex={1}
                />
                <TextField
                  label="Year Column (Optional)"
                  value={yearField}
                  onChange={(e) => setYearField(e.target.value)}
                  size="small"
                  flex={1}
                />
              </Box>
            </Box>

            <Alert severity="info">
              Sample CSV Format:
              <pre style={{ fontSize: '11px', margin: '8px 0' }}>
                salesman_name,sales_amount{'\n'}
                John Doe,50000{'\n'}
                Jane Smith,75000
              </pre>
            </Alert>
          </Box>
        )}

        {/* Step 1: Validate */}
        {step === 1 && validationResult && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert
              severity={validationResult.isValid ? 'success' : 'warning'}
            >
              {validationResult.isValid
                ? `✓ Validation successful! ${validationResult.successfulMaps} valid rows found.`
                : `${validationResult.failedMaps} rows failed validation.`}
            </Alert>

            {validationResult.errors && validationResult.errors.length > 0 && (
              <Box>
                <Typography variant="subtitle2">Errors:</Typography>
                <Box sx={{ maxHeight: '200px', overflow: 'auto', mb: 2 }}>
                  {validationResult.errors.map((err: any, idx: number) => (
                    <Typography key={idx} variant="caption" sx={{ display: 'block', color: '#d32f2f' }}>
                      Row {err.rowIndex}: {err.error}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            {validationResult.sampleMappedData && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Sample Data:
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell>Salesman ID</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {validationResult.sampleMappedData.map((row: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{row.salesmanId}</TableCell>
                          <TableCell align="right">Rs {(row.amount / 100).toLocaleString()}</TableCell>
                          <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}

        {/* Step 2: Complete */}
        {step === 2 && importResult && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="success">
              ✓ Import completed successfully!
            </Alert>

            <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: '4px' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Summary:
              </Typography>
              <Typography variant="body2">
                • Total Rows: {importResult.summary.totalRows}
              </Typography>
              <Typography variant="body2">
                • Successful: {importResult.summary.successfulMaps}
              </Typography>
              <Typography variant="body2">
                • Failed: {importResult.summary.failedMaps}
              </Typography>
              <Typography variant="body2">
                • Targets Updated: {importResult.summary.targetsUpdated}
              </Typography>
              <Typography variant="body2">
                • Targets Created: {importResult.summary.targetsCreated}
              </Typography>
            </Box>
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {step === 2 ? 'Close' : 'Cancel'}
        </Button>

        {step === 0 && (
          <Button
            onClick={handleValidate}
            variant="contained"
            disabled={!csvFile || !salesmanField || !amountField || loading}
          >
            Validate
          </Button>
        )}

        {step === 1 && (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!validationResult?.isValid || loading}
          >
            Import Data
          </Button>
        )}

        {step === 2 && (
          <Button onClick={handleClose} variant="contained">
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportDataModal;
