'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Download, Trash2, Loader2, Search, FileText, X } from 'lucide-react';
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
import { apiGet, apiUpload, apiDelete } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Form16Document, Employee } from '@/types';

export default function Form16View() {
  const [documents, setDocuments] = useState<Form16Document[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear();
  const financialYears = Array.from({ length: 5 }, (_, i) => {
    const end = currentYear - i;
    const start = end - 1;
    return `${start}-${String(end).slice(2)}`;
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiGet<Form16Document[]>('/form16');
        setDocuments(res || []);
      } catch {
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function fetchEmployees() {
      if (!employeeSearch || employeeSearch.length < 2) {
        setEmployees([]);
        return;
      }
      try {
        const res = await apiGet<{ data: Employee[] }>(
          `/employees?search=${employeeSearch}&pageSize=20`
        );
        setEmployees(res.data || []);
      } catch {
        setEmployees([]);
      }
    }
    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [employeeSearch]);

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
      setDialogOpen(false);
      setSelectedEmployee('');
      setFinancialYear('');
      setFile(null);

      // Refresh list
      const res = await apiGet<Form16Document[]>('/form16');
      setDocuments(res || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload Form 16');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: Form16Document) {
    const { token } = (await import('@/store/auth-store')).useAuthStore.getState();
    const link = document.createElement('a');
    link.href = `/api/v1/form16/${doc.id}/download`;
    link.download = `Form16_${doc.financialYear}.pdf`;
    if (token) {
      // Open in new tab with auth header workaround
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

  async function handleDelete(doc: Form16Document) {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Form 16 Documents</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
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
                  <div className="max-h-40 overflow-y-auto rounded-md border">
                    {employees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between"
                        onClick={() => {
                          setSelectedEmployee(emp.id);
                          setEmployeeSearch(
                            `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`
                          );
                          setEmployees([]);
                        }}
                      >
                        <span>
                          {emp.firstName} {emp.lastName}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {emp.employeeCode}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedEmployee && (
                  <div className="flex items-center gap-2 text-sm">
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
                      <SelectItem key={fy} value={fy}>
                        {fy}
                      </SelectItem>
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
                      <span className="text-sm">{file.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Click to select PDF
                    </span>
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

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="rounded-xl border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No Form 16 documents uploaded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Financial Year</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="text-sm">
                      {/* We'd ideally have employee info; show ID as fallback */}
                      {doc.employeeId}
                    </TableCell>
                    <TableCell className="text-sm">{doc.financialYear}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
                      <p className="font-medium text-sm">{doc.employeeId}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.financialYear}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex justify-end gap-1 pt-3 mt-3 border-t">
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
    </div>
  );
}