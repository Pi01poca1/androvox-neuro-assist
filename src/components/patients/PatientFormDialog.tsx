import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { GenderType } from '@/types/patient';
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

// Schema de validação
const patientSchema = z.object({
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

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientFormDialog({ open, onOpenChange }: PatientFormDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatedId, setGeneratedId] = useState<string>('');

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: '',
      birth_date: '',
      gender: 'Não informado',
      notes_summary: '',
    },
  });

  // Mutation para criar paciente
  const createPatientMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      console.log('Profile no mutation:', profile);
      console.log('Clinic ID:', profile?.clinic_id);
      
      if (!profile?.clinic_id) {
        throw new Error('Clínica não encontrada. Perfil: ' + JSON.stringify(profile));
      }

      // Primeiro, gera o ID público
      const { data: publicIdData, error: idError } = await supabase.rpc(
        'generate_patient_public_id'
      );

      if (idError) throw idError;

      const publicId = publicIdData as string;
      setGeneratedId(publicId);

      // Prepara os dados para inserção
      const insertData: any = {
        clinic_id: profile.clinic_id,
        public_id: publicId,
        gender: data.gender,
      };

      // Adiciona campos opcionais apenas se preenchidos
      if (data.full_name && data.full_name.trim()) {
        insertData.full_name = data.full_name.trim();
      }
      if (data.birth_date) {
        insertData.birth_date = data.birth_date;
      }
      if (data.notes_summary && data.notes_summary.trim()) {
        insertData.notes_summary = data.notes_summary.trim();
      }

      const { data: patient, error } = await supabase
        .from('patients')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return patient;
    },
    onSuccess: (patient) => {
      toast({
        title: 'Paciente cadastrado com sucesso',
        description: `ID: ${patient.public_id}`,
      });
      
      // Invalida a query de pacientes para recarregar a lista
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      
      // Reseta o formulário
      form.reset();
      setGeneratedId('');
      
      // Fecha o dialog
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cadastrar paciente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PatientFormData) => {
    createPatientMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Novo Paciente</DialogTitle>
          <DialogDescription>
            Cadastre um novo paciente. O ID público será gerado automaticamente.
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
                        placeholder="Nome do paciente (opcional)"
                        {...field}
                        maxLength={200}
                      />
                    </FormControl>
                    <FormDescription>
                      Nome será visível apenas em modo offline com chave USB
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormLabel>Observações Iniciais</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações clínicas relevantes (opcional)"
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
                disabled={createPatientMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createPatientMutation.isPending}>
                {createPatientMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Cadastrar Paciente
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
