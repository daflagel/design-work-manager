# Design Work Manager – QA-Oriented Project

## Contexto

Este repositorio no implementa una aplicación funcional, sino que documenta el **trabajo de QA previo al desarrollo** de una aplicación PWA destinada a la gestión de trabajos de diseño gráfico con clientes.

El objetivo del proyecto es demostrar **criterio QA**, no herramientas ni automatización prematura.

---

## Problema que se aborda

En el trabajo real con clientes de diseño gráfico, los problemas más frecuentes no son técnicos, sino de proceso:

- Estados del proyecto implícitos o ambiguos  
- Cambios de alcance no explicitados  
- Feedback informal difícil de rastrear  
- Cancelaciones sin criterios claros  
- Falta de trazabilidad en decisiones clave  

Este proyecto busca **hacer explícitas esas reglas antes de escribir código**, reduciendo ambigüedad y riesgo.

---

## Enfoque de QA

El trabajo se abordó siguiendo este orden intencional:

1. **Definición de dominio**
2. **Identificación de escenarios QA orientados a riesgo**
3. **Derivación de casos de prueba solo cuando el comportamiento es objetivo**
4. **Uso selectivo de BDD únicamente donde aporta valor**

No todos los escenarios se convirtieron en tests, y eso es una decisión consciente.

---

## Estructura del repositorio

```text
docs/
├── dominio.md
├── qa_scenarios.md
├── test_cases.md
├── git_workflow.md
└── bdd/
    └── project_cancellation.feature
