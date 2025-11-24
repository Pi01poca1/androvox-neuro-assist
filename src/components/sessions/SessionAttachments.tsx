import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Upload, X, File, Loader2, FileText, Image as ImageIcon } from 'lucide-react';

interface SessionAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

interface SessionAttachmentsProps {
  sessionId: string;
  attachments: SessionAttachment[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export function SessionAttachments({ sessionId, attachments }: SessionAttachmentsProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!profile?.clinic_id) throw new Error('Clínica não encontrada');

      // Validate file
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Tipo de arquivo não permitido. Use PDF ou imagens (JPG, PNG, WEBP).');
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Arquivo muito grande. Tamanho máximo: 10MB.');
      }

      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile.clinic_id}/${sessionId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('session-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('session_attachments')
        .insert({
          session_id: sessionId,
          clinic_id: profile.clinic_id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: profile.id,
        });

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('session-attachments').remove([filePath]);
        throw dbError;
      }

      return { fileName: file.name };
    },
    onSuccess: (data) => {
      toast({
        title: 'Arquivo enviado',
        description: `${data.fileName} foi anexado com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ['session-detail', sessionId] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao enviar arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachment: SessionAttachment) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('session-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('session_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      return attachment;
    },
    onSuccess: (attachment) => {
      toast({
        title: 'Arquivo removido',
        description: `${attachment.file_name} foi removido.`,
      });
      queryClient.invalidateQueries({ queryKey: ['session-detail', sessionId] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    for (const file of Array.from(files)) {
      await uploadMutation.mutateAsync(file);
    }
    
    setUploading(false);
    event.target.value = ''; // Reset input
  };

  const downloadFile = async (attachment: SessionAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('session-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Erro ao baixar arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <label htmlFor="file-upload">
          <Button asChild variant="outline" disabled={uploading}>
            <span className="cursor-pointer">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Anexar Arquivos
                </>
              )}
            </span>
          </Button>
        </label>
        <p className="text-xs text-muted-foreground mt-2">
          PDF ou imagens (JPG, PNG, WEBP) até 10MB
        </p>
      </div>

      {/* Attachments List */}
      {attachments && attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <Card key={attachment.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-muted-foreground">
                      {getFileIcon(attachment.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{attachment.file_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(attachment.file_size)} •{' '}
                        {new Date(attachment.uploaded_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(attachment)}
                    >
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(attachment)}
                      disabled={deleteMutation.isPending}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(!attachments || attachments.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhum arquivo anexado
        </p>
      )}
    </div>
  );
}
