'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, Download, Trash2, Loader2, Search, FileText, X, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Card, CardContent } from '@/components/ui/card';
import { apiGet, apiUpload, apiDelete, apiPost } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Form16Document, Employee } from '@/types';
import { useAuthStore } from '@/store/auth-store';
import Form16Pages, {
  type Form16FieldName,
  mapEditDataToForm16ViewData,
  mapPreviewDataToForm16ViewData,
} from '@/components/shared/form16-pages';

export default function Form16View() {
  const { selectedCompany } = useAuthStore();
  const [documents, setDocuments] = useState<Form16Document[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  // Upload Form State
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate Form State
  const [genTarget, setGenTarget] = useState<'ALL' | 'SINGLE'>('SINGLE');
  const [genEmployeeId, setGenEmployeeId] = useState('');
  const [genEmployeeSearch, setGenEmployeeSearch] = useState('');
  const [genFinancialYear, setGenFinancialYear] = useState('');
  const [genEmployees, setGenEmployees] = useState<Employee[]>([]);

  // Pre-filled Edit Form State
  const [editStep, setEditStep] = useState<'SELECT' | 'EDIT'>('SELECT');
  const [editData, setEditData] = useState<any>(null);
  const [loadingPrecalculate, setLoadingPrecalculate] = useState(false);

  // Preview Modal State
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const currentYear = new Date().getFullYear();
  const financialYears = Array.from({ length: 5 }, (_, i) => {
    const end = currentYear - i;
    const start = end - 1;
    return `${start}-${String(end).slice(2)}`;
  });

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany?.id) params.set('companyId', selectedCompany.id);
      const res = await apiGet<Form16Document[]>(`/form16?${params.toString()}`);
      setDocuments(res || []);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Search Employees for Upload
  useEffect(() => {
    async function fetchEmployees() {
      if (!employeeSearch || employeeSearch.length < 2) {
        setEmployees([]);
        return;
      }
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('search', employeeSearch);
        searchParams.set('pageSize', '20');
        if (selectedCompany?.id) searchParams.set('companyId', selectedCompany.id);
        const res = await apiGet<{ data: Employee[] }>(`/employees?${searchParams.toString()}`);
        setEmployees(res.data || []);
      } catch {
        setEmployees([]);
      }
    }
    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [employeeSearch, selectedCompany]);

  // Search Employees for Generate
  useEffect(() => {
    async function fetchGenEmployees() {
      if (!genEmployeeSearch || genEmployeeSearch.length < 2) {
        setGenEmployees([]);
        return;
      }
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('search', genEmployeeSearch);
        searchParams.set('pageSize', '20');
        if (selectedCompany?.id) searchParams.set('companyId', selectedCompany.id);
        const res = await apiGet<{ data: Employee[] }>(`/employees?${searchParams.toString()}`);
        setGenEmployees(res.data || []);
      } catch {
        setGenEmployees([]);
      }
    }
    const timer = setTimeout(fetchGenEmployees, 300);
    return () => clearTimeout(timer);
  }, [genEmployeeSearch, selectedCompany]);

  async function handleUpload() {
    if (!selectedEmployee || !financialYear || !file) {
      toast.error('Please fill all fields');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('employeeId', selectedEmployee);
      formData.append('financialYear', financialYear);
      formData.append('file', file);

      await apiUpload('/form16', formData);
      toast.success('Form 16 uploaded successfully');
      setUploadDialogOpen(false);
      setSelectedEmployee('');
      setFinancialYear('');
      setFile(null);
      setEmployeeSearch('');
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload Form 16');
    } finally {
      setUploading(false);
    }
  }

  const formatAmount = (num: number) => {
    if (num === 0) return '0.00';
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const calculateClientTaxes = (data: any) => {
    if (!data) return null;

    const q1A = Number(data.q1Amount || 0);
    const q1T = Number(data.q1Tds || 0);
    const q2A = Number(data.q2Amount || 0);
    const q2T = Number(data.q2Tds || 0);
    const q3A = Number(data.q3Amount || 0);
    const q3T = Number(data.q3Tds || 0);
    const q4A = Number(data.q4Amount || 0);
    const q4T = Number(data.q4Tds || 0);

    const totalGross = q1A + q2A + q3A + q4A;
    const totalTds = q1T + q2T + q3T + q4T;

    const standardDeduction = Number(data.standardDeduction || 0);
    const sec80C = Number(data.sec80C || 0);
    const sec80CCC = Number(data.sec80CCC || 0);
    const sec80CCD1 = Number(data.sec80CCD1 || 0);
    const sec80CCD1B = Number(data.sec80CCD1B || 0);
    const sec80CCD2 = Number(data.sec80CCD2 || 0);
    const sec80D = Number(data.sec80D || 0);
    const sec80E = Number(data.sec80E || 0);
    const sec80G = Number(data.sec80G || 0);
    const sec80TTA = Number(data.sec80TTA || 0);
    const otherDeductions = Number(data.otherDeductions || 0);

    const totalDeductionVIA = sec80C + sec80CCC + sec80CCD1 + sec80CCD1B + sec80CCD2 + sec80D + sec80E + sec80G + sec80TTA + otherDeductions;
    const taxableIncome = Math.max(0, totalGross - standardDeduction - totalDeductionVIA);

    let taxOnTotalIncome = 0;
    if (taxableIncome > 2000000) {
      taxOnTotalIncome = 200000 + (taxableIncome - 2000000) * 0.3;
    } else if (taxableIncome > 1600000) {
      taxOnTotalIncome = 120000 + (taxableIncome - 1600000) * 0.2;
    } else if (taxableIncome > 1200000) {
      taxOnTotalIncome = 60000 + (taxableIncome - 1200000) * 0.15;
    } else if (taxableIncome > 800000) {
      taxOnTotalIncome = 20000 + (taxableIncome - 800000) * 0.1;
    } else if (taxableIncome > 400000) {
      taxOnTotalIncome = (taxableIncome - 400000) * 0.05;
    }

    const rebate87A = data.rebate87AOverride !== null && data.rebate87AOverride !== undefined
      ? Number(data.rebate87AOverride)
      : (taxableIncome <= 700000 ? taxOnTotalIncome : 0);

    const taxAfterRebate = Math.max(0, taxOnTotalIncome - rebate87A);
    const cess = Math.round(taxAfterRebate * 0.04);
    const taxPayable = taxAfterRebate + cess;

    const relief89 = Number(data.relief89 || 0);
    const otherTds = Number(data.otherTds || 0);
    const netTaxPayableOrRefund = taxPayable - relief89 - otherTds - totalTds;

    return {
      totalGross,
      totalTds,
      standardDeduction,
      totalDeductionVIA,
      taxableIncome,
      taxOnTotalIncome,
      rebate87A,
      cess,
      taxPayable,
      netTaxPayableOrRefund,
    };
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  async function handleStartEdit() {
    if (genTarget === 'SINGLE' && !genEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!genFinancialYear) {
      toast.error('Please select a financial year');
      return;
    }

    setLoadingPrecalculate(true);
    try {
      const res = await apiGet<any>(`/form16/precalculate?employeeId=${genEmployeeId}&financialYear=${genFinancialYear}`);
      const d = res?.data || res;
      if (d && d.employerName) {
        setEditData({
          employerName: d.employerName,
          employerAddress: d.employerAddress,
          employerPan: d.employerPan,
          employerTan: d.employerTan,
          employeeName: d.employeeName,
          employeePan: d.employeePan,
          employeeCode: d.employeeCode,
          financialYear: d.financialYear,
          assessmentYear: d.assessmentYear,
          periodFrom: d.periodFrom,
          periodTo: d.periodTo,
          q1Amount: d.quarters.q1Amount,
          q1Tds: d.quarters.q1Tds,
          q2Amount: d.quarters.q2Amount,
          q2Tds: d.quarters.q2Tds,
          q3Amount: d.quarters.q3Amount,
          q3Tds: d.quarters.q3Tds,
          q4Amount: d.quarters.q4Amount,
          q4Tds: d.quarters.q4Tds,
          verificationPlace: d.verificationPlace,
          verificationDate: d.verificationDate,
          verificationName: d.verificationName,
          verificationDesignation: d.verificationDesignation,
          
          // Deductions & overrides
          standardDeduction: d.taxCalculations.standardDeduction ?? 75000,
          sec80C: d.taxCalculations.sec80C ?? 0,
          sec80CCC: d.taxCalculations.sec80CCC ?? 0,
          sec80CCD1: d.taxCalculations.sec80CCD1 ?? 0,
          sec80CCD1B: d.taxCalculations.sec80CCD1B ?? 0,
          sec80CCD2: d.taxCalculations.sec80CCD2 ?? 0,
          sec80D: d.taxCalculations.sec80D ?? 0,
          sec80E: d.taxCalculations.sec80E ?? 0,
          sec80G: d.taxCalculations.sec80G ?? 0,
          sec80TTA: d.taxCalculations.sec80TTA ?? 0,
          otherDeductions: d.taxCalculations.otherDeductions ?? 0,
          rebate87AOverride: d.taxCalculations.rebate87A ?? null,
          relief89: d.taxCalculations.relief89 ?? 0,
          otherTds: d.taxCalculations.otherTds ?? 0,
        });
        setEditStep('EDIT');
      } else {
        toast.error(res.message || 'Failed to fetch default calculations');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch default calculations');
    } finally {
      setLoadingPrecalculate(false);
    }
  }

  async function handleGenerate() {
    if (genTarget === 'SINGLE' && !genEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!genFinancialYear) {
      toast.error('Please select a financial year');
      return;
    }

    setGenerating(true);
    try {
      let payload: any = {
        employeeId: genTarget === 'SINGLE' ? genEmployeeId : 'ALL',
        financialYear: genFinancialYear,
        companyId: selectedCompany?.id,
      };

      if (genTarget === 'SINGLE' && editData) {
        const calcs = calculateClientTaxes(editData);
        payload.customData = {
          employerName: editData.employerName,
          employerAddress: editData.employerAddress,
          employerPan: editData.employerPan,
          employerTan: editData.employerTan,
          employeeName: editData.employeeName,
          employeePan: editData.employeePan,
          employeeCode: editData.employeeCode,
          periodFrom: editData.periodFrom,
          periodTo: editData.periodTo,
          assessmentYear: editData.assessmentYear,
          quarters: {
            q1Amount: Number(editData.q1Amount),
            q1Tds: Number(editData.q1Tds),
            q2Amount: Number(editData.q2Amount),
            q2Tds: Number(editData.q2Tds),
            q3Amount: Number(editData.q3Amount),
            q3Tds: Number(editData.q3Tds),
            q4Amount: Number(editData.q4Amount),
            q4Tds: Number(editData.q4Tds),
          },
          verificationPlace: editData.verificationPlace,
          verificationDate: editData.verificationDate,
          verificationName: editData.verificationName,
          verificationDesignation: editData.verificationDesignation,
          taxOverrides: {
            grossSalary: calcs?.totalGross,
            standardDeduction: Number(editData.standardDeduction),
            chargeableSalary: Math.max(0, (calcs?.totalGross || 0) - Number(editData.standardDeduction)),
            grossTotalIncome: Math.max(0, (calcs?.totalGross || 0) - Number(editData.standardDeduction)),
            totalDeductionVIA: calcs?.totalDeductionVIA,
            taxableIncome: calcs?.taxableIncome,
            taxOnTotalIncome: calcs?.taxOnTotalIncome,
            rebate87A: calcs?.rebate87A,
            surcharge: 0,
            cess: calcs?.cess,
            taxPayable: calcs?.taxPayable,
            taxDeducted: (calcs?.totalTds || 0) + Number(editData.relief89) + Number(editData.otherTds),
            netTaxPayableOrRefund: calcs?.netTaxPayableOrRefund,
          }
        };
      }

      const res = await apiPost<any>('/form16/generate', payload);
      const results: any[] = Array.isArray(res) ? res : (res?.data ?? []);
      const successCount = results.filter((r) => r.success).length;
      toast.success(
        results.length > 1
          ? `Form 16 generation complete. Generated: ${successCount}/${results.length}`
          : 'Form 16 generated successfully'
      );
      setGenerateDialogOpen(false);
      setGenEmployeeId('');
      setGenEmployeeSearch('');
      setGenFinancialYear('');
      setEditStep('SELECT');
      setEditData(null);
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate Form 16');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(doc: Form16Document) {
    const { token } = (await import('@/store/auth-store')).useAuthStore.getState();
    const link = document.createElement('a');
    link.href = `/api/v1/form16/${doc.id}/download`;
    link.download = `Form16_${doc.employee?.employeeCode || 'employee'}_${doc.financialYear}.pdf`;
    
    if (token) {
      fetch(`/api/v1/form16/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => toast.error('Failed to download file'));
    }
  }

  async function handleViewPreview(docId: string) {
    setPreviewDocId(docId);
    setLoadingPreview(true);
    setPreviewData(null);
    try {
      const res = await apiGet<any>(`/form16/${docId}/view`);
      setPreviewData(res.data || res);
    } catch {
      toast.error('Failed to load Form 16 preview data');
      setPreviewDocId(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleDelete(doc: Form16Document) {
    if (!window.confirm('Are you sure you want to delete this Form 16 document?')) return;
    try {
      await apiDelete(`/form16/${doc.id}`);
      toast.success('Form 16 deleted successfully');
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete Form 16');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Form 16 Documents</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Generate Button */}
          <Dialog open={generateDialogOpen} onOpenChange={(open) => {
            setGenerateDialogOpen(open);
            if (!open) {
              setEditStep('SELECT');
              setEditData(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-9">
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Generate Form 16
              </Button>
            </DialogTrigger>
            <DialogContent className={editStep === 'EDIT' ? "sm:max-w-[850px] w-full max-h-[95vh] overflow-y-auto" : "sm:max-w-md"}>
              {editStep === 'SELECT' ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Generate Form 16</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-3">
                    <div className="space-y-2">
                      <Label>Target Employees</Label>
                      <Select value={genTarget} onValueChange={(v: any) => { setGenTarget(v); setGenEmployeeId(''); setGenEmployeeSearch(''); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SINGLE">Specific Person</SelectItem>
                          <SelectItem value="ALL">Generate for All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {genTarget === 'SINGLE' && (
                      <div className="space-y-2">
                        <Label>Employee</Label>
                        <Input
                          placeholder="Search employee by name or code..."
                          value={genEmployeeSearch}
                          onChange={(e) => setGenEmployeeSearch(e.target.value)}
                        />
                        {genEmployees.length > 0 && (
                          <div className="max-h-40 overflow-y-auto rounded-md border bg-background mt-1">
                            {genEmployees.map((emp) => (
                              <button
                                key={emp.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between"
                                onClick={() => {
                                  setGenEmployeeId(emp.id);
                                  setGenEmployeeSearch(`${emp.firstName} ${emp.lastName} (${emp.employeeCode})`);
                                  setGenEmployees([]);
                                }}
                              >
                                <span>{emp.firstName} {emp.lastName}</span>
                                <span className="text-muted-foreground font-mono text-xs">{emp.employeeCode}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {genEmployeeId && (
                          <div className="flex items-center gap-2 text-sm mt-1">
                            <Badge variant="secondary">
                              {genEmployeeSearch}
                              <button
                                type="button"
                                className="ml-1"
                                onClick={() => {
                                  setGenEmployeeId('');
                                  setGenEmployeeSearch('');
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Financial Year</Label>
                      <Select value={genFinancialYear} onValueChange={setGenFinancialYear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {financialYears.map((fy) => (
                            <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                      Note: Generation calculates quarterly income, TDS deductions, standard deductions (Rs. 75,000 u/s 115BAC), and rebates from confirmed salary slips uploaded in this financial year.
                    </div>

                    {genTarget === 'SINGLE' ? (
                      <Button
                        className="w-full"
                        onClick={handleStartEdit}
                        disabled={loadingPrecalculate || !genEmployeeId || !genFinancialYear}
                      >
                        {loadingPrecalculate ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Calculating Taxes...
                          </>
                        ) : (
                          'Next: Preview & Edit Fields'
                        )}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={handleGenerate}
                        disabled={generating || !genFinancialYear}
                      >
                        {generating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          'Generate for All'
                        )}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <DialogHeader className="border-b pb-2">
                    <DialogTitle className="flex items-center justify-between text-lg font-bold">
                      <span>Edit Form 16: {editData.employeeName} ({editData.employeeCode})</span>
                      <Badge variant="outline">FY {editData.financialYear}</Badge>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 pt-3">
                    <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                      Click any highlighted field on the form below to edit it directly. All totals and tax computations recalculate live as you type.
                    </div>

                    <div className="max-h-[65vh] overflow-y-auto rounded-lg">
                      <Form16Pages
                        data={mapEditDataToForm16ViewData(editData)}
                        editable
                        onFieldChange={handleFieldChange}
                      />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between border-t pt-3 mt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setEditStep('SELECT');
                          setEditData(null);
                        }}
                      >
                        Back
                      </Button>

                      <Button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating}
                      >
                        {generating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating PDF...
                          </>
                        ) : (
                          'Generate Form 16 PDF'
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>


          {/* Upload Button */}
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9">
                <Plus className="h-4 w-4 mr-1.5" />
                Upload Form 16
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Form 16</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Input
                    placeholder="Search employee by name or code..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                  />
                  {employees.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border mt-1">
                      {employees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between"
                          onClick={() => {
                            setSelectedEmployee(emp.id);
                            setEmployeeSearch(`${emp.firstName} ${emp.lastName} (${emp.employeeCode})`);
                            setEmployees([]);
                          }}
                        >
                          <span>{emp.firstName} {emp.lastName}</span>
                          <span className="text-muted-foreground font-mono text-xs">{emp.employeeCode}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedEmployee && (
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <Badge variant="secondary">
                        {employeeSearch}
                        <button
                          type="button"
                          className="ml-1"
                          onClick={() => {
                            setSelectedEmployee('');
                            setEmployeeSearch('');
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Financial Year</Label>
                  <Select value={financialYear} onValueChange={setFinancialYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {financialYears.map((fy) => (
                        <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>PDF File</Label>
                  <div
                    className="flex items-center justify-center rounded-lg border-2 border-dashed p-4 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {file ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm truncate max-w-[240px]">{file.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Click to select PDF</span>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setFile(f);
                      }}
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleUpload}
                  disabled={uploading || !selectedEmployee || !financialYear || !file}
                >
                  {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Upload
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="rounded-xl border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No Form 16 documents available yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block rounded-xl border overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Financial Year</TableHead>
                  <TableHead>Upload/Gen Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="text-sm">
                      {doc.employee ? `${doc.employee.firstName} ${doc.employee.lastName}` : doc.employeeId}
                      {doc.employee && (
                        <span className="block text-xs text-muted-foreground font-mono">{doc.employee.employeeCode}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">{doc.financialYear}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewPreview(doc.id)}
                        >
                          <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="rounded-xl border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{doc.employee ? `${doc.employee.firstName} ${doc.employee.lastName}` : doc.employeeId}</p>
                      {doc.employee && (
                        <p className="text-xs text-muted-foreground font-mono">{doc.employee.employeeCode}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5 font-bold">FY {doc.financialYear}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex justify-end gap-1 pt-3 mt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPreview(doc.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(doc)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!previewDocId} onOpenChange={(open) => { if (!open) setPreviewDocId(null); }}>
        <DialogContent className="sm:max-w-[820px] w-full max-h-[95vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
            <DialogTitle className="text-lg font-bold">
              Form 16 Live Preview {previewData && `· FY ${previewData.financialYear}`}
            </DialogTitle>
          </DialogHeader>

          {loadingPreview && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Calculating taxes and rendering preview...</p>
            </div>
          )}

          {previewData && (            <div className="space-y-6 pt-2">
              <Form16Pages data={mapPreviewDataToForm16ViewData(previewData)} />

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setPreviewDocId(null)}>Close</Button>
                <Button onClick={() => {
                  setPreviewDocId(null);
                  const doc = documents.find(d => d.id === previewDocId);
                  if (doc) handleDownload(doc);
                }}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}