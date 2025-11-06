export function getUserFriendlyError(error: any): string {
  const message = error?.message?.toLowerCase() || '';
  
  // Map database errors to user-friendly messages
  if (message.includes('duplicate key')) {
    return 'Este registro já existe. Por favor, use valores únicos.';
  }
  if (message.includes('foreign key')) {
    return 'Não é possível completar esta operação. Verifique os dados relacionados.';
  }
  if (message.includes('not-null constraint') || message.includes('violates not-null')) {
    return 'Todos os campos obrigatórios devem ser preenchidos.';
  }
  if (message.includes('check constraint')) {
    return 'Os valores fornecidos não atendem aos requisitos.';
  }
  if (message.includes('permission denied') || message.includes('rls') || message.includes('policy')) {
    return 'Você não tem permissão para realizar esta ação.';
  }
  if (message.includes('invalid input syntax for type uuid')) {
    return 'ID inválido fornecido.';
  }
  if (message.includes('value too long')) {
    return 'Um ou mais campos excedem o tamanho máximo permitido.';
  }
  if (message.includes('invalid email')) {
    return 'Email inválido.';
  }
  if (message.includes('password')) {
    return 'Erro de autenticação. Verifique suas credenciais.';
  }
  
  // Generic fallback
  return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.';
}
