import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { 
  Plus, 
  ShieldCheck, 
  Building,
  UserCheck,
  FilePlus2
} from 'lucide-react';
import { AppointmentFormModal } from '../components/AppointmentFormModal';

export const Appointment = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Dept State
  const [newDeptName, setNewDeptName] = useState('');
  
  // Assign Admin State
  const [assignUser, setAssignUser] = useState('');
  const [assignDept, setAssignDept] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const deptData = await api.departments.list();
      setDepartments(deptData);

      if (user.role === 'SUPER_ADMIN') {
        const empData = await api.employees.list();
        // Filter only Active standard Employees to assign as Admins
        const activeEmps = empData.filter(e => e.status === 'Active');
        setEmployees(activeEmps);
        
        if (activeEmps.length > 0) setAssignUser(activeEmps[0].id.toString());
        if (deptData.length > 0) setAssignDept(deptData[0].id.toString());
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load department structure details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [user, loadData]);

  // Early return for null user or loading (ProtectedRoute handles redirect)
  if (!user || loading) {
    return loading ? (
      <div className="h-64 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-400"></div>
        <p className="text-xs text-slate-400 mt-2">Loading organization structure...</p>
      </div>
    ) : null;
  }

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      setError('');
      setSuccess('');
      setIsSubmitting(true);
      
      await api.departments.create(newDeptName.trim());
      showToast(`Department '${newDeptName}' created successfully.`, 'success');
      setNewDeptName('');
      loadData();
    } catch (err) {
      showToast(err.message || 'Error creating department.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignAdmin = async (e) => {
    e.preventDefault();
    if (!assignUser || !assignDept) return;

    try {
      setError('');
      setSuccess('');
      setIsSubmitting(true);

      const targetEmp = employees.find(emp => emp.id === parseInt(assignUser));
      const targetDept = departments.find(dept => dept.id === parseInt(assignDept));

      await api.departments.assignAdmin(parseInt(assignUser), parseInt(assignDept));
      showToast(`Successfully assigned ${targetEmp ? targetEmp.full_name : 'employee'} as Admin of ${targetDept ? targetDept.name : 'department'}.`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message || 'Error promoting user to Admin.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-400"></div>
        <p className="text-xs text-slate-400 mt-2">Loading organization structure...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Appointment & <span className="text-gradient">Employment</span>
          </h2>
          <p className="text-slate-400 mt-1 text-sm">
            {user.role === 'SUPER_ADMIN' 
              ? 'Manage core departments, companies, and delegate department administration control.'
              : `Framework statistics and structural overview for ${user.department_name}`}
          </p>
        </div>
        
        {/* New Appointment Button */}
        <button
          onClick={() => setIsFormModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Appointment Form Modal */}
      <AppointmentFormModal 
        isOpen={isFormModalOpen} 
        onClose={() => setIsFormModalOpen(false)} 
      />

      {/* Alerts */}
      

      

      {/* Layout Split */}
      <div className="max-w-5xl">
        
        {/* Admin Forms */}
        {user.role === 'SUPER_ADMIN' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Dept */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-md font-bold text-white mb-4 flex items-center">
                <Plus className="h-4.5 w-4.5 text-indigo-400 mr-2" />
                <span>Create Department</span>
              </h3>
              
              <form onSubmit={handleCreateDept} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Department Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="e.g. Finance & Accounting"
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 rounded-lg"
                >
                  Create Unit
                </button>
              </form>
            </div>

            {/* Promote Admin */}
            <div className="glass-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
              <h3 className="text-md font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                <ShieldCheck className="h-4.5 w-4.5 text-purple-500 dark:text-purple-400 mr-2" />
                <span>Assign Department Admin</span>
              </h3>
              
              <form onSubmit={handleAssignAdmin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Select Active Employee
                  </label>
                  <select
                    value={assignUser}
                    onChange={(e) => setAssignUser(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_code})
                      </option>
                    ))}
                    {employees.length === 0 && (
                      <option value="" disabled>No Active employees available</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Target Department
                  </label>
                  <select
                    value={assignDept}
                    onChange={(e) => setAssignDept(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting || employees.length === 0}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 rounded-lg"
                >
                  Delegate Admin Control
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Admin Scoped Information Card */
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-white flex items-center">
              <UserCheck className="h-5 w-5 text-indigo-400 mr-2" />
              <span>Department Governance</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              As the Admin for <strong>{user.department_name}</strong>, you possess delegation framework control over employees within this department. 
            </p>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] space-y-2">
              <p className="text-slate-300">
                <strong>Assigned Admin:</strong> {user.full_name}
              </p>
              <p className="text-slate-300">
                <strong>Role Constraints:</strong> Scoped to Department ID {user.department_id}
              </p>
              <p className="text-slate-500 italic mt-2">
                Structural changes and new department creation must be processed by a global Super Administrator.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
