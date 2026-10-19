'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import type { Form16Document } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText, Calendar, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Form16Pages, { mapPreviewDataToForm16ViewData } from '@/components/shared/form16-pages';

export default function MyForm16View() {
  const [documents, setDocuments] = useState<Form16Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Preview Modal State
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    async function fetchForm16() {
      try {
        const res = await apiGet<Form16Document[]>('/form16');
        setDocuments(res || []);
      } catch {
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    }
    fetchForm16();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  async function handleDownload(doc: Form16Document) {
    const { token } = (await import('@/store/auth-store')).useAuthStore.getState();
    const link = document.createElement('a');
    link.href = `/api/v1/form16/${doc.id}/download`;
    link.download = `Form16_${doc.financialYear}.pdf`;
    
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Form 16 Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download and view your Form 16 tax documents
        </p>
      </div>

      {/* Empty State */}
      {documents.length === 0 ? (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="py-16">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No Form 16 documents available yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="rounded-xl shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      FY {doc.financialYear}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Uploaded {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPreview(doc.id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Interactive Form 16 High-Fidelity Viewer Modal */}
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