import { useState, useEffect } from 'react';
import { getClinicById, type LocalClinic } from '@/lib/localDb';
import { Brain } from 'lucide-react';

interface DynamicClinicHeaderProps {
  clinicId: string | null;
  className?: string;
}

export function DynamicClinicHeader({ clinicId, className = '' }: DynamicClinicHeaderProps) {
  const [clinic, setClinic] = useState<LocalClinic | undefined>(undefined);

  useEffect(() => {
    const loadClinic = async () => {
      if (!clinicId) return;
      try {
        const clinicData = await getClinicById(clinicId);
        setClinic(clinicData);
      } catch (error) {
        console.error('Error loading clinic:', error);
      }
    };
    
    loadClinic();

    // Listen for clinic updates (e.g., logo changes)
    const handleClinicUpdate = (event: CustomEvent<{ clinicId: string }>) => {
      if (event.detail.clinicId === clinicId) {
        loadClinic();
      }
    };
    
    window.addEventListener('androvox:clinic-updated', handleClinicUpdate as EventListener);
    
    return () => {
      window.removeEventListener('androvox:clinic-updated', handleClinicUpdate as EventListener);
    };
  }, [clinicId]);

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {clinic?.logo_data ? (
        <img 
          src={clinic.logo_data} 
          alt="Logo" 
          className="w-16 h-16 object-contain rounded-xl border bg-background"
        />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
          <Brain className="h-10 w-10 text-primary-foreground" />
        </div>
      )}
      <span className="text-2xl font-semibold text-foreground">{clinic?.name || 'Androvox'}</span>
    </div>
  );
}
