import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { createPatient, generatePatientPublicId } from '@/lib/localDb';
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
  onSuccess?: (patient: any) => void;
}

export function PatientFormDialog({ open, onOpenChange, onSuccess }: PatientFormDialogProps) {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: '',
      birth_date: '',
      gender: 'Não informado',
      notes_summary: '',
    },
  });

  // Check if we have the required data
  const canSubmit = !!clinicId;

  const onSubmit = async (data: PatientFormData) => {
    if (!clinicId) {
      toast({
        title: 'Erro',
        description: 'Clínica não encontrada.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const patient = await createPatient({
        clinic_id: clinicId,
        full_name: data.full_name?.trim() || null,
        birth_date: data.birth_date || null,
        gender: data.gender,
        notes_summary: data.notes_summary?.trim() || null,
      });

      toast({
        title: 'Paciente cadastrado com sucesso',
        description: `ID: ${patient.public_id}`,
      });

      // Reset form
      form.reset();

      // Close dialog
      onOpenChange(false);

      // Optional callback
      if (onSuccess) {
        onSuccess(patient);
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        title: 'Erro ao cadastrar paciente',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
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
                      Nome será visível apenas com chave USB presente
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

            {!canSubmit && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                Aguarde... Carregando dados da clínica.
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !canSubmit}>
                {isSubmitting && (
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
