import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { 
  updateSession,
  createSessionHistory,
  type LocalSession,
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

const sessionEditSchema = z.object({
  session_date: z.string().min(1, { message: 'Data da sessão é obrigatória' }),
  mode: z.enum(['online', 'presencial', 'híbrida'], {
    required_error: 'Modo de atendimento é obrigatório',
  }),
  session_type: z.enum(['anamnese', 'avaliacao_neuropsicologica', 'tcc', 'intervencao_neuropsicologica', 'retorno', 'outra'], {
    required_error: 'Tipo de sessão é obrigatório',
  }),
  main_complaint: z.string().optional(),
  hypotheses: z.string().optional(),
  interventions: z.string().optional(),
  observations: z.string().optional(),
});

type SessionEditValues = z.infer<typeof sessionEditSchema>;

interface SessionWithPatient extends LocalSession {
  patients?: LocalPatient;
}

interface SessionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionWithPatient | null;
  onSuccess: () => void;
}

export function SessionEditDialog({ open, onOpenChange, session, onSuccess }: SessionEditDialogProps) {
  const { user, clinicId } = useAuth();
  const { showNames } = usePrivacyMode();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SessionEditValues>({
    resolver: zodResolver(sessionEditSchema),
    values: session ? {
      session_date: session.session_date.split('T')[0],
      mode: session.mode,
      session_type: session.session_type || 'outra',
      main_complaint: session.main_complaint || '',
      hypotheses: session.hypotheses || '',
      interventions: session.interventions || '',
      observations: session.observations || '',
    } : undefined,
  });

  const onSubmit = async (values: SessionEditValues) => {
    if (!session || !clinicId) {
      toast({
        title: 'Erro',
        description: 'Sessão não encontrada',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Track changes for history
      const changes: { field: string; old: string | null; new: string | null }[] = [];
      
      if (session.session_date.split('T')[0] !== values.session_date) {
        changes.push({ field: 'session_date', old: session.session_date, new: values.session_date });
      }
      if (session.mode !== values.mode) {
        changes.push({ field: 'mode', old: session.mode, new: values.mode });
      }
      if (session.session_type !== values.session_type) {
        changes.push({ field: 'session_type', old: session.session_type, new: values.session_type });
      }
      if (session.main_complaint !== (values.main_complaint || null)) {
        changes.push({ field: 'main_complaint', old: session.main_complaint, new: values.main_complaint || null });
      }
      if (session.hypotheses !== (values.hypotheses || null)) {
        changes.push({ field: 'hypotheses', old: session.hypotheses, new: values.hypotheses || null });
      }
      if (session.interventions !== (values.interventions || null)) {
        changes.push({ field: 'interventions', old: session.interventions, new: values.interventions || null });
      }
      if (session.observations !== (values.observations || null)) {
        changes.push({ field: 'observations', old: session.observations, new: values.observations || null });
      }

      await updateSession(session.id, {
        session_date: values.session_date,
        mode: values.mode,
        session_type: values.session_type,
        main_complaint: values.main_complaint || null,
        hypotheses: values.hypotheses || null,
        interventions: values.interventions || null,
        observations: values.observations || null,
      });

      // Create history entries for each change
      for (const change of changes) {
        await createSessionHistory({
          session_id: session.id,
          clinic_id: clinicId,
          changed_by: user?.id || 'sistema',
          change_type: 'updated',
          field_name: change.field,
          old_value: change.old,
          new_value: change.new,
        });
      }

      toast({
        title: 'Sessão atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
      onSuccess();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar sessão',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Sessão Clínica</DialogTitle>
          <DialogDescription>
            {showNames && session.patients?.full_name
              ? `Paciente: ${session.patients.full_name}`
              : `Paciente: ${session.patients?.public_id}`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
