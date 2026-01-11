import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Mail, Clock, Check, X, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamMember {
  id: string;
  full_name: string;
  clinic_id: string;
  created_at: string;
  role: string;
  email: string;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export function TeamManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch team members
  const { data: teamMembers = [], isLoading: isLoadingTeam } = useQuery({
    queryKey: ['clinic-team', profile?.clinic_id],
    queryFn: async () => {
      if (!profile?.clinic_id) return [];
      
      const { data, error } = await supabase
        .rpc('get_clinic_team', { _clinic_id: profile.clinic_id });
      
      if (error) throw error;
      return (data || []) as TeamMember[];
    },
    enabled: !!profile?.clinic_id,
  });

  // Fetch invitations
  const { data: invitations = [], isLoading: isLoadingInvitations } = useQuery({
    queryKey: ['secretary-invitations', profile?.clinic_id],
    queryFn: async () => {
      if (!profile?.clinic_id) return [];
      
      const { data, error } = await supabase
        .from('secretary_invitations')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Invitation[];
    },
    enabled: !!profile?.clinic_id,
  });

  // Create invitation mutation
  const createInvitation = useMutation({
    mutationFn: async (email: string) => {
      if (!profile?.clinic_id) throw new Error('Clínica não encontrada');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Fetch clinic name for the email
      const { data: clinicData } = await supabase
        .from('clinics')
        .select('name')
        .eq('id', profile.clinic_id)
        .single();

      const normalizedEmail = email.toLowerCase().trim();

      // Check if there's already a pending invitation for this email
      const { data: existingInvitation } = await supabase
        .from('secretary_invitations')
        .select('id, status, expires_at, token')
        .eq('clinic_id', profile.clinic_id)
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .single();

      let invitationToken: string;

      if (existingInvitation) {
        const isExpired = new Date(existingInvitation.expires_at) < new Date();
        
        if (isExpired) {
          // Update the expired invitation with a new expiry
          const { error: updateError } = await supabase
            .from('secretary_invitations')
            .update({
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              invited_by: user.id,
            })
            .eq('id', existingInvitation.id);
          
          if (updateError) throw updateError;
          invitationToken = existingInvitation.token;
          
          // Send email for renewed invitation
          const { data: session } = await supabase.auth.getSession();
          const response = await supabase.functions.invoke('send-secretary-invitation', {
            body: {
              email: normalizedEmail,
              clinicName: clinicData?.name || 'Clínica',
              inviterName: profile.full_name,
              token: invitationToken,
            },
          });

          if (response.error) {
            console.error('Error sending email:', response.error);
            // Don't throw - invitation was renewed, just email failed
          }

          return { renewed: true };
        } else {
          throw new Error('Já existe um convite pendente para este email. Cancele o convite existente primeiro.');
        }
      }

      // Check if email is already a team member
      const teamMembersResult = await supabase.rpc('get_clinic_team', { _clinic_id: profile.clinic_id });
      const isMember = teamMembersResult.data?.some(
        (m: TeamMember) => m.email.toLowerCase() === normalizedEmail
      );

      if (isMember) {
        throw new Error('Este email já pertence a um membro da equipe.');
      }

      // Create new invitation
      const { data: newInvitation, error } = await supabase
        .from('secretary_invitations')
        .insert({
          clinic_id: profile.clinic_id,
          email: normalizedEmail,
          invited_by: user.id,
        })
        .select('token')
        .single();
      
      if (error) {
        // Handle duplicate key specifically
        if (error.code === '23505') {
          throw new Error('Já existe um convite para este email. Verifique o histórico de convites.');
        }
        throw error;
      }

      // Send invitation email
      const response = await supabase.functions.invoke('send-secretary-invitation', {
        body: {
          email: normalizedEmail,
          clinicName: clinicData?.name || 'Clínica',
          inviterName: profile.full_name,
          token: newInvitation.token,
        },
      });

      if (response.error) {
        console.error('Error sending email:', response.error);
        // Invitation created but email failed - notify user
        throw new Error('Convite criado, mas houve erro ao enviar o email. Tente reenviar.');
      }

      return { renewed: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['secretary-invitations'] });
      setInviteEmail('');
      setIsDialogOpen(false);
      toast({
        title: result?.renewed ? 'Convite renovado' : 'Convite enviado',
        description: result?.renewed 
          ? 'O convite expirado foi renovado com sucesso.'
          : 'O secretário receberá instruções por email para se registrar.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar convite',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel invitation mutation
  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('secretary_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secretary-invitations'] });
      toast({
        title: 'Convite cancelado',
        description: 'O convite foi cancelado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar convite',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete invitation mutation
  const deleteInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('secretary_invitations')
        .delete()
        .eq('id', invitationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secretary-invitations'] });
      toast({
        title: 'Convite removido',
        description: 'O convite foi removido do histórico.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover convite',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    createInvitation.mutate(inviteEmail);
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'accepted') {
      return <Badge variant="default" className="bg-green-600"><Check className="h-3 w-3 mr-1" /> Aceito</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="secondary"><X className="h-3 w-3 mr-1" /> Cancelado</Badge>;
    }
    if (isExpired || status === 'expired') {
      return <Badge variant="destructive"><Clock className="h-3 w-3 mr-1" /> Expirado</Badge>;
    }
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'profissional') {
      return <Badge variant="default">Profissional</Badge>;
    }
    return <Badge variant="secondary">Secretário</Badge>;
  };

  const pendingInvitations = invitations.filter(
    inv => inv.status === 'pending' && new Date(inv.expires_at) > new Date()
  );

  return (
    <div className="space-y-6">
      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Equipe da Clínica
          </CardTitle>
          <CardDescription>
            Membros ativos da sua clínica
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTeam ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : teamMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum membro encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>
                      {format(new Date(member.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Secretary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Convidar Secretário
              </CardTitle>
              <CardDescription>
                Envie um convite para adicionar um novo secretário à sua clínica
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Convite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleInvite}>
                  <DialogHeader>
                    <DialogTitle>Convidar Secretário</DialogTitle>
                    <DialogDescription>
                      O secretário receberá um convite para se registrar e será automaticamente 
                      vinculado à sua clínica após criar a conta.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="email">Email do Secretário</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="secretario@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="mt-2"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createInvitation.isPending}>
                      {createInvitation.isPending ? 'Enviando...' : 'Enviar Convite'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {pendingInvitations.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-4 mb-4">
              <p className="text-sm font-medium mb-2">
                <Mail className="h-4 w-4 inline mr-2" />
                {pendingInvitations.length} convite(s) pendente(s)
              </p>
              <p className="text-xs text-muted-foreground">
                Os secretários convidados devem se registrar usando o mesmo email do convite.
              </p>
            </div>
          )}

          <Separator className="my-4" />

          <h4 className="text-sm font-medium mb-3">Histórico de Convites</h4>
          
          {isLoadingInvitations ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : invitations.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum convite enviado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status, invitation.expires_at)}</TableCell>
                    <TableCell>
                      {format(new Date(invitation.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invitation.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      {invitation.status === 'pending' && new Date(invitation.expires_at) > new Date() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelInvitation.mutate(invitation.id)}
                          disabled={cancelInvitation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {(invitation.status !== 'pending' || new Date(invitation.expires_at) <= new Date()) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover convite?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O convite será removido do histórico.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteInvitation.mutate(invitation.id)}
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}