import { OrganizationTemplate } from '@/types/organization';

export const organizationTemplates: Record<string, OrganizationTemplate> = {
  igreja: {
    departamentos: [
      { nome: 'Louvor e Adoração', tipo: 'louvor' },
      { nome: 'Ministério Infantil', tipo: 'infantil' },
      { nome: 'Ministério de Jovens', tipo: 'jovens' },
      { nome: 'Intercessão', tipo: 'intercessao' },
      { nome: 'Recepção', tipo: 'recepcao' },
      { nome: 'Mídia e Som', tipo: 'midia' }
    ],
    especializacoes: {
      louvor: ['Violão', 'Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Voz Principal', 'Back Vocal', 'Saxofone', 'Flauta'],
      infantil: ['Recreação', 'Ensino', 'Arte e Pintura', 'Música', 'Teatro', 'Contação de Histórias'],
      jovens: ['Liderança', 'Ensino', 'Música', 'Tecnologia', 'Esportes', 'Aconselhamento'],
      intercessao: ['Oração Individual', 'Oração Coletiva', 'Liderança de Oração', 'Guerra Espiritual'],
      recepcao: ['Recepção Geral', 'Primeira Visita', 'Informações', 'Hospitalidade'],
      midia: ['Operador de Som', 'Operador de Vídeo', 'Streaming', 'Fotografia', 'Design Gráfico']
    },
    terminologia: {
      organizacao: 'Igreja',
      departamento: 'Ministério',
      especializacao: 'Função/Instrumento',
      integrante: 'Voluntário'
    }
  },
  empresa: {
    departamentos: [
      { nome: 'Tecnologia da Informação', tipo: 'tecnologia' },
      { nome: 'Vendas', tipo: 'comercial' },
      { nome: 'Marketing', tipo: 'marketing' },
      { nome: 'Recursos Humanos', tipo: 'recursos_humanos' },
      { nome: 'Financeiro', tipo: 'financeiro' },
      { nome: 'Operações', tipo: 'operacoes' }
    ],
    especializacoes: {
      tecnologia: ['React', 'Node.js', 'Python', 'Java', 'DevOps', 'UI/UX', 'QA', 'Data Science', 'Cybersecurity'],
      comercial: ['Vendas B2B', 'Vendas B2C', 'Inside Sales', 'Key Account', 'Negociação', 'CRM', 'Prospecção'],
      marketing: ['Marketing Digital', 'Conteúdo', 'SEO/SEM', 'Redes Sociais', 'Email Marketing', 'Design', 'Analytics'],
      recursos_humanos: ['Recrutamento', 'Treinamento', 'Gestão de Performance', 'Folha de Pagamento', 'Benefícios'],
      financeiro: ['Contabilidade', 'Controladoria', 'Análise Financeira', 'Contas a Pagar', 'Contas a Receber', 'Tesouraria'],
      operacoes: ['Logística', 'Produção', 'Qualidade', 'Manutenção', 'Compras', 'Almoxarifado']
    },
    terminologia: {
      organizacao: 'Empresa',
      departamento: 'Departamento',
      especializacao: 'Habilidade/Competência',
      integrante: 'Colaborador'
    }
  },
  grupo: {
    departamentos: [
      { nome: 'Coordenação Geral', tipo: 'coordenacao' },
      { nome: 'Atividades', tipo: 'atividades' },
      { nome: 'Comunicação', tipo: 'comunicacao' },
      { nome: 'Apoio', tipo: 'apoio' }
    ],
    especializacoes: {
      coordenacao: ['Liderança', 'Planejamento', 'Organização', 'Gestão de Pessoas'],
      atividades: ['Recreação', 'Esportes', 'Cultura', 'Educação', 'Eventos'],
      comunicacao: ['Redes Sociais', 'Design', 'Redação', 'Fotografia', 'Vídeo'],
      apoio: ['Logística', 'Transporte', 'Alimentação', 'Limpeza', 'Segurança']
    },
    terminologia: {
      organizacao: 'Grupo',
      departamento: 'Área',
      especializacao: 'Especialidade',
      integrante: 'Membro'
    }
  }
};

export const getTemplate = (tipo: string): OrganizationTemplate => {
  return organizationTemplates[tipo] || organizationTemplates.grupo;
};