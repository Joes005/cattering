import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../../api/employeeApi';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRows } from '../../components/Skeleton';

export default function EmployeeAttendance() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['employee-schedule'],
    queryFn: employeeApi.listSchedule,
  });

  const checkInMutation = useMutation({
    mutationFn: ({ assignmentId }) => employeeApi.checkIn(assignmentId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['employee-earnings'] });
      setActionMsg('Check-in recorded successfully! Have a great shift.');
      setNotes('');
      setErrorMsg('');
      setTimeout(() => setActionMsg(''), 4000);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const checkOutMutation = useMutation({
    mutationFn: ({ assignmentId }) => employeeApi.checkOut(assignmentId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['employee-earnings'] });
      setActionMsg('Check-out recorded successfully! Shift attendance logged for payout verification.');
      setNotes('');
      setErrorMsg('');
      setTimeout(() => setActionMsg(''), 4000);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Digital Event Attendance</h2>
        <p className="text-xs text-neutral-500">
          Check in upon arrival at the banquet venue, and check out after completing your shift
        </p>
      </div>

      {actionMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
          ✓ {actionMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700">
          ✕ {errorMsg}
        </div>
      )}

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : !schedule || schedule.length === 0 ? (
        <EmptyState
          title="No shifts requiring attendance"
          description="Once an employer accepts your shift application, your attendance card will appear here."
        />
      ) : (
        <div className="space-y-4">
          {schedule.map((shift) => (
            <div key={shift.id} className="card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900">{shift.event?.title}</span>
                    <StatusBadge status={shift.status} />
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Role: <strong className="text-neutral-700">{shift.role}</strong> · Caterer:{' '}
                    <strong>{shift.event?.company?.name}</strong>
                  </p>
                </div>
                <div className="text-xs text-neutral-500">
                  <span>Shift: {new Date(shift.shift_start).toLocaleDateString()}</span>
                  <span className="ml-2 font-medium">
                    ({new Date(shift.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(shift.shift_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    className="input text-xs"
                    placeholder="Optional note for caterer (e.g. Arrived on time / Uniform checked)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => checkInMutation.mutate({ assignmentId: shift.id })}
                    disabled={checkInMutation.isPending || shift.status === 'in_progress' || shift.status === 'completed'}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40 transition"
                  >
                    {checkInMutation.isPending ? 'Logging…' : '🟢 Check In Now'}
                  </button>
                  <button
                    onClick={() => checkOutMutation.mutate({ assignmentId: shift.id })}
                    disabled={checkOutMutation.isPending || shift.status !== 'in_progress'}
                    className="rounded-lg bg-neutral-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-900 disabled:opacity-40 transition"
                  >
                    {checkOutMutation.isPending ? 'Logging…' : '🔴 Check Out'}
                  </button>
                </div>
              </div>

              {shift.status === 'in_progress' && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
                  <span>You are currently checked in for this shift! Remember to check out once your duties end.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

