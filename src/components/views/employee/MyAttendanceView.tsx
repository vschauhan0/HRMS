'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Download, CalendarIcon, CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet } from '@/lib/api-client';
import { STATUS_COLORS, MONTHS } from '@/lib/constants';
import type { Attendance, PaginatedResponse, Employee } from '@/types';

export default function MyAttendanceView() {
  const now = new Date();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const attRes = await apiGet<PaginatedResponse<Attendance>>(`/attendance?month=${month}&year=${year}&pageSize=100`);
      setRecords(attRes.data || []);
      
      // Extract employee from records if available
      if (attRes.data?.length > 0 && attRes.data[0].employee) {
        const fetchedEmp = attRes.data[0].employee;
        setEmployee(prev => prev?.id === fetchedEmp.id ? prev : fetchedEmp);
      } else {
        // Fallback fetch if we need employee details but have no records yet
        setEmployee(prev => {
          if (!prev) {
            apiGet<any>('/auth/me')
              .then(meRes => {
                if (meRes?.employee) {
                  setEmployee(meRes.employee);
                }
              })
              .catch(() => null);
          }
          return prev;
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [month, year]);

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
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays = daysInMonth - holiday - weekOff;
    let attendancePercentage = 0;
    if (workingDays > 0) {
      attendancePercentage = Math.round(((present + late + (halfDay * 0.5)) / workingDays) * 100);
    }

    return { present, absent, leave, late, halfDay, holiday, weekOff, workingDays, formattedHours, attendancePercentage };
  }, [records, month, year]);

  // Calendar logic
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
  
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
    let status = record?.status?.toUpperCase() || 'UNKNOWN';
    
    // Genuine Rule Display Check just in case
    const isSunday = new Date(year, month - 1, d).getDay() === 0;
    if (isSunday && status === 'UNKNOWN') status = 'WEEK_OFF';

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
          {status !== 'UNKNOWN' && <div className={`w-2 h-2 rounded-full ${dotColor}`} title={status} />}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Attendance</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            Detailed day-to-day log and summary
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => {
                const monthNum = i + 1;
                const isFuture = year === now.getFullYear() && monthNum > (now.getMonth() + 1);
                return (
                  <SelectItem key={i} value={String(monthNum)} disabled={isFuture}>
                    {m}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9">
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Employee Info Header */}
      {employee && (
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
                <Badge variant={employee?.status === 'ACTIVE' ? 'default' : 'secondary'} className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none border-emerald-500/20">
                  {employee?.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{summary.present}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">Present</span>
          </CardContent>
        </Card>
        
        <Card className="bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <XCircle className="h-5 w-5 text-rose-500 mb-2" />
            <span className="text-2xl font-bold text-rose-700 dark:text-rose-400">{summary.absent}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600/80">Absent</span>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-5 w-5 text-blue-500 mb-2" />
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">{summary.leave}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600/80">Leave</span>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Clock className="h-5 w-5 text-amber-500 mb-2" />
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">{summary.late}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600/80">Late</span>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/50">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CalendarDays className="h-5 w-5 text-purple-500 mb-2" />
            <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">{summary.halfDay}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600/80">Half Day</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CalendarIcon className="h-5 w-5 text-slate-500 mb-2" />
            <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">{summary.holiday + summary.weekOff}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Holiday</span>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1 bg-card">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Working Hrs</span>
              <span className="text-sm font-bold font-mono">{summary.formattedHours}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attendance</span>
              <span className="text-xl font-bold">{summary.attendancePercentage}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="xl:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Calendar View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {DAY_NAMES.map(day => (
                <div key={day} className="text-xs font-semibold text-muted-foreground py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells}
            </div>
            
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Present</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Absent</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Leave</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Late</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div> Off</div>
            </div>
          </CardContent>
        </Card>

        {/* List View */}
        <Card className="xl:col-span-2 shadow-sm flex flex-col max-h-[600px]">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Day to Day Attendance</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
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
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No records found for this month.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => {
                    const d = new Date(r.date);
                    let workHrs = '00:00';
                    if (r.checkIn && r.checkOut) {
                      const diff = new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime();
                      const h = Math.floor(diff / (1000 * 60 * 60));
                      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                      workHrs = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                    }

                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-xs whitespace-nowrap">
                          {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {DAY_NAMES[d.getDay()]}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium">
                          {workHrs}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[r.status] || ''}`}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {r.remarks || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}