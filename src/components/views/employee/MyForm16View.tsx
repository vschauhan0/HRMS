'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import type { Form16Document } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, Calendar } from 'lucide-react';

export default function MyForm16View() {
  const [documents, setDocuments] = useState<Form16Document[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
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
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Form 16 Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download your Form 16 tax documents
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                    <FileText className="h-5 w-5 text-orange-600" />
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      disabled
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}