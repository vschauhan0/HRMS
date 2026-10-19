'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useNavStore } from '@/store/nav-store';
import { useAuthStore } from '@/store/auth-store';
import { apiGet, apiUpload, apiPost } from '@/lib/api-client';
import { MONTHS } from '@/lib/constants';
import { toast } from 'sonner';
import type { Branch, Company, SalaryImportRow } from '@/types';

interface InvalidRow {
  row: number;
  message: string;
  data?: Partial<SalaryImportRow>;
}

export default function SalaryUploadView() {
  const { navigate } = useNavStore();
  const { isSuperAdmin, selectedCompany: storeCompany } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [companyId, setCompanyId] = useState(storeCompany?.id || '');
  const [branchId, setBranchId] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState<'form' | 'preview' | 'done'>('form');
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [validRecords, setValidRecords] = useState<SalaryImportRow[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<InvalidRow[]>([]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  // Fetch companies
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const data = await apiGet<Company[]>('/companies?pageSize=100');
        setCompanies(Array.isArray(data) ? data : []);
      } catch {
        setCompanies([]);
      }
    }
    fetchCompanies();
  }, []);

  // Fetch branches
  useEffect(() => {
    if (!companyId) {
      setBranches([]);
      return;
    }
    async function fetchBranches() {
      try {
        const data = await apiGet<Branch[]>(
          `/branches?companyId=${companyId}&pageSize=100`
        );
        setBranches(Array.isArray(data) ? data : []);
      } catch {
        setBranches([]);
      }
    }
    fetchBranches();
  }, [companyId]);

  function handleFileSelect(file: File) {
    if (!file.name.match(/\.xlsx?$/i)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    setFileName(file.name);
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
    }
  }

  async function handlePreview() {
    if (!companyId || !branchId || !month || !year) {
      toast.error('Please fill all required fields');
      return;
    }
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setPreviewing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', companyId);
      formData.append('branchId', branchId);
      formData.append('month', month);
      formData.append('year', year);

      const res = await apiUpload<{
        valid: SalaryImportRow[];
        invalid: InvalidRow[];
      }>('/salary/import', formData);

      setValidRecords(res.valid || []);
      setInvalidRecords(res.invalid || []);
      setStep('preview');
    } catch (err: any) {
      toast.error(err.message || 'Failed to preview file');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      await apiPost('/salary/import/confirm', {
        records: validRecords,
        companyId,
        branchId,
        month: Number(month),
        year: Number(year),
        fileName,
      });
      toast.success('Salary imported successfully');
      setStep('done');
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm import');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('salary')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Upload Salary</h1>
      </div>

      {step === 'done' ? (
        <Card className="rounded-xl border">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-lg font-semibold">Salary Import Complete</h2>
            <p className="text-muted-foreground">
              {validRecords.length} salary record(s) have been imported.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => navigate('salary')}>Back to Salary</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('form');
                  setValidRecords([]);
                  setInvalidRecords([]);
                  setFileName('');
                }}
              >
                Upload More
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : step === 'preview' ? (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="rounded-xl border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-emerald-600">
                  {validRecords.length}
                </p>
                <p className="text-sm text-muted-foreground">Valid</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-red-600">
                  {invalidRecords.length}
                </p>
                <p className="text-sm text-muted-foreground">Invalid</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">
                  {validRecords.length + invalidRecords.length}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
          </div>

          {/* Valid records */}
          {validRecords.length > 0 && (
            <Card className="rounded-xl border">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-3">
                  Valid Records
                </h3>
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Emp Code</TableHead>
                        <TableHead>Employee Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Branch</TableHead>
                        <TableHead className="hidden sm:table-cell">Working Days</TableHead>
                        <TableHead className="hidden sm:table-cell">Present Days</TableHead>
                        <TableHead className="hidden md:table-cell">Basic Salary</TableHead>
                        <TableHead>Gross</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRecords.map((r, i) => (
                        <TableRow key={i} className="bg-emerald-50/50 dark:bg-emerald-950/10">
                          <TableCell className="font-mono text-sm">
                            {r.employeeCode}
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.employeeName || r.employeeCode}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {branches.find(b => b.id === branchId)?.name || '-'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {r.workingDays ?? '-'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {r.presentDays ?? '-'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {r.basicSalary?.toLocaleString() ?? '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.grossSalary?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.totalDeduction?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {r.netSalary?.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invalid records */}
          {invalidRecords.length > 0 && (
            <Card className="rounded-xl border">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-sm font-medium text-red-700 dark:text-red-400 mb-3">
                  Invalid Records
                </h3>
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invalidRecords.map((r, i) => (
                        <TableRow key={i} className="bg-red-50/50 dark:bg-red-950/10">
                          <TableCell className="font-mono text-sm">{r.row}</TableCell>
                          <TableCell className="text-sm text-red-700 dark:text-red-400">
                            {r.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleConfirm}
              disabled={validRecords.length === 0 || confirming}
            >
              {confirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Import ({validRecords.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStep('form');
                setValidRecords([]);
                setInvalidRecords([]);
              }}
            >
              Re-upload
            </Button>
          </div>
        </div>
      ) : (
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Download Template */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => window.open('/api/v1/templates?type=salary', '_blank')}>
                <Download className="h-4 w-4 mr-1.5" />
                Download Template
              </Button>
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label>Excel File</Label>
              <div
                className="flex items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors hover:border-primary/50 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                {fileName ? (
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{fileName}</p>
                      <p className="text-xs text-muted-foreground">Click to change</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click or drag to upload Excel file
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>
            </div>

            <Card className="rounded-lg bg-muted/50 border-0">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Excel should have columns: Employee Code, Employee Name, Working Days, Present Days, Leave, Salary, Basic Salary, HRA, DA, CON.AL, COMM, OTHER, Gross Salary, PF, ESI, PT, TDS, Advance, Total Deduction, Net Salary
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button
                onClick={handlePreview}
                disabled={previewing || !companyId || !branchId || !month || !year || !fileName}
              >
                {previewing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Preview
              </Button>
              <Button variant="outline" onClick={() => navigate('salary')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}