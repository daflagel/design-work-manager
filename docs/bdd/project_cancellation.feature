Feature: Cancelaciñon de proyecto

  Scenario: Cancelar proyecto en estado `borrador`
    Given un proyecto en estado `borrador`
    When el proyecto es cancelado
    Then el estado del proyecto pasa a `cancelado`
    And el proyecto no permite modificaciones

  Scenario: Registrar el motivo de cancelación de un proyecto
    Given un proyecto en estado `en_progreso`
    When se intenta cancelar el proyecto
    Then se requiere registrar un motivo de cancelación
    And la cancelación no se completa sin un motivo registrado

