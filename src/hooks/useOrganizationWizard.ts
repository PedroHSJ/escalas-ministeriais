import { useState, useCallback } from 'react';
import { OrganizationTemplate } from '@/types/organization';
import { getTemplate } from '@/config/organization-templates';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

interface WizardData {
  organizationName: string;
  organizationType: string;
  selectedDepartments: Array<{ nome: string; tipo: string }>;
  customDepartments: Array<{ nome: string; tipo: string }>;
  departmentSpecializations: Record<string, string[]>;
  template: OrganizationTemplate | null;
}

interface UseOrganizationWizardReturn {
  currentStep: number;
  wizardData: WizardData;
  isLoading: boolean;
  nextStep: () => void;
  prevStep: () => void;
  updateWizardData: (data: Partial<WizardData>) => void;
  setOrganizationType: (type: string) => void;
  submitWizard: (userId: string) => Promise<boolean>;
  getTotalSteps: () => number;
}

export const useOrganizationWizard = (): UseOrganizationWizardReturn => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [wizardData, setWizardData] = useState<WizardData>({
    organizationName: '',
    organizationType: '',
    selectedDepartments: [],
    customDepartments: [],
    departmentSpecializations: {},
    template: null
  });

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const updateWizardData = useCallback((data: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...data }));
  }, []);

  const setOrganizationType = useCallback((type: string) => {
    const template = getTemplate(type);
    setWizardData(prev => ({
      ...prev,
      organizationType: type,
      template,
      selectedDepartments: template.departamentos,
      departmentSpecializations: template.especializacoes
    }));
  }, []);

  const submitWizard = useCallback(async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('Iniciando criação da organização...', {
        nome: wizardData.organizationName,
        tipo: wizardData.organizationType,
        user_id: userId
      });

      // 1. Criar organização (UUID será gerado automaticamente)
      const { data: orgData, error: orgError } = await supabase
        .from('organizacoes')
        .insert({
          nome: wizardData.organizationName,
          tipo: wizardData.organizationType,
          user_id: userId
        })
        .select()
        .single();

      if (orgError) {
        console.error('Erro ao criar organização:', orgError);
        throw new Error(`Erro ao criar organização: ${orgError.message}`);
      }

      console.log('Organização criada:', orgData);

      // 2. Criar departamentos
      const allDepartments = [...wizardData.selectedDepartments, ...wizardData.customDepartments];
      
      if (allDepartments.length > 0) {
        const departmentInserts = allDepartments.map(dept => ({
          nome: dept.nome,
          organizacao_id: orgData.id,
          tipo_departamento: dept.tipo
        }));

        console.log('Inserindo departamentos:', departmentInserts);

        const { data: deptData, error: deptError } = await supabase
          .from('departamentos')
          .insert(departmentInserts)
          .select();

        if (deptError) {
          console.error('Erro ao criar departamentos:', deptError);
          throw new Error(`Erro ao criar departamentos: ${deptError.message}`);
        }

        console.log('Departamentos criados:', deptData);

        // 3. Criar tipo de especialização
        const { data: tipoEspData, error: tipoEspError } = await supabase
          .from('tipos_especializacao')
          .insert({
            nome: wizardData.template?.terminologia.especializacao || 'Especializações',
            organizacao_id: orgData.id
          })
          .select()
          .single();

        if (tipoEspError) {
          console.error('Erro ao criar tipo de especialização:', tipoEspError);
          throw new Error(`Erro ao criar tipo de especialização: ${tipoEspError.message}`);
        }

        console.log('Tipo de especialização criado:', tipoEspData);

        // 4. Criar especializações
        const especializacoes: Array<{ nome: string; tipo_especializacao_id: string }> = [];
        
        Object.entries(wizardData.departmentSpecializations).forEach(([deptTipo, specs]) => {
          specs.forEach(spec => {
            if (spec.trim()) { // Garantir que não são vazias
              especializacoes.push({
                nome: spec.trim(),
                tipo_especializacao_id: tipoEspData.id
              });
            }
          });
        });

        if (especializacoes.length > 0) {
          // Remover duplicatas
          const uniqueEspecializacoes = especializacoes.filter((esp, index, self) => 
            index === self.findIndex(e => e.nome === esp.nome)
          );

          console.log('Inserindo especializações:', uniqueEspecializacoes);

          const { data: specData, error: specError } = await supabase
            .from('especializacoes')
            .insert(uniqueEspecializacoes)
            .select();

          if (specError) {
            console.error('Erro ao criar especializações:', specError);
            throw new Error(`Erro ao criar especializações: ${specError.message}`);
          }

          console.log('Especializações criadas:', specData);
        }
      }

      toast.success('Organização configurada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro completo ao criar organização:', error);
      toast.error(`Erro ao configurar organização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [wizardData]);

  const getTotalSteps = useCallback(() => 4, []);

  return {
    currentStep,
    wizardData,
    isLoading,
    nextStep,
    prevStep,
    updateWizardData,
    setOrganizationType,
    submitWizard,
    getTotalSteps
  };
};