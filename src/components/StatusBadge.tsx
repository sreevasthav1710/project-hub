import { ProjectStatus, HackathonStatus } from '@/types/database';

interface StatusBadgeProps {
  status: ProjectStatus | HackathonStatus;
}

const statusConfig = {
  completed: { label: 'Completed', className: 'status-completed' },
  in_progress: { label: 'In Progress', className: 'status-in-progress' },
  aborted: { label: 'Aborted', className: 'status-aborted' },
  upcoming: { label: 'Upcoming', className: 'status-upcoming' },
  ongoing: { label: 'Ongoing', className: 'status-ongoing' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={`status-badge ${config.className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
