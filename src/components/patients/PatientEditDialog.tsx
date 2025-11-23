import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Patient } from '@/types/patient';
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
  FormDescription,
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
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const patientEditSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
  birth_date: z
    .string()
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        const birthDate = new Date(date);
        const today = new Date();
        return birthDate <= today;
      },
      { message: 'Data de nascimento não pode ser no futuro' }
    ),
  gender: z.enum(['M', 'F', 'Outro', 'Não informado'] as const),
  notes_summary: z
    .string()
    .trim()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional()
    .or(z.literal('')),
});

type PatientEditFormData = z.infer<typeof patientEditSchema>;

interface PatientEditDialogProps {
  patient: Patient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientEditDialog({ patient, open, onOpenChange }: PatientEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PatientEditFormData>({
    resolver: zodResolver(patientEditSchema),
    defaultValues: {
      full_name: patient.full_name || '',
      birth_date: patient.birth_date || '',
      gender: patient.gender,
      notes_summary: patient.notes_summary || '',
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: async (data: PatientEditFormData) => {
      const updateData: any = {
        gender: data.gender,
      };

      // Adiciona campos opcionais apenas se preenchidos
      if (data.full_name && data.full_name.trim()) {
        updateData.full_name = data.full_name.trim();
      } else {
        updateData.full_name = null;
      }

      if (data.birth_date) {
        updateData.birth_date = data.birth_date;
      } else {
        updateData.birth_date = null;
      }

      if (data.notes_summary && data.notes_summary.trim()) {
        updateData.notes_summary = data.notes_summary.trim();
      } else {
        updateData.notes_summary = null;
      }

      const { data: updatedPatient, error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', patient.id)
        .select()
        .single();

      if (error) throw error;
      return updatedPatient;
    },
    onSuccess: () => {
      toast({
        title: 'Paciente atualizado',
        description: 'As informações foram salvas com sucesso.',
      });

      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar paciente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PatientEditFormData) => {
    updatePatientMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Paciente</DialogTitle>
          <DialogDescription>
            Atualize as informações cadastrais do paciente {patient.public_id}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Nome Completo */}
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome do paciente"
                        {...field}
                        maxLength={200}
                      />
                    </FormControl>
                    <FormDescription>
                      Nome visível apenas em modo offline com chave USB
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Data de Nascimento */}
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} max={new Date().toISOString().split('T')[0]} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gênero */}
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gênero</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o gênero" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                        <SelectItem value="Não informado">Não informado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Observações */}
              <FormField
                control={form.control}
                name="notes_summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Clínicas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações clínicas relevantes"
                        className="resize-none"
                        rows={4}
                        {...field}
                        maxLength={1000}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0}/1000 caracteres
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updatePatientMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updatePatientMutation.isPending}>
                {updatePatientMutation.isPending && (
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
