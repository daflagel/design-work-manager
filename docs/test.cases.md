## TC-01 – Cancelación de proyecto en estado borrador

### Objetivo
Verificar que un proyecto en estado `borrador` puede ser cancelado
y que la cancelación conduce siempre al estado terminal `cancelado`.

### Precondiciones
- Existe un proyecto creado en el sistema.
- El proyecto se encuentra en estado `borrador`.
- El proyecto no tiene entregables asociados.

### Pasos
1. Seleccionar el proyecto en estado `borrador`.
2. Ejecutar la acción de cancelar proyecto.
3. Confirmar la cancelación.

### Resultado esperado
- El estado del proyecto cambia a `cancelado`.
- No es posible modificar el proyecto luego de la cancelación.
- El historial del proyecto registra el evento de cancelación.

---

## TC-02 – Registrar el motivo de cancelación de un proyecto en curso

### Objetivo
Verificar que al cancelar un proyecto en curso se requiere registrar un motivo de cancelación.

### Precondiciones
- Existe un proyecto creado en el sistema.
- El proyecto se encuentra en estado `borrador`, `en_progreso` o `esperando_feedback`

### Pasos
1. Seleccionar un proyecto en estado `borrador`, `en_progreso` o `esperando_feedback`
2. Ejecutar la acción de cancelar proyecto.
3. Ingresar un motivo de cancelación.
4. Confirmar la cancelación.

### Resultado esperado
- El sistema requiere que se ingrese un motivo para completar la cancelación.
- El proyecto cambia su estado a `cancelado`.
- El motivo de cancelación queda registrado en el historial del proyecto.