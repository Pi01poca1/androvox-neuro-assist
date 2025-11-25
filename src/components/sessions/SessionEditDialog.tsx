import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
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
import { Loader2, Sparkles } from 'lucide-react';
import type { Session } from '@/types/session';
import { useState } from 'react';

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

interface SessionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session | null;
  onSuccess: () => void;
}

export function SessionEditDialog({ open, onOpenChange, session, onSuccess }: SessionEditDialogProps) {
  const { showNames } = usePrivacyMode();
  const queryClient = useQueryClient();
  const [isGeneratingHypotheses, setIsGeneratingHypotheses] = useState(false);
  const [isGeneratingInterventions, setIsGeneratingInterventions] = useState(false);

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

  const updateSessionMutation = useMutation({
    mutationFn: async (values: SessionEditValues) => {
      if (!session) throw new Error('Sessão não encontrada');

      const { data, error } = await supabase
        .from('sessions')
        .update({
          session_date: values.session_date,
          mode: values.mode,
          session_type: values.session_type,
          main_complaint: values.main_complaint || null,
          hypotheses: values.hypotheses || null,
          interventions: values.interventions || null,
          observations: values.observations || null,
        })
        .eq('id', session.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Sessão atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar sessão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const generateSuggestion = async (type: 'hypotheses' | 'interventions') => {
    if (!session) return;

    const values = form.getValues();
    
    if (type === 'hypotheses') setIsGeneratingHypotheses(true);
    else setIsGeneratingInterventions(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-session-suggestions', {
        body: {
          sessionData: {
            patientId: session.patients?.public_id,
            mode: values.mode,
            mainComplaint: values.main_complaint,
            observations: values.observations,
            interventions: values.interventions,
            hypotheses: values.hypotheses,
          },
          suggestionType: type,
        },
      });

      if (error) throw error;

      const currentValue = type === 'hypotheses' ? values.hypotheses : values.interventions;
      const newValue = currentValue 
        ? `${currentValue}\n\n--- Sugestões de IA ---\n${data.suggestion}`
        : data.suggestion;

      form.setValue(type, newValue);
      
      toast({
        title: 'Sugestões geradas',
        description: 'As sugestões de IA foram adicionadas ao campo.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao gerar sugestões',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      if (type === 'hypotheses') setIsGeneratingHypotheses(false);
      else setIsGeneratingInterventions(false);
    }
  };

  const onSubmit = (values: SessionEditValues) => {
    updateSessionMutation.mutate(values);
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Hipóteses Diagnósticas</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateSuggestion('hypotheses')}
                      disabled={isGeneratingHypotheses}
                    >
                      {isGeneratingHypotheses ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-3 w-3" />
                          Sugestões IA
                        </>
                      )}
                    </Button>
                  </div>
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Intervenções Realizadas</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateSuggestion('interventions')}
                      disabled={isGeneratingInterventions}
                    >
                      {isGeneratingInterventions ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-3 w-3" />
                          Sugestões IA
                        </>
                      )}
                    </Button>
                  </div>
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
                disabled={updateSessionMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateSessionMutation.isPending}>
                {updateSessionMutation.isPending && (
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
