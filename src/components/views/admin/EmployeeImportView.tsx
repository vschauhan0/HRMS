'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, ArrowLeft, CheckCircle2, Loader2, FileSpreadsheet, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { apiUpload, apiPost, apiGet } from '@/lib/api-client';
import { toast } from 'sonner';
import type { EmployeeImportRow, Branch, Company } from '@/types';

interface ValidRecord extends EmployeeImportRow {
  _isNew?: boolean;
}

interface InvalidRecord {
  row: number;
  message: string;
  data?: Partial<EmployeeImportRow>;
}

export default function EmployeeImportView() {
  const { navigate } = useNavStore();
  const { isSuperAdmin, selectedCompany: storeCompany } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [companyId, setCompanyId] = useState(storeCompany?.id || '');
  const [branchId, setBranchId] = useState('');

  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [fileName, setFileName] = useState('');

  const [validRecords, setValidRecords] = useState<ValidRecord[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<InvalidRecord[]>([]);

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

  // For non-super-admin, use storeCompany
  const effectiveCompanyId = isSuperAdmin() ? companyId : (storeCompany?.id || '');

  const branchesByCode = new Map(branches.filter(b => b.code).map(b => [b.code, b.name]));

  function handleFileSelect(file: File) {
    if (!file.name.match(/\.xlsx?$/i)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    uploadFile(file);
  }

  async function uploadFile(file: File) {
    if (!effectiveCompanyId) {
      toast.error('No company selected');
      return;
    }
    setUploading(true);
    try {
      if (!branchId) {
        toast.error('Please select a branch');
        setUploading(false);
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', effectiveCompanyId);
      formData.append('branchId', branchId);
      const res = await apiUpload<{
        valid: ValidRecord[];
        invalid: InvalidRecord[];
      }>('/employees/import', formData);
      setValidRecords(res.valid || []);
      setInvalidRecords(res.invalid || []);
      setFileName(file.name);
      setStep('preview');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      await apiPost('/employees/import/confirm', {
        records: validRecords,
        companyId: effectiveCompanyId,
        branchId,
      });
      toast.success(
        `${validRecords.length} employee(s) imported successfully`
      );
      setStep('done');
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm import');
    } finally {
      setConfirming(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  if (uploading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Import Employees</h1>
        <Card className="rounded-xl border">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Processing file...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('employees')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Import Employees</h1>
      </div>

      {step === 'done' ? (
        <Card className="rounded-xl border">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-lg font-semibold">Import Complete</h2>
            <p className="text-muted-foreground">
              {validRecords.length} employee(s) have been imported.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => navigate('employees')}>Back to Employees</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload');
                  setValidRecords([]);
                  setInvalidRecords([]);
                  setFileName('');
                }}
              >
                Import More
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
                <p className="text-sm text-muted-foreground">New / Updated</p>
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
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="hidden sm:table-cell">Mobile</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRecords.map((r, i) => (
                        <TableRow key={i} className="bg-emerald-50/50 dark:bg-emerald-950/10">
                          <TableCell className="font-mono text-sm">{r.employeeCode}</TableCell>
                          <TableCell className="text-sm">{r.firstName} {r.lastName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.email}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{r.mobile || '-'}</TableCell>
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
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invalidRecords.map((r, i) => {
                        const name = [r.data?.firstName, r.data?.lastName].filter(Boolean).join(' ') || '-';
                        return (
                          <TableRow key={i} className="bg-red-50/50 dark:bg-red-950/10">
                            <TableCell className="text-sm font-mono">{r.row}</TableCell>
                            <TableCell className="text-sm font-mono">{r.data?.employeeCode || '-'}</TableCell>
                            <TableCell className="text-sm">{name}</TableCell>
                            <TableCell className="text-sm">{r.data?.email || '-'}</TableCell>
                            <TableCell className="text-sm">{r.data?.mobile || '-'}</TableCell>
                            <TableCell className="text-sm text-red-700 dark:text-red-400 font-medium">
                              {r.message}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
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
                setStep('upload');
                setValidRecords([]);
                setInvalidRecords([]);
                setFileName('');
              }}
            >
              Re-upload
            </Button>
          </div>
        </div>
      ) : (
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* Company & Branch selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={companyId || (storeCompany?.id || '')} onValueChange={(v) => { setCompanyId(v); setBranchId(''); }}>
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
            </div>

            {/* Download Template */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => window.open('/api/v1/templates?type=employee', '_blank')}>
                <Download className="h-4 w-4 mr-1.5" />
                Download Template
              </Button>
            </div>

            {/* Upload area */}
            <div
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 sm:p-12 transition-colors hover:border-primary/50 cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">
                Drag and drop your Excel file here
              </p>
              <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
              <p className="text-xs text-muted-foreground">Supports .xlsx, .xls files</p>
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

            <Card className="rounded-lg bg-muted/50 border-0">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Excel should have columns: Code, Employee Name, Mobile, Email. All columns are required. All other details can be filled by the employee later.
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  );
}