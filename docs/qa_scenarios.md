# Escenarios Críticos de QA – Gestión de Proyectos de Diseño

## 1. Creación y estados iniciales

- Se intenta crear un proyecto sin definir un brief inicial.
- Se intenta crear entregables mientras el proyecto está en estado `borrador`.
- Se intenta avanzar un proyecto desde `borrador` sin que exista un evento registrable que justifique el inicio del trabajo.
- Se intenta cancelar un proyecto que se encuentra en estado `borrador` y se verifica que el proyecto finaliza en estado `cancelado`.


---

## 2. Progreso del proyecto

- Se intenta avanzar un proyecto a `en_progreso` sin que exista información suficiente para comenzar el trabajo (riesgo asumido conscientemente en clientes recurrentes).
- Se intenta crear entregables en un proyecto que no está en `en_progreso`.
- Se introducen cambios en el brief una vez iniciado el trabajo sin que quede registro de la decisión de aceptarlos.
- Se intenta avanzar el proyecto mientras existe un bloqueo activo.

---

## 3. Feedback y validación

- Se intenta avanzar un proyecto a `esperando_feedback` sin entregables asociados.
- Se intenta aprobar un proyecto sin que exista feedback registrado.
- Se intenta interpretar feedback ambiguo (“me gusta”, “ok”) como aprobación explícita.

---

## 4. Cambios de alcance

- Se intenta modificar un entregable aprobado sin registrar un evento de cambio de alcance.
- Se intenta añadir nuevas tareas que no estaban en el alcance original.
- Se intenta introducir cambios de alcance de forma implícita durante el feedback.

---

## 5. Cancelación del proyecto

- Se intenta cancelar un proyecto en estado `en_progreso` con entregables ya creados.
- Se intenta cancelar un proyecto en estado `esperando_feedback` con feedback pendiente.
- Se intenta cancelar un proyecto sin registrar el motivo de cancelación.
- Se intenta cancelar un proyecto que ya se encuentra en estado `entregado`.

---

## 6. Estado `cancelado` (estado terminal)

- Se intenta modificar un proyecto que se encuentra en estado `cancelado`.
- Se intenta reabrir un proyecto en estado `cancelado`.
- Se intenta crear nuevos entregables en un proyecto `cancelado`.
- Se intenta cambiar el estado de un proyecto `cancelado` a cualquier otro estado.

---

## 7. Entrega y cierre

- Se intenta marcar un proyecto como `entregado` sin aprobación explícita del cliente.
- Se intenta modificar un entregable después de que el proyecto fue `entregado`.
- Se intenta registrar feedback sobre un proyecto `entregado` sin definir si inicia un nuevo trabajo o modifica el entregable cerrado.
- Se intenta cancelar un proyecto que ya fue `entregado`.

---

## 8. Trazabilidad y consistencia

- Se intenta realizar una acción sin que quede registro de quién la ejecutó.
- Se intenta avanzar el estado del proyecto sin dejar evidencia del evento que lo provocó.
- Se intenta consultar el estado final de un proyecto sin información sobre cómo se llegó a él.
- Se intenta auditar un proyecto sin acceso al historial completo de decisiones.
