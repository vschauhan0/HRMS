'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet, apiUpload, apiDelete } from '@/lib/api-client';
import type { Employee } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavStore } from '@/store/nav-store';
import { STATUS_COLORS } from '@/lib/constants';
import {
  ArrowLeft, Pencil, User, Building2, MapPin, Phone, Mail, CreditCard,
  Calendar, Briefcase, Hash, Shield, Landmark, FileText, BadgeCheck,
  Camera, Upload, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Barcode = () => (
  <div className="flex items-center justify-center gap-0.5 bg-white p-1.5 rounded-md opacity-90 h-8 w-full mt-2 select-none">
    {Array.from({ length: 28 }).map((_, i) => {
      const widths = ['w-[1px]', 'w-[1.5px]', 'w-[2px]', 'w-[2.5px]'];
      const width = widths[(i * 7 + 13) % widths.length];
      const isVisible = (i * 3 + 5) % 7 !== 0;
      return <div key={i} className={`h-5 bg-black ${width} ${isVisible ? 'opacity-100' : 'opacity-0'}`} />;
    })}
  </div>
);

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}

function InfoItem({ icon, label, value, mono }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={`text-sm font-semibold truncate ${mono ? 'font-mono' : ''} ${!value || value === '—' ? 'text-muted-foreground/50' : ''}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

export default function EmployeeDetailView() {
  const { getParam, navigate } = useNavStore();
  const employeeId = getParam('id') as string | undefined;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await apiUpload<Employee>(`/employees/${employee.id}/photo`, formData);
      if (res) {
        setEmployee(res);
        toast.success('Photo updated successfully');
      }
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoRemove = async () => {
    if (!employee) return;
    try {
      await apiDelete(`/employees/${employee.id}/photo`);
      setEmployee(prev => prev ? { ...prev, profilePhoto: null } : null);
      toast.success('Photo removed successfully');
    } catch {
      toast.error('Failed to remove photo');
    }
  };

  useEffect(() => {
    if (!employeeId) return;
    async function fetchEmployee() {
      try {
        const res = await apiGet<Employee>(`/employees/${employeeId}`);
        setEmployee(res);
      } catch {
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployee();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('employees')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card className="rounded-xl">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Employee not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
  const isNidhi = employee.company?.name?.toLowerCase().includes('nidhi');
  const isSilver = employee.company?.name?.toLowerCase().includes('silver');
  const photoSrc = employee.profilePhoto
    ? (employee.profilePhoto.startsWith('http') ? employee.profilePhoto : `/${employee.profilePhoto}`)
    : undefined;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('employees')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Employee Profile</h1>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('employee-edit', { id: employee.id })}
        >
          <Pencil className="h-4 w-4 mr-1.5" />
          Edit Employee
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Profile Details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Hero Profile Card */}
          <Card className="rounded-xl shadow-sm overflow-hidden">
            <div className="relative">
              {/* Gradient Banner */}
              <div
                className="h-32 sm:h-40"
                style={{
                  background: isNidhi
                    ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #78350f 100%)'
                    : isSilver
                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #3f3f46 100%)'
                    : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                }}
              />
              {/* Avatar floating over banner */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 sm:left-8 sm:translate-x-0">
                <div className="rounded-full border-4 border-background shadow-lg relative group">
                  <Avatar className="h-28 w-28 text-2xl">
                    <AvatarImage src={photoSrc} alt={`${employee.firstName} ${employee.lastName}`} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={uploading}
                        className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-black text-white shadow-md hover:bg-black/80 transition-colors disabled:opacity-50"
                      >
                        {uploading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload New Photo
                      </DropdownMenuItem>
                      {photoSrc && (
                        <DropdownMenuItem onClick={handlePhotoRemove} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Photo
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>
            </div>
            <CardContent className="pt-20 sm:pt-6 sm:pl-44 pb-6 pr-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-bold tracking-tight">
                    {employee.firstName} {employee.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    {employee.designation || 'No Designation'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {employee.department || 'No Department'} · {employee.company?.name || '—'}
                  </p>
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <Badge
                    variant="secondary"
                    className={STATUS_COLORS[employee.status] || ''}
                  >
                    {employee.status}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {employee.employeeCode}
                  </Badge>
                </div>
              </div>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t">
                <div className="text-center sm:text-left">
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="text-sm font-semibold truncate">{employee.company?.name || '—'}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs text-muted-foreground">Branch</p>
                  <p className="text-sm font-semibold truncate">{employee.branch?.name || '—'}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs text-muted-foreground">Joining Date</p>
                  <p className="text-sm font-semibold">{formatDate(employee.joiningDate)}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="text-sm font-semibold">{employee.gender || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                <InfoItem icon={<Mail className="h-4 w-4" />} label="Email Address" value={employee.email} />
                <InfoItem icon={<Phone className="h-4 w-4" />} label="Mobile Number" value={employee.mobile} />
                <InfoItem icon={<Calendar className="h-4 w-4" />} label="Date of Birth" value={formatDate(employee.dob)} />
                <InfoItem icon={<User className="h-4 w-4" />} label="Gender" value={employee.gender} />
                <InfoItem icon={<CreditCard className="h-4 w-4" />} label="PAN Number" value={employee.pan} mono />
                <InfoItem icon={<Hash className="h-4 w-4" />} label="Aadhar Number" value={employee.aadharNumber} mono />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                <div className="sm:col-span-2">
                  <InfoItem icon={<MapPin className="h-4 w-4" />} label="Full Address" value={employee.address} />
                </div>
                <InfoItem icon={<Building2 className="h-4 w-4" />} label="City" value={employee.city} />
                <InfoItem icon={<Building2 className="h-4 w-4" />} label="District" value={employee.district} />
                <InfoItem icon={<MapPin className="h-4 w-4" />} label="State" value={employee.state} />
                <InfoItem icon={<Hash className="h-4 w-4" />} label="PIN Code" value={employee.pin} mono />
              </div>
            </CardContent>
          </Card>

          {/* Employment Information */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                <InfoItem icon={<Hash className="h-4 w-4" />} label="Employee Code" value={employee.employeeCode} mono />
                <InfoItem icon={<Building2 className="h-4 w-4" />} label="Company" value={employee.company?.name} />
                <InfoItem icon={<MapPin className="h-4 w-4" />} label="Branch" value={employee.branch?.name} />
                <InfoItem icon={<Briefcase className="h-4 w-4" />} label="Department" value={employee.department} />
                <InfoItem icon={<BadgeCheck className="h-4 w-4" />} label="Designation" value={employee.designation} />
                <InfoItem icon={<Calendar className="h-4 w-4" />} label="Joining Date" value={formatDate(employee.joiningDate)} />
                <InfoItem icon={<Calendar className="h-4 w-4" />} label="Resignation Date" value={formatDate(employee.resignationDate)} />
                <InfoItem icon={<Shield className="h-4 w-4" />} label="Status" value={employee.status} />
              </div>
            </CardContent>
          </Card>

          {/* Statutory & Compliance */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Statutory & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                <InfoItem icon={<Hash className="h-4 w-4" />} label="PF Number" value={employee.pfNo} mono />
                <InfoItem icon={<Hash className="h-4 w-4" />} label="ESI Number" value={employee.esiNo} mono />
                <InfoItem icon={<Hash className="h-4 w-4" />} label="UAN" value={employee.uan} mono />
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                <InfoItem icon={<Landmark className="h-4 w-4" />} label="Bank Name" value={employee.bankDetail?.bankName} />
                <InfoItem icon={<Hash className="h-4 w-4" />} label="Account Number" value={employee.bankDetail?.accountNumber} mono />
                <InfoItem icon={<Hash className="h-4 w-4" />} label="IFSC Code" value={employee.bankDetail?.ifsc} mono />
                <InfoItem icon={<User className="h-4 w-4" />} label="Account Holder" value={employee.bankDetail?.accountHolder} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Digital ID Badge */}
        <div className="lg:col-span-1 flex flex-col items-center space-y-4 lg:sticky lg:top-6">


          {/* Digital ID Badge */}
          <div className="text-center">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Digital ID Badge</p>
            <p className="text-xs text-muted-foreground mt-1">Click the card to flip it</p>
          </div>

          <div
            style={{
              perspective: '1000px',
              width: '300px',
              height: '460px',
              cursor: 'pointer',
            }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'none',
              }}
            >
              {/* Front Face */}
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  backfaceVisibility: 'hidden',
                  borderRadius: '1.5rem',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '1.5rem',
                  background: '#FDFBF7',
                }}
              >
                <div className="w-full flex items-center gap-2 border-b border-zinc-200 pb-3">
                  <img
                    src={isNidhi ? '/nidhi_impex_logo.png' : '/silver_star_logo.png'}
                    alt="Logo"
                    className="h-9 w-9 object-contain drop-shadow-sm"
                  />
                  <div className="flex-1 text-left">
                    <p className="font-extrabold text-[11px] tracking-wider text-zinc-900 uppercase truncate">
                      {employee.company?.name || 'Company Name'}
                    </p>
                    <p className="text-[7px] tracking-widest text-zinc-500 font-semibold uppercase">
                      Digital Identity Card
                    </p>
                  </div>
                </div>

                <div className="mt-8 text-center w-full">
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight truncate px-3">
                    {employee.firstName} {employee.lastName}
                  </h2>
                  <p className={`text-[11px] font-bold mt-1 tracking-wider uppercase ${isNidhi ? 'text-amber-600' : 'text-zinc-600'}`}>
                    {employee.designation || 'Employee'}
                  </p>
                </div>

                <div className="w-full mt-8 flex flex-col gap-y-3 text-center bg-white/60 rounded-xl p-4 border border-zinc-200 shadow-sm">
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Employee ID</span>
                    <p className="text-[12px] text-zinc-900 font-mono font-bold mt-0.5">{employee.employeeCode}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Department</span>
                    <p className="text-[12px] text-zinc-900 font-semibold mt-0.5 truncate">{employee.department || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Date of Joining</span>
                    <p className="text-[12px] text-zinc-900 font-semibold mt-0.5">
                      {formatDate(employee.joiningDate)}
                    </p>
                  </div>
                </div>

                <div className="w-full mt-auto">
                  <Barcode />
                  <p className="text-[7px] text-center text-zinc-500 font-mono tracking-widest mt-1">
                    *{employee.employeeCode}*
                  </p>
                </div>
              </div>

              {/* Back Face */}
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  backfaceVisibility: 'hidden',
                  borderRadius: '1.5rem',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  transform: 'rotateY(180deg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.5rem',
                  background: '#FDFBF7',
                }}
              >
                <div className="w-full flex items-start justify-between border-b border-zinc-200 pb-3">
                  <svg className="h-8 w-10 rounded bg-amber-400/90 p-1.5 shadow-sm" viewBox="0 0 24 24" fill="none" stroke="#653b08" strokeWidth="1.5">
                    <rect x="2" y="2" width="20" height="20" rx="4" />
                    <path d="M2 12h20M12 2v20M6 2v10M18 2v10M6 22V12M18 22V12" />
                  </svg>
                  <svg className="h-6 w-6 text-zinc-500 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 8c2-2 5-2 7 0M3 5c3.5-3.5 9.5-3.5 13 0M7 11a3 3 0 014 0" />
                  </svg>
                </div>

                <div className="my-auto space-y-4 text-center px-2">
                  <p className="text-[8.5px] text-zinc-600 leading-normal font-medium">
                    This card is the property of <strong className="text-zinc-900">{employee.company?.name || 'Company Name'}</strong> and is issued for official identification purposes only. If found, please return immediately to the HR Department.
                  </p>
                  <div className="w-full border-t border-zinc-200 pt-3 space-y-2 text-left text-[9.5px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-medium">Mobile:</span>
                      <span className="text-zinc-900 font-bold">{employee.mobile || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-medium">Email:</span>
                      <span className="text-zinc-900 font-semibold truncate max-w-[170px]">{employee.email || '—'}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-zinc-500 font-medium">Office Location:</span>
                      <span className="text-zinc-900 leading-normal truncate">{employee.branch?.name || '—'} Branch</span>
                    </div>
                  </div>
                </div>

                <div className="w-full border-t border-zinc-200 pt-3 flex items-end justify-between">
                  <div className="text-left">
                    <p className="text-[6px] tracking-wider text-zinc-500 uppercase font-bold">Card Issuer</p>
                    <p className="text-[8px] text-zinc-900 font-bold font-mono tracking-wide">HR MANAGER</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-serif italic text-amber-600 opacity-80 select-none">Authorized</span>
                    <div className="h-0.5 w-16 bg-zinc-300 mt-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
