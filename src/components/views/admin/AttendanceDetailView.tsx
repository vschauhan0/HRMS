'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Clock, CalendarDays, CheckCircle2, XCircle, AlertCircle, Calendar as CalendarIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavStore } from '@/store/nav-store';
import { apiGet } from '@/lib/api-client';
import { STATUS_COLORS } from '@/lib/constants';
import type { Attendance, PaginatedResponse, Employee } from '@/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AttendanceDetailView() {
  const { navigate, goBack, pageParams } = useNavStore();
  const { employeeId, month, year } = pageParams as { employeeId: string; month: string; year: string };

  const [records, setRecords] = useState<Attendance[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  const fetchDetails = useCallback(async () => {
    if (!employeeId) return;
    
    setLoading(true);
    try {
      const [attRes, empRes] = await Promise.all([
        apiGet<PaginatedResponse<Attendance>>(`/attendance?employeeId=${employeeId}&month=${month}&year=${year}&pageSize=31`),
        apiGet<Employee>(`/employees/${employeeId}`).catch(() => null)
      ]);

      setRecords(attRes.data || []);
      
      // Try to get employee from attendance records if empRes fails
      if (empRes) {
        setEmployee(empRes);
      } else if (attRes.data?.length > 0) {
        setEmployee(attRes.data[0].employee || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [employeeId, month, year, goBack]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Compute Summary Statistics
  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let holiday = 0;
    let weekOff = 0;
    let late = 0;
    let halfDay = 0;
    let totalMinutes = 0;

    records.forEach(r => {
      const s = r.status.toUpperCase();
      if (s === 'PRESENT') present++;
      else if (s === 'ABSENT') absent++;
      else if (s === 'LEAVE') leave++;
      else if (s === 'HOLIDAY') holiday++;
      else if (s === 'WEEK_OFF') weekOff++;
      else if (s === 'LATE') late++;
      else if (s === 'HALF_DAY') halfDay++;

      if (r.checkIn && r.checkOut) {
        const diffMs = new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime();
        totalMinutes += diffMs / (1000 * 60);
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMins = Math.floor(totalMinutes % 60);
    const formattedHours = `${totalHours}h ${remainingMins}m`;
    
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const workingDays = daysInMonth - holiday - weekOff;
    let attendancePercentage = 0;
    if (workingDays > 0) {
      attendancePercentage = Math.round(((present + late + (halfDay * 0.5)) / workingDays) * 100);
    }

    return { present, absent, leave, late, halfDay, holiday, weekOff, workingDays, formattedHours, attendancePercentage };
  }, [records, monthNum, yearNum]);

  // Calendar logic
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const firstDayOfWeek = new Date(yearNum, monthNum - 1, 1).getDay(); // 0 is Sunday
  
  // Create mapping of date to status
  const dateStatusMap = useMemo(() => {
    const map = new Map<number, Attendance>();
    records.forEach(r => {
      const d = new Date(r.date).getDate();
      map.set(d, r);
    });
    return map;
  }, [records]);

  const calendarCells: React.ReactNode[] = [];
  // Empty cells before 1st of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="h-20 border border-border/50 bg-muted/20 rounded-md"></div>);
  }

  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const record = dateStatusMap.get(d);
    const status = record?.status?.toUpperCase() || 'UNKNOWN';
    
    let bgColor = 'bg-card hover:bg-muted/50';
    let dotColor = 'bg-transparent';
    
    if (status === 'PRESENT') { bgColor = 'bg-emerald-50/50 dark:bg-emerald-950/20'; dotColor = 'bg-emerald-500'; }
    else if (status === 'ABSENT') { bgColor = 'bg-rose-50/50 dark:bg-rose-950/20'; dotColor = 'bg-rose-500'; }
    else if (status === 'LEAVE') { bgColor = 'bg-blue-50/50 dark:bg-blue-950/20'; dotColor = 'bg-blue-500'; }
    else if (status === 'LATE') { bgColor = 'bg-amber-50/50 dark:bg-amber-950/20'; dotColor = 'bg-amber-500'; }
    else if (status === 'HOLIDAY' || status === 'WEEK_OFF') { bgColor = 'bg-muted/50'; dotColor = 'bg-slate-400'; }
    else if (status === 'HALF_DAY') { bgColor = 'bg-purple-50/50 dark:bg-purple-950/20'; dotColor = 'bg-purple-500'; }

    calendarCells.push(
      <div key={`day-${d}`} className={`h-20 border border-border/50 rounded-md p-2 transition-colors flex flex-col ${bgColor}`}>
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium">{d}</span>
          {record && <div className={`w-2 h-2 rounded-full ${dotColor}`} title={status} />}
        </div>
        {record && (
          <div className="mt-auto flex flex-col text-[10px] text-muted-foreground font-mono">
            <span>In: {record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
            <span>Out: {record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
          </div>
        )}
      </div>
    );
  }

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>;
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => goBack()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Attendance Details</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              {MONTHS[monthNum - 1]} {yearNum}
            </p>
          </div>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" /> Export PDF
        </Button>
      </div>

      {/* Employee Info Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Employee</p>
              <p className="font-medium text-lg">{employee?.firstName} {employee?.lastName}</p>
              <p className="text-sm font-mono text-muted-foreground">{employee?.employeeCode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Company</p>
              <p className="font-medium">{employee?.company?.name || '-'}</p>
              <p className="text-sm text-muted-foreground">{employee?.branch?.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Department</p>
              <p className="font-medium">{employee?.department || '-'}</p>
              <p className="text-sm text-muted-foreground">{employee?.designation || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Status</p>
              <Badge variant="outline" className={employee?.status === 'ACTIVE' ? 'border-emerald-500 text-emerald-600' : ''}>
                {employee?.status || 'UNKNOWN'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{summary.present}</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 uppercase">Present</span>
          </CardContent>
        </Card>
        <Card className="bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <XCircle className="h-5 w-5 text-rose-500 mb-2" />
            <span className="text-2xl font-bold text-rose-700 dark:text-rose-400">{summary.absent}</span>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-500 uppercase">Absent</span>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-5 w-5 text-blue-500 mb-2" />
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">{summary.leave}</span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-500 uppercase">Leave</span>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Clock className="h-5 w-5 text-amber-500 mb-2" />
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">{summary.late}</span>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-500 uppercase">Late</span>
          </CardContent>
        </Card>
        <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CalendarDays className="h-5 w-5 text-purple-500 mb-2" />
            <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">{summary.halfDay}</span>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-500 uppercase">Half Day</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CalendarDays className="h-5 w-5 text-muted-foreground mb-2" />
            <span className="text-2xl font-bold">{summary.holiday}</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase">Holiday</span>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-4 lg:col-span-2 bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex flex-row items-center justify-between h-full">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Working Hrs</p>
              <p className="text-xl font-bold text-primary">{summary.formattedHours}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Attendance</p>
              <p className="text-2xl font-bold text-primary">{summary.attendancePercentage}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold">Calendar View</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-medium text-muted-foreground justify-center">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Present</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Absent</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Leave</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Late</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400"></div> Off</span>
            </div>
          </CardContent>
        </Card>

        {/* Daily Details Table */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold">Day to Day Attendance</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Work Hrs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(r => {
                  const d = new Date(r.date);
                  let hours = '00:00';
                  if (r.checkIn && r.checkOut) {
                    const diff = new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime();
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    hours = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  }

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{hours}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[r.status] || ''}`}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={r.remarks || ''}>
                        {r.remarks || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No daily records found for this month.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
