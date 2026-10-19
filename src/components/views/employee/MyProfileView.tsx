'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet, apiPut, apiUpload, apiDelete } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useNavStore } from '@/store/nav-store';
import type { Employee } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { toast } from 'sonner';
import { Camera, Save, User, Upload, Trash2, CalendarIcon, Info, Check, ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { indiaStatesAndDistricts } from '@/lib/india-states-districts';

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

const MandatoryLabel = ({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) => (
  <Label htmlFor={htmlFor}>
    {children} <span className="text-destructive">*</span>
  </Label>
);

const DatePicker = ({ value, onChange, label, id, mandatory }: { value: string, onChange: (val: string) => void, label: string, id: string, mandatory?: boolean }) => {
  const [month, setMonth] = useState<Date>(value ? new Date(value) : new Date());

  const handleYearChange = (year: string) => {
    const newDate = new Date(month);
    newDate.setFullYear(parseInt(year, 10));
    setMonth(newDate);
  };

  const handleMonthChange = (monthStr: string) => {
    const newDate = new Date(month);
    newDate.setMonth(parseInt(monthStr, 10));
    setMonth(newDate);
  };

  const years = Array.from({ length: 101 }, (_, i) => 1950 + i);
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-2 flex flex-col">
      {mandatory ? <MandatoryLabel htmlFor={id}>{label}</MandatoryLabel> : <Label htmlFor={id}>{label}</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal bg-background",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(new Date(value), "dd/MM/yyyy") : <span>DD/MM/YYYY</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex justify-between gap-2 mb-2">
            <Select value={month.getMonth().toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {months.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={month.getFullYear().toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Calendar
            mode="single"
            selected={value ? new Date(value) : undefined}
            onSelect={(d) => {
              if (d) {
                setMonth(d);
                onChange(format(d, 'yyyy-MM-dd'));
              } else {
                onChange('');
              }
            }}
            month={month}
            onMonthChange={setMonth}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder,
  disabled
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal bg-background"
        >
          <span className="truncate">
            {value ? options.find((option) => option.value === value)?.label : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)', maxWidth: 'var(--radix-popover-trigger-width)' }} align="start">
        <Command>
          <CommandInput placeholder={`Search...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const formatAadhar = (val: string) => val ? val.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim() : '';

export default function MyProfileView() {
  const { user, setUser } = useAuthStore();
  const { navigate } = useNavStore();
  const [profile, setProfile] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    email: '', mobile: '', pan: '', gender: '', city: '', pin: '',
    district: '', state: '', pfNo: '', esiNo: '', aadharNumber: '', uan: '',
    dob: '', joiningDate: '', department: '', designation: '', address: '',
    bankName: '', accountNumber: '', ifsc: '', accountHolder: '',
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiGet<Employee>('/profile');
        const data = res;
        if (data) {
          setProfile(data);
          setForm({
            email: data.email || '',
            mobile: data.mobile || '',
            pan: data.pan || '',
            gender: data.gender || '',
            city: data.city || '',
            pin: data.pin || '',
            district: data.district || '',
            state: data.state || '',
            pfNo: data.pfNo || '',
            esiNo: data.esiNo || '',
            aadharNumber: formatAadhar(data.aadharNumber || ''),
            uan: data.uan || '',
            dob: data.dob ? data.dob.split('T')[0] : '',
            joiningDate: data.joiningDate ? data.joiningDate.split('T')[0] : '',
            department: data.department || '',
            designation: data.designation || '',
            address: data.address || '',
            bankName: data.bankDetail?.bankName || '',
            accountNumber: data.bankDetail?.accountNumber || '',
            ifsc: data.bankDetail?.ifsc || '',
            accountHolder: data.bankDetail?.accountHolder || '',
          });
        }
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleNumericInput = (field: string, value: string, maxLength: number) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= maxLength) {
      updateField(field, numericValue);
    }
  };

  const handleAadharInput = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 12);
    updateField('aadharNumber', formatAadhar(raw));
  };

  const handlePanInput = (value: string) => {
    let clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let formatted = '';
    for (let i = 0; i < clean.length && i < 10; i++) {
      const char = clean[i];
      if (i < 5) {
        if (/[A-Z]/.test(char)) formatted += char;
        else break;
      } else if (i < 9) {
        if (/[0-9]/.test(char)) formatted += char;
        else break;
      } else {
        if (/[A-Z]/.test(char)) formatted += char;
        else break;
      }
    }
    updateField('pan', formatted);
  };

  const handleIfscInput = (value: string) => {
    const alphanumeric = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (alphanumeric.length <= 11) {
      updateField('ifsc', alphanumeric);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await apiUpload<any>('/profile/photo', formData);
      if (res && res.profilePhoto) {
        setProfile(prev => prev ? { ...prev, profilePhoto: res.profilePhoto } : res);
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
    try {
      await apiDelete('/profile/photo');
      setProfile(prev => prev ? { ...prev, profilePhoto: null } : null);
      toast.success('Photo removed successfully');
    } catch {
      toast.error('Failed to remove photo');
    }
  };

  const validateForm = () => {
    if (form.mobile && !/^\d{10}$/.test(form.mobile)) {
      toast.error('Mobile number must be exactly 10 digits');
      return false;
    }
    if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(form.pan)) {
      toast.error('Invalid PAN format (e.g., ABCDE1234F)');
      return false;
    }
    const aadharRaw = form.aadharNumber.replace(/\D/g, '');
    if (form.aadharNumber && aadharRaw.length !== 12) {
      toast.error('Aadhar number must be exactly 12 digits');
      return false;
    }
    if (form.pin && !/^\d{6}$/.test(form.pin)) {
      toast.error('PIN code must be exactly 6 digits');
      return false;
    }
    if (form.ifsc && form.ifsc.length !== 11) {
      toast.error('IFSC Code must be exactly 11 characters');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        aadharNumber: form.aadharNumber.replace(/\D/g, '')
      };
      const res = await apiPut<Employee>('/profile', payload);
      if (res) {
        setProfile(res);
        if (user) {
          if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
            setUser({ ...user, adminProfile: res as any });
          } else {
            setUser({ ...user, employee: res });
          }
        }
        toast.success('Profile updated successfully');
        navigate(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? 'admin-dashboard' : 'employee-dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const mandatoryFields = [
    'email', 'mobile', 'pan', 'gender', 'city', 'pin', 'district',
    'state', 'aadharNumber', 'dob', 'joiningDate', 'department', 'designation',
    'address', 'bankName', 'accountNumber', 'ifsc', 'accountHolder'
  ];

  const isFormComplete = mandatoryFields.every((key) => {
    const val = form[key as keyof typeof form];
    return typeof val === 'string' && val.trim() !== '';
  });

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isNidhi = profile?.company?.name?.toLowerCase().includes('nidhi');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>

      {!isFormComplete && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 shadow-sm flex items-start gap-3">
          <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold">Note: Complete Full Profile</h4>
            <p className="text-sm mt-1">
              Please complete your full profile. After saving all mandatory fields, you will be shown the full application dashboard.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Forms */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 text-xl">
                    <AvatarImage src={profile?.profilePhoto ? (profile.profilePhoto.startsWith('http') ? profile.profilePhoto : `/${profile.profilePhoto}`) : undefined} alt="Profile" />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <User className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={uploading}
                        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-black text-white shadow-sm hover:bg-black/80 transition-colors disabled:opacity-50"
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
                      {profile?.profilePhoto && (
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
                <div className="text-center">
                  <p className="font-semibold">
                    {profile?.firstName} {profile?.lastName}
                  </p>
                  {profile?.designation && (
                    <p className="text-sm text-muted-foreground">{profile.designation}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              
              {/* Work Information */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Work Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Employee Code</Label>
                    <Input value={profile?.employeeCode || '—'} readOnly className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Company</Label>
                    <Input value={profile?.company?.name || '—'} readOnly className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Branch</Label>
                    <Input value={profile?.branch?.name || '—'} readOnly className="bg-muted/50" />
                  </div>
                  <DatePicker id="joiningDate" label="Joining Date" value={form.joiningDate} onChange={(v) => updateField('joiningDate', v)} mandatory />
                  
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="department">Department</MandatoryLabel>
                    <Input id="department" value={form.department} onChange={(e) => updateField('department', e.target.value)} placeholder="Department" />
                  </div>
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="designation">Designation</MandatoryLabel>
                    <Input id="designation" value={form.designation} onChange={(e) => updateField('designation', e.target.value)} placeholder="Designation" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pfNo">PF No</Label>
                    <Input id="pfNo" value={form.pfNo} onChange={(e) => updateField('pfNo', e.target.value)} placeholder="PF number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="esiNo">ESI No</Label>
                    <Input id="esiNo" value={form.esiNo} onChange={(e) => updateField('esiNo', e.target.value)} placeholder="ESI number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uan">UAN</Label>
                    <Input id="uan" value={form.uan} onChange={(e) => updateField('uan', e.target.value)} placeholder="UAN" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Personal Information */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="email">Email</MandatoryLabel>
                    <Input id="email" type="email" value={form.email} readOnly className="bg-muted/50" placeholder="your@email.com" />
                  </div>
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="mobile">Mobile</MandatoryLabel>
                    <Input id="mobile" type="tel" value={form.mobile} onChange={(e) => handleNumericInput('mobile', e.target.value, 10)} placeholder="Mobile number" />
                  </div>
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="gender">Gender</MandatoryLabel>
                    <Select value={form.gender} onValueChange={(v) => updateField('gender', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DatePicker id="dob" label="Date of Birth" value={form.dob} onChange={(v) => updateField('dob', v)} mandatory />
                </div>
              </div>

              <Separator />

              {/* Identity Information */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Identity Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="pan">PAN Number</MandatoryLabel>
                    <Input id="pan" value={form.pan} onChange={(e) => handlePanInput(e.target.value)} placeholder="PAN number" />
                  </div>
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="aadharNumber">Aadhar Number</MandatoryLabel>
                    <Input id="aadharNumber" value={form.aadharNumber} onChange={(e) => handleAadharInput(e.target.value)} placeholder="XXXX XXXX XXXX" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Address Details */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Address Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <MandatoryLabel htmlFor="address">Full Address</MandatoryLabel>
                    <Textarea id="address" value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Your full address" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="city">City</MandatoryLabel>
                    <Input id="city" value={form.city} onChange={(e) => updateField('city', e.target.value)} placeholder="City" />
                  </div>
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="pin">PIN Code</MandatoryLabel>
                    <Input id="pin" value={form.pin} onChange={(e) => handleNumericInput('pin', e.target.value, 6)} placeholder="PIN code" />
                  </div>
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="state">State</MandatoryLabel>
                    <SearchableCombobox
                      placeholder="Select state"
                      value={form.state}
                      onChange={(v) => {
                        updateField('state', v);
                        updateField('district', ''); // reset district when state changes
                      }}
                      options={Object.keys(indiaStatesAndDistricts).map(state => ({ label: state, value: state }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="district">District</MandatoryLabel>
                    <SearchableCombobox
                      placeholder="Select district"
                      disabled={!form.state}
                      value={form.district}
                      onChange={(v) => updateField('district', v)}
                      options={(form.state ? indiaStatesAndDistricts[form.state] : [])?.map(district => ({ label: district, value: district })) || []}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Bank Details */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Bank Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="bankName">Bank Name</MandatoryLabel>
                    <Input id="bankName" value={form.bankName} onChange={(e) => updateField('bankName', e.target.value)} placeholder="Bank name" />
                  </div>
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="accountHolder">Account Holder</MandatoryLabel>
                    <Input id="accountHolder" value={form.accountHolder} onChange={(e) => updateField('accountHolder', e.target.value)} placeholder="Account holder name" />
                  </div>
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="accountNumber">Account Number</MandatoryLabel>
                    <Input id="accountNumber" type="tel" value={form.accountNumber} onChange={(e) => handleNumericInput('accountNumber', e.target.value, 18)} placeholder="Account number" />
                  </div>
                  <div className="space-y-2">
                    <MandatoryLabel htmlFor="ifsc">IFSC Code</MandatoryLabel>
                    <Input id="ifsc" value={form.ifsc} onChange={(e) => handleIfscInput(e.target.value)} placeholder="IFSC code" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving || !isFormComplete}>
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Digital ID */}
        <div className="lg:col-span-1 flex flex-col items-center space-y-4 lg:sticky lg:top-6">
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
                      {profile?.company?.name || 'Company Name'}
                    </p>
                    <p className="text-[7px] tracking-widest text-zinc-500 font-semibold uppercase">
                      Digital Identity Card
                    </p>
                  </div>
                </div>

                <div className="mt-8 text-center w-full">
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight truncate px-3">
                    {profile?.firstName} {profile?.lastName}
                  </h2>
                  <p className={`text-[11px] font-bold mt-1 tracking-wider uppercase ${isNidhi ? 'text-amber-600' : 'text-zinc-600'}`}>
                    {profile?.designation || 'Employee'}
                  </p>
                </div>

                <div className="w-full mt-8 flex flex-col gap-y-3 text-center bg-white/60 rounded-xl p-4 border border-zinc-200 shadow-sm">
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Employee ID</span>
                    <p className="text-[12px] text-zinc-900 font-mono font-bold mt-0.5">{profile?.employeeCode}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Department</span>
                    <p className="text-[12px] text-zinc-900 font-semibold mt-0.5 truncate">{profile?.department || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Date of Joining</span>
                    <p className="text-[12px] text-zinc-900 font-semibold mt-0.5">
                      {profile?.joiningDate ? formatDateLabel(profile.joiningDate) : '—'}
                    </p>
                  </div>
                </div>

                <div className="w-full mt-auto">
                  <Barcode />
                  <p className="text-[7px] text-center text-zinc-500 font-mono tracking-widest mt-1">
                    *{profile?.employeeCode}*
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
                    This card is the property of <strong className="text-zinc-900">{profile?.company?.name || 'Company Name'}</strong> and is issued for official identification purposes only. If found, please return immediately to the HR Department.
                  </p>
                  <div className="w-full border-t border-zinc-200 pt-3 space-y-2 text-left text-[9.5px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-medium">Mobile:</span>
                      <span className="text-zinc-900 font-bold">{profile?.mobile || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-medium">Email:</span>
                      <span className="text-zinc-900 font-semibold truncate max-w-[170px]">{profile?.email || '—'}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-zinc-500 font-medium">Office Location:</span>
                      <span className="text-zinc-900 leading-normal truncate">{profile?.branch?.name || '—'} Branch</span>
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