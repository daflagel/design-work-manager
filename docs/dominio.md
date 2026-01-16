## 1. Propósito del sistema

Este sistema tiene como objetivo gestionar trabajos de diseño con clientes
de forma estructurada y trazable, reduciendo la ambigüedad en el alcance,
el feedback y las entregas, y haciendo explícitas las decisiones clave
del proceso de trabajo.

El sistema está diseñado para:
- Ser utilizado en trabajo real de diseño gráfico
- Forzar reglas claras y estados explícitos
- Facilitar la detección temprana de riesgos y cambios de alcance
- Centralizar la comunicación y la información relevante del proyecto
  en un único espacio de trabajo

El sistema no intenta:
- Gestionar pagos o facturación
- Funcionar como marketplace o plataforma de intermediación de servicios
- Reemplazar comunicación personal o no relacionada con el proyecto

## 2. Principios de dominio

- El sistema gestiona decisiones y trabajo relevante, no conversaciones informales.
- Nada se sobrescribe: todo cambio relevante debe quedar registrado.
- El avance del proyecto depende de estados explícitos y condiciones objetivas.
- El feedback del cliente debe ser estructurado para tener impacto en el trabajo.
- Los cambios de alcance son eventos explícitos y excepcionales, no implícitos.
- Si una decisión no está registrada en el sistema, no existe para el proyecto.
- El sistema es la fuente única de verdad del proyecto: si algo no está registrado, no existe a efectos del trabajo.


## 3. Estados del Proyecto

Un proyecto de diseño siempre se encuentra en uno y solo uno de los siguientes estados.
El estado determina qué acciones están permitidas y cuáles están prohibidas.

---

### 3.1 Borrador

**Definición**  
El proyecto existe, pero aún no hay un acuerdo de trabajo aprobado.

**Condición objetiva**
- El brief no está aprobado.

**Acciones permitidas**
- Crear y modificar el brief.
- Registrar información inicial del cliente.
- Cancelar el proyecto sin impacto.

**Acciones prohibidas**
- Crear entregables.
- Solicitar feedback.
- Registrar avance de trabajo.

**Riesgo que controla**
- Trabajo sin acuerdo.
- Expectativas implícitas.

---

### 3.2 En progreso

**Definición**  
El trabajo está autorizado y en ejecución.

**Condición objetiva**
- Existe un brief aprobado y vigente.

**Acciones permitidas**
- Crear y modificar entregables.
- Registrar decisiones internas.
- Enviar entregables a revisión.

**Acciones prohibidas**
- Cambiar el alcance sin un evento explícito.
- Marcar el proyecto como aprobado.
- Cerrar el proyecto.

**Riesgo que controla**
- Scope creep silencioso.
- Avance sin base contractual.

---

### 3.3 Esperando feedback

**Definición**  
El avance del proyecto está detenido a la espera de respuesta del cliente.

**Condición objetiva**
- Existe al menos un entregable enviado pendiente de feedback.

**Acciones permitidas**
- Recibir feedback estructurado.
- Solicitar aclaraciones al cliente.

**Acciones prohibidas**
- Avanzar trabajo.
- Crear nuevos entregables.
- Cerrar el proyecto.

**Riesgo que controla**
- Trabajo a ciegas.
- Reprocesos innecesarios.

---

### 3.4 Bloqueado

**Definición**  
El proyecto no puede avanzar por un impedimento explícito no resoluble con feedback normal.

**Condición objetiva**
- Existe un bloqueo activo registrado.

**Ejemplos**
- Falta material crítico.
- Cliente inactivo.
- Cambio de alcance pendiente de decisión.

**Acciones permitidas**
- Registrar la causa del bloqueo.
- Mantener trazabilidad del estado.

**Acciones prohibidas**
- Avanzar trabajo.
- Enviar entregables.
- Cerrar el proyecto.

**Riesgo que controla**
- Falsos avances.
- Problemas invisibles para el sistema.

---

### 3.5 Aprobado

**Definición**  
El resultado del proyecto ha sido aceptado explícitamente por el cliente.

**Condición objetiva**
- Todos los entregables requeridos están aprobados.

**Acciones permitidas**
- Preparar el cierre del proyecto.
- Registrar conclusiones finales.

**Acciones prohibidas**
- Modificar entregables.
- Reabrir trabajo sin un evento explícito.

**Riesgo que controla**
- Aprobaciones implícitas.
- Cierres ambiguos.

---

### 3.6 Entregado

**Definición**  
El proyecto está cerrado operativamente.

**Condición objetiva**
- El proyecto se encuentra aprobado.
- El cierre ha sido registrado.

**Acciones permitidas**
- Consulta histórica del proyecto.

**Acciones prohibidas**
- Cualquier modificación del contenido o estado.

**Riesgo que controla**
- Cambios post-cierre.
- Pérdida de integridad histórica.

---

### 3.7 Cancelado

**Definición**  
El proyecto ha sido finalizado sin completar el trabajo acordado.

**Condición objetiva**
- El proyecto ha sido cancelado explícitamente por el diseñador o el cliente.

**Acciones permitidas**
- Consulta histórica del proyecto.
- Registro del motivo de cancelación.

**Acciones prohibidas**
- Cualquier modificación del proyecto.
- Reapertura del trabajo.

**Riesgo que controla**
- Confusión entre proyectos entregados y proyectos cancelados.
- Métricas incorrectas de finalización.

---

## 4. Transiciones de Estados del Proyecto

Las transiciones definen los cambios válidos entre estados.
Cualquier transición no definida explícitamente se considera inválida.

---

### 4.1 Transiciones permitidas

| Estado origen        | Evento                                      | Estado destino        |
|----------------------|---------------------------------------------|-----------------------|
| borrador             | Brief aprobado                              | en_progreso           |
| borrador             | Proyecto cancelado                          | cancelado             |
| en_progreso          | Proyecto cancelado                          | cancelado             |
| esperando_feedback   | Proyecto cancelado                          | cancelado             |
| en_progreso          | Entregable enviado a revisión               | esperando_feedback    |
| en_progreso          | Impedimento detectado                       | bloqueado             |
| esperando_feedback   | Feedback recibido y aplicado                | en_progreso           |
| esperando_feedback   | Impedimento detectado                       | bloqueado             |
| bloqueado            | Impedimento resuelto                        | en_progreso           |
| en_progreso          | Todos los entregables aprobados             | aprobado              |
| aprobado             | Cierre registrado                           | entregado             |

---

### 4.2 Transiciones explícitamente prohibidas

Las siguientes transiciones no están permitidas bajo ningún escenario normal:

- Pasar de `borrador` a `esperando_feedback`
- Pasar de `borrador` a `aprobado`
- Pasar de `borrador` a `entregado` sin cancelación explícita
- Pasar de `esperando_feedback` a `aprobado` sin volver a `en_progreso`
- Pasar de `bloqueado` a `aprobado`
- Pasar de `entregado` a cualquier otro estado
- Pasar de `cancelado` a cualquier otro estado


---

### 4.3 Reglas generales de transición

- Toda transición debe estar asociada a un evento explícito.
- No puede existir más de un estado activo por proyecto.
- Un proyecto en estado `entregado` no puede cambiar de estado.
- Un proyecto en estado `cancelado` no puede cambiar de estado.
- Cualquier intento de transición inválida debe ser rechazado por el sistema.
- Los eventos de cambio de alcance no cambian el estado por sí mismos, pero pueden bloquear el proyecto hasta ser resueltos.

---

### 4.4 Consideraciones de calidad

- Si el sistema permite una transición no definida, existe un defecto de dominio.
- Si una transición ocurre sin evento registrado, existe una pérdida de trazabilidad.
- Si el estado del proyecto no refleja la realidad operativa, el sistema está mintiendo.
