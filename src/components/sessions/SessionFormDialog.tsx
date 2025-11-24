import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
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
  patient_id: z.string().uuid({ message: 'Selecione um paciente' }),
  session_date: z.string().min(1, { message: 'Data da sessão é obrigatória' }),
  mode: z.enum(['online', 'presencial', 'híbrida'], {
    required_error: 'Modo de atendimento é obrigatório',
  }),
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
  const { profile } = useAuth();
  const { showNames } = usePrivacyMode();

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      session_date: new Date().toISOString().split('T')[0],
      mode: 'presencial',
      main_complaint: '',
      hypotheses: '',
      interventions: '',
      observations: '',
    },
  });

  const { data: patients } = useQuery({
    queryKey: ['patients-for-session'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, public_id, full_name')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const createSessionMutation = useMutation({
    mutationFn: async (values: SessionFormValues) => {
      if (!profile?.clinic_id) {
        throw new Error('Clínica não encontrada');
      }

      const { data, error } = await supabase
        .from('sessions')
        .insert([{
          patient_id: values.patient_id,
          session_date: values.session_date,
          mode: values.mode,
          main_complaint: values.main_complaint || null,
          hypotheses: values.hypotheses || null,
          interventions: values.interventions || null,
          observations: values.observations || null,
          clinic_id: profile.clinic_id,
          created_by: profile.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Sessão registrada',
        description: 'A sessão clínica foi registrada com sucesso.',
      });
      form.reset();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao registrar sessão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: SessionFormValues) => {
    createSessionMutation.mutate(values);
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
                disabled={createSessionMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createSessionMutation.isPending}>
                {createSessionMutation.isPending && (
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
