import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { 
  getPatientsByClinic, 
  createSession,
  createSessionHistory,
  type LocalPatient,
} from '@/lib/localDb';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const sessionFormSchema = z.object({
  patient_id: z.string().min(1, { message: 'Selecione um paciente' }),
  session_date: z.string().min(1, { message: 'Data da sessão é obrigatória' }),
  session_time: z.string().optional(),
  session_type: z.enum(['anamnese', 'avaliacao_neuropsicologica', 'tcc', 'intervencao_neuropsicologica', 'retorno', 'outra'], {
    required_error: 'Tipo de sessão é obrigatório',
  }),
  status: z.enum(['agendada', 'concluída'], {
    required_error: 'Status é obrigatório',
  }),
  mode: z.enum(['online', 'presencial', 'híbrida'], {
    required_error: 'Modo de atendimento é obrigatório',
  }),
  scheduled_duration: z.number().min(15).max(240).default(60),
  main_complaint: z.string().optional(),
  hypotheses: z.string().optional(),
  interventions: z.string().optional(),
  observations: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SessionFormDialog({ open, onOpenChange, onSuccess }: SessionFormDialogProps) {
  const { user, clinicId } = useAuth();
  const { showNames } = usePrivacyMode();
  const [patients, setPatients] = useState<LocalPatient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      session_date: new Date().toISOString().split('T')[0],
      session_time: '09:00',
      session_type: 'outra',
      status: 'concluída',
      mode: 'presencial',
      scheduled_duration: 60,
      main_complaint: '',
      hypotheses: '',
      interventions: '',
      observations: '',
    },
  });

  useEffect(() => {
    const loadPatients = async () => {
      if (!clinicId || !open) return;
      
      try {
        const data = await getPatientsByClinic(clinicId);
        setPatients(data.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      } catch (error) {
        console.error('Error loading patients:', error);
      }
    };

    loadPatients();
  }, [clinicId, open]);

  const onSubmit = async (values: SessionFormValues) => {
    if (!clinicId) {
      toast({
        title: 'Erro',
        description: 'Clínica não encontrada',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine date and time
      let sessionDateTime = values.session_date;
      if (values.session_time && values.status === 'agendada') {
        sessionDateTime = `${values.session_date}T${values.session_time}:00`;
      }

      const session = await createSession({
        patient_id: values.patient_id,
        session_date: sessionDateTime,
        session_type: values.session_type,
        status: values.status,
        mode: values.mode,
        scheduled_duration: values.scheduled_duration,
        main_complaint: values.main_complaint || null,
        hypotheses: values.hypotheses || null,
        interventions: values.interventions || null,
        observations: values.observations || null,
        clinic_id: clinicId,
        created_by: user?.id || null,
        ai_suggestions: null,
      });

      // Create history entry
      await createSessionHistory({
        session_id: session.id,
        clinic_id: clinicId,
        changed_by: user?.id || 'sistema',
        change_type: 'created',
        field_name: null,
        old_value: null,
        new_value: null,
      });

      toast({
        title: 'Sessão registrada',
        description: 'A sessão clínica foi registrada com sucesso.',
      });
      form.reset();
      onSuccess();
    } catch (error) {
      toast({
        title: 'Erro ao registrar sessão',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Sessão Clínica</DialogTitle>
          <DialogDescription>
            Registre os dados do atendimento clínico realizado.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paciente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o paciente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients?.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {showNames && patient.full_name
                            ? `${patient.full_name} (${patient.public_id})`
                            : patient.public_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="session_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Sessão</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modo de Atendimento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="presencial">Presencial</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="híbrida">Híbrida</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="session_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Sessão</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="anamnese">Anamnese</SelectItem>
                      <SelectItem value="avaliacao_neuropsicologica">Avaliação Neuropsicológica</SelectItem>
                      <SelectItem value="tcc">TCC (Terapia Cognitivo-Comportamental)</SelectItem>
                      <SelectItem value="intervencao_neuropsicologica">Intervenção Neuropsicológica</SelectItem>
                      <SelectItem value="retorno">Retorno</SelectItem>
                      <SelectItem value="outra">Outra</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="main_complaint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Queixa Principal</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a queixa principal apresentada pelo paciente..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hypotheses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hipóteses Diagnósticas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Registre as hipóteses diagnósticas levantadas..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interventions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervenções Realizadas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva as intervenções terapêuticas aplicadas..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Clínicas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione observações gerais sobre a sessão..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Registrar Sessão
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
