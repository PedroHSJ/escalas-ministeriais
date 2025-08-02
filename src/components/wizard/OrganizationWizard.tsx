"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Circle,
  Building2,
  Users,
  Settings,
  Sparkles,
  X,
  Plus,
} from "lucide-react";
import { useOrganizationWizard } from "@/hooks/useOrganizationWizard";
import { organizationTemplates } from "@/config/organization-templates";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface OrganizationWizardProps {
  userId: string;
  onComplete: () => void;
}

export function OrganizationWizard({
  userId,
  onComplete,
}: OrganizationWizardProps) {
  const {
    currentStep,
    wizardData,
    isLoading,
    nextStep,
    prevStep,
    updateWizardData,
    setOrganizationType,
    submitWizard,
    getTotalSteps,
  } = useOrganizationWizard();

  const [customDepartmentName, setCustomDepartmentName] = useState("");
  const [tempSpecializationInputs, setTempSpecializationInputs] = useState<
    Record<string, string>
  >({});

  const handleSubmit = async () => {
    const success = await submitWizard(userId);
    if (success) {
      onComplete();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          wizardData.organizationName.trim().length >= 3 &&
          wizardData.organizationType
        );
      case 2:
        return (
          wizardData.selectedDepartments.length > 0 ||
          wizardData.customDepartments.length > 0
        );
      case 3:
        return true; // Especializações são opcionais
      case 4:
        return true; // Review sempre pode ser enviado
      default:
        return false;
    }
  };

  const addCustomDepartment = () => {
    if (customDepartmentName.trim()) {
      const newDept = {
        nome: customDepartmentName.trim(),
        tipo: customDepartmentName.toLowerCase().replace(/\s+/g, "_"),
      };
      updateWizardData({
        customDepartments: [...wizardData.customDepartments, newDept],
        // Inicializar especializações vazias para o novo departamento
        departmentSpecializations: {
          ...wizardData.departmentSpecializations,
          [newDept.tipo]: [],
        },
      });
      setCustomDepartmentName("");
    }
  };

  const removeCustomDepartment = (index: number) => {
    const deptToRemove = wizardData.customDepartments[index];
    const updated = wizardData.customDepartments.filter((_, i) => i !== index);

    // Remover também as especializações do departamento removido
    const updatedSpecializations = { ...wizardData.departmentSpecializations };
    delete updatedSpecializations[deptToRemove.tipo];

    updateWizardData({
      customDepartments: updated,
      departmentSpecializations: updatedSpecializations,
    });
  };

  const toggleDepartment = (dept: { nome: string; tipo: string }) => {
    const isSelected = wizardData.selectedDepartments.some(
      (d) => d.tipo === dept.tipo
    );
    if (isSelected) {
      // Ao remover departamento, também remover suas especializações se não for personalizado
      const updatedSpecializations = {
        ...wizardData.departmentSpecializations,
      };
      if (!wizardData.customDepartments.some((d) => d.tipo === dept.tipo)) {
        delete updatedSpecializations[dept.tipo];
      }

      updateWizardData({
        selectedDepartments: wizardData.selectedDepartments.filter(
          (d) => d.tipo !== dept.tipo
        ),
        departmentSpecializations: updatedSpecializations,
      });
    } else {
      // Ao adicionar departamento, inicializar com especializações do template se existirem
      const newSpecializations = { ...wizardData.departmentSpecializations };
      if (
        wizardData.template?.especializacoes[dept.tipo] &&
        !newSpecializations[dept.tipo]
      ) {
        newSpecializations[dept.tipo] = [
          ...wizardData.template.especializacoes[dept.tipo],
        ];
      } else if (!newSpecializations[dept.tipo]) {
        newSpecializations[dept.tipo] = [];
      }

      updateWizardData({
        selectedDepartments: [...wizardData.selectedDepartments, dept],
        departmentSpecializations: newSpecializations,
      });
    }
  };

  // Função para adicionar especializações separadas por vírgula
  const handleSpecializationInput = (deptTipo: string, value: string) => {
    setTempSpecializationInputs({
      ...tempSpecializationInputs,
      [deptTipo]: value,
    });
  };

  const addSpecializationsFromInput = (deptTipo: string) => {
    const inputValue = tempSpecializationInputs[deptTipo] || "";
    if (inputValue.trim()) {
      const newSpecs = inputValue
        .split(",")
        .map((spec) => spec.trim())
        .filter((spec) => spec.length > 0);

      const currentSpecs = wizardData.departmentSpecializations[deptTipo] || [];
      const uniqueSpecs = [...new Set([...currentSpecs, ...newSpecs])];

      updateWizardData({
        departmentSpecializations: {
          ...wizardData.departmentSpecializations,
          [deptTipo]: uniqueSpecs,
        },
      });

      // Limpar o input
      setTempSpecializationInputs({
        ...tempSpecializationInputs,
        [deptTipo]: "",
      });
    }
  };

  const removeSpecialization = (deptTipo: string, specIndex: number) => {
    const currentSpecs = wizardData.departmentSpecializations[deptTipo] || [];
    const updatedSpecs = currentSpecs.filter((_, index) => index !== specIndex);

    updateWizardData({
      departmentSpecializations: {
        ...wizardData.departmentSpecializations,
        [deptTipo]: updatedSpecs,
      },
    });
  };

  const addSingleSpecialization = (deptTipo: string, spec: string) => {
    if (spec.trim()) {
      const currentSpecs = wizardData.departmentSpecializations[deptTipo] || [];
      if (!currentSpecs.includes(spec.trim())) {
        updateWizardData({
          departmentSpecializations: {
            ...wizardData.departmentSpecializations,
            [deptTipo]: [...currentSpecs, spec.trim()],
          },
        });
      }
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="orgName">
                Nome da{" "}
                {organizationTemplates[wizardData.organizationType]
                  ?.terminologia.organizacao || "Organização"}
              </Label>
              <Input
                id="orgName"
                placeholder="Ex: Igreja Batista Central, Tech Solutions Ltda"
                value={wizardData.organizationName}
                onChange={(e) =>
                  updateWizardData({ organizationName: e.target.value })
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label>Tipo de Organização</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                {Object.entries(organizationTemplates).map(
                  ([key, template]) => (
                    <Card
                      key={key}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        wizardData.organizationType === key
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => setOrganizationType(key)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="mb-2">
                          {key === "igreja" && (
                            <Building2 className="mx-auto h-8 w-8" />
                          )}
                          {key === "empresa" && (
                            <Users className="mx-auto h-8 w-8" />
                          )}
                          {key === "grupo" && (
                            <Sparkles className="mx-auto h-8 w-8" />
                          )}
                        </div>
                        <h3 className="font-medium capitalize">
                          {template.terminologia.organizacao}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {key === "igreja" &&
                            "Igrejas, congregações e comunidades religiosas"}
                          {key === "empresa" &&
                            "Empresas, startups e corporações"}
                          {key === "grupo" &&
                            "ONGs, grupos comunitários e associações"}
                        </p>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">
                Selecione os{" "}
                {wizardData.template?.terminologia.departamento ||
                  "Departamentos"}
              </h3>

              {wizardData.template?.departamentos && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {wizardData.template.departamentos.map((dept) => (
                    <div
                      key={dept.tipo}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={dept.tipo}
                        checked={wizardData.selectedDepartments.some(
                          (d) => d.tipo === dept.tipo
                        )}
                        onCheckedChange={() => toggleDepartment(dept)}
                      />
                      <Label htmlFor={dept.tipo} className="flex-1">
                        {dept.nome}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-4">
                <Label htmlFor="customDept">
                  Adicionar{" "}
                  {wizardData.template?.terminologia.departamento ||
                    "Departamento"}{" "}
                  Personalizado
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="customDept"
                    placeholder="Nome do departamento"
                    value={customDepartmentName}
                    onChange={(e) => setCustomDepartmentName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addCustomDepartment();
                      }
                    }}
                  />
                  <Button onClick={addCustomDepartment} variant="outline">
                    Adicionar
                  </Button>
                </div>
              </div>

              {wizardData.customDepartments.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2 mt-2">
                    {wizardData.customDepartments.map((dept, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {dept.nome}
                        <button
                          onClick={() => removeCustomDepartment(index)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">
                Configurar{" "}
                {wizardData.template?.terminologia.especializacao ||
                  "Especializações"}
              </h3>
              <p className="text-muted-foreground mb-6">
                Você pode personalizar as especializações para cada
                departamento. Digite separado por vírgulas ou adicione uma por
                vez.
              </p>

              {[
                ...wizardData.selectedDepartments,
                ...wizardData.customDepartments,
              ].map((dept) => (
                <Card key={dept.tipo} className="p-4">
                  <h4 className="font-medium mb-3">{dept.nome}</h4>

                  {/* Mostrar especializações atuais */}
                  {(wizardData.departmentSpecializations[dept.tipo] || [])
                    .length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(
                        wizardData.departmentSpecializations[dept.tipo] || []
                      ).map((spec, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          {spec}
                          <button
                            onClick={() =>
                              removeSpecialization(dept.tipo, index)
                            }
                            className="ml-1 text-red-500 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Input para adicionar especializações */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite especializações separadas por vírgula"
                        value={tempSpecializationInputs[dept.tipo] || ""}
                        onChange={(e) =>
                          handleSpecializationInput(dept.tipo, e.target.value)
                        }
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSpecializationsFromInput(dept.tipo);
                          }
                        }}
                      />
                      <Button
                        onClick={() => addSpecializationsFromInput(dept.tipo)}
                        variant="outline"
                        size="icon"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Exemplo: Violão, Guitarra, Bateria ou pressione Enter para
                      adicionar
                    </p>
                  </div>

                  {/* Sugestões baseadas no template */}
                  {wizardData.template?.especializacoes[dept.tipo] && (
                    <div className="mt-3 pt-3 border-t">
                      <Label className="text-sm text-muted-foreground">
                        Sugestões:
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {wizardData.template.especializacoes[dept.tipo]
                          .filter(
                            (spec) =>
                              !(
                                wizardData.departmentSpecializations[
                                  dept.tipo
                                ] || []
                              ).includes(spec)
                          )
                          .map((spec) => (
                            <Button
                              key={spec}
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                addSingleSpecialization(dept.tipo, spec)
                              }
                            >
                              + {spec}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">
                Resumo da Configuração
              </h3>

              <Card className="p-4 mb-4">
                <h4 className="font-medium mb-2">Organização</h4>
                <p>
                  <strong>Nome:</strong> {wizardData.organizationName}
                </p>
                <p>
                  <strong>Tipo:</strong>{" "}
                  {wizardData.template?.terminologia.organizacao}
                </p>
              </Card>

              <Card className="p-4 mb-4">
                <h4 className="font-medium mb-2">
                  {wizardData.template?.terminologia.departamento}s
                </h4>
                <div className="space-y-3">
                  {[
                    ...wizardData.selectedDepartments,
                    ...wizardData.customDepartments,
                  ].map((dept, index) => (
                    <div key={index} className="border-l-2 border-primary pl-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium">{dept.nome}</span>
                        <Badge variant="outline">
                          {
                            (
                              wizardData.departmentSpecializations[dept.tipo] ||
                              []
                            ).length
                          }{" "}
                          especializações
                        </Badge>
                      </div>
                      {(wizardData.departmentSpecializations[dept.tipo] || [])
                        .length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(
                            wizardData.departmentSpecializations[dept.tipo] ||
                            []
                          ).map((spec, specIndex) => (
                            <Badge
                              key={specIndex}
                              variant="secondary"
                              className="text-xs"
                            >
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  ✨ Sua organização será criada com{" "}
                  {
                    [
                      ...wizardData.selectedDepartments,
                      ...wizardData.customDepartments,
                    ].length
                  }{" "}
                  departamentos e {""}
                  {
                    Object.values(wizardData.departmentSpecializations).flat()
                      .length
                  }{" "}
                  especializações configuradas.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const steps = [
    { number: 1, title: "Informações Básicas", icon: Building2 },
    { number: 2, title: "Departamentos", icon: Users },
    { number: 3, title: "Especializações", icon: Settings },
    { number: 4, title: "Resumo", icon: CheckCircle },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-4">
          Configuração da Organização
        </h1>
        <p className="text-center text-muted-foreground mb-6">
          Vamos configurar sua organização para começar a criar escalas
        </p>

        <Progress
          value={(currentStep / getTotalSteps()) * 100}
          className="mb-4"
        />

        <div className="flex justify-center">
          <div className="flex items-center space-x-4">
            {steps.map((step) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;

              return (
                <div key={step.number} className="flex items-center">
                  <div
                    className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2
                    ${
                      isCompleted
                        ? "bg-primary border-primary text-primary-foreground"
                        : isCurrent
                        ? "border-primary text-primary"
                        : "border-muted text-muted-foreground"
                    }
                  `}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      isCurrent
                        ? "text-primary"
                        : isCompleted
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                  {step.number < steps.length && (
                    <div
                      className={`w-8 h-0.5 mx-4 ${
                        isCompleted ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Passo {currentStep}: {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Informe o nome e tipo da sua organização"}
            {currentStep === 2 &&
              "Selecione os departamentos que sua organização possui"}
            {currentStep === 3 &&
              "Configure as especializações para cada departamento"}
            {currentStep === 4 && "Revise as configurações antes de finalizar"}
          </CardDescription>
        </CardHeader>
        <CardContent>{renderStepContent()}</CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Anterior
        </Button>

        <div className="flex gap-2">
          {currentStep < getTotalSteps() ? (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Próximo
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isLoading}
            >
              {isLoading ? "Criando..." : "Finalizar Configuração"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
