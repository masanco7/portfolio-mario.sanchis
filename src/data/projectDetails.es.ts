import type { ProjectDetail } from '../types';

/**
 * Detalle ampliado de cada proyecto (overlay). La clave del record es el
 * Project.id de la tarjeta que lo abre — un proyecto sin entrada aquí
 * simplemente no es clicable.
 */
export const projectDetails: Record<string, ProjectDetail> = {
  tallerapp: {
    id: 'tallerapp',
    title: 'TallerApp',
    subtitle: 'Sistema de gestión de taller mecánico · TFG · Nota 9',
    badges: ['Angular 21', 'NestJS 11', 'PostgreSQL'],
    hero: {
      shot: 'login',
      alt: 'Pantalla de acceso de TallerApp con el formulario de login del taller',
    },
    intro: [
      'TallerApp es mi Trabajo de Fin de Grado: una aplicación de gestión completa para un taller mecánico multimarca, construida para sostener el volumen de trabajo real de un taller pequeño-mediano, no una demo de escaparate.',
      'El núcleo diferencial es el planificador: cuando se asigna un mecánico a una orden, el sistema calcula automáticamente el siguiente hueco disponible de ese mecánico dentro del horario laboral (8-14 y 15-19, lunes a viernes) y encadena el trabajo justo detrás de su cola actual, sin solapes posibles, por diseño.',
      'Las reglas de negocio críticas están centralizadas en una capa transversal: máquinas de estados independientes para la orden de reparación y para la factura, cada una con sus propias guardas (no se factura una orden sin terminar, una factura pagada solo se anula generando rectificativa según el RD 1619/2012, y así sucesivamente). Todo el flujo importante — login, logout, altas, modificaciones, anulaciones — queda auditado con acceso restringido por rol.',
      'La capa de notificaciones combina eventos síncronos (cuando ocurre algo accionable en el momento: una orden nueva, un stock bajo, una factura emitida) con tres tareas programadas que revisan lo que no es instantáneo — facturas vencidas, órdenes sin asignar, citas sin confirmar.',
      'El proyecto está probado con 259 tests unitarios en 18 suites más 5 e2e de humo, con 12 scripts de seed dimensionados sobre estadísticas reales del sector. Estuvo desplegado en producción (VPS Ubuntu, nginx, systemd) durante la defensa, con memoria escrita en LaTeX. Nota final: 9.',
    ],
    sections: [
      {
        shot: 'login',
        alt: 'Pantalla de acceso de TallerApp con el formulario de login del taller',
        title: 'Login y autenticación',
        paragraphs: [
          'Una única pantalla de acceso para los tres roles del taller (Administrador, Jefe de Taller, Mecánico) — el rol viaja resuelto dentro de la respuesta de login y firma el JWT.',
          'La decisión técnica central: el SPA nunca toca el token. El backend fija el JWT como cookie httpOnly + sameSite=strict + secure en producción, así que ningún script del cliente puede leerlo — la protección natural frente a XSS. El interceptor solo activa withCredentials para que el navegador adjunte la cookie automáticamente, y la estrategia de autenticación acepta también un header Bearer como vía alternativa para herramientas como Swagger o curl en desarrollo.',
          'La autorización se revalida en dos capas: el guard de rutas en Angular filtra qué ve cada rol como capa de experiencia de usuario, y el backend revalida el rol en cada petición leyendo el JWT, recargando además el usuario desde base de datos para comprobar que sigue activo.',
          'Cada login exitoso y cada logout quedan auditados con IP. Los intentos fallidos no se registran de forma individual — el rate limiting (5 intentos por minuto por IP) ya contiene la fuerza bruta, así que la auditoría se centra en la actividad legítima del sistema.',
        ],
      },
      {
        shot: 'dashboard',
        alt: 'Dashboard de TallerApp con indicadores del mes y agenda semanal de citas',
        title: 'Dashboard operativo y agenda de citas',
        paragraphs: [
          'Los cuatro indicadores del panel (facturación del mes, vehículos en taller, alertas de stock, citas del día) se calculan con queries agregadas directas contra PostgreSQL en cada carga, sin capas intermedias de caché.',
          'El umbral de alerta de stock es configurable por pieza, y dispara tanto el contador del dashboard como la notificación correspondiente.',
          'La agenda semanal muestra las citas de cliente, coloreadas por estado y con acceso directo al detalle de cada una. El resultado del planificador —la fecha estimada de finalización de cada trabajo, calculada por el motor de asignación— se consulta en el detalle de cada orden de reparación, donde vive la lógica de mayor peso del proyecto.',
          'Las notificaciones combinan eventos generados en el momento (una orden nueva, stock bajo, una factura emitida) con tres tareas programadas que cubren lo que no es instantáneo: facturas vencidas, órdenes sin asignar más de tres días, y citas sin confirmar. Es un sistema separado de la auditoría: uno avisa a un humano de algo accionable, el otro deja traza forense de quién hizo qué.',
        ],
      },
      {
        shot: 'factura',
        alt: 'Detalle de una factura de TallerApp con sus líneas e importes (datos ficticios)',
        title: 'Facturación y generación de PDF (datos ficticios)',
        paragraphs: [
          'El PDF de la factura se genera en el propio cliente y se descarga directamente al equipo del usuario. El aviso por email es un documento independiente: un HTML generado en el backend con los datos clave de la factura (número, importe, fechas, IBAN), pensado para notificar sin depender de adjuntos.',
          'La máquina de estados de la factura sigue el ciclo Emitida → Pagada → Anulada, con una regla con base regulatoria: una factura pagada puede anularse generando una factura rectificativa, nunca borrándose, conforme al RD 1619/2012 sobre reversión de cobros.',
          'El vencimiento se trata como un hecho derivado de la fecha actual, no como un valor que dependa de que un proceso programado lo actualice: cada mañana, el sistema revisa las facturas emitidas cuya fecha de vencimiento ya pasó y genera el aviso correspondiente.',
          'Cada línea de factura admite un descuento porcentual, calculado y aplicado correctamente en el importe final — la base para tarifas especiales o negociaciones puntuales por cliente.',
        ],
      },
      {
        shot: 'inventario',
        alt: 'Listado de inventario de TallerApp con el semáforo de stock y el resumen de valor total',
        title: 'Inventario y trazabilidad de stock',
        paragraphs: [
          'El listado de piezas usa un semáforo de proximidad al mínimo configurado: por debajo del umbral marca alerta de stock bajo, alimentando tanto el contador del dashboard como el sistema de notificaciones, con un segundo nivel visual que anticipa qué piezas se acercan a ese punto.',
          'Cada movimiento de stock —consumo al usarse una pieza en una orden, reversión al eliminar una línea, reposición mediante el flujo de reabastecimiento— queda registrado en un histórico con tipo y motivo, lo que permite reconstruir en cualquier momento cómo se llegó al nivel actual de cada referencia.',
          'El panel resume de un vistazo el valor total del stock, el número de referencias y las piezas por debajo de mínimo, calculado sobre el catálogo cargado.',
        ],
      },
      {
        shot: 'ordenes',
        alt: 'Órdenes de reparación de TallerApp con el desplegable de asignación de mecánico abierto',
        title: 'Asignación de mecánico y motor de planificación',
        paragraphs: [
          'Este desplegable es la pieza central del planificador. Al asignar (o reasignar) un mecánico a una orden, el sistema calcula el siguiente hueco disponible de ese profesional dentro del horario laboral y encadena el nuevo trabajo justo detrás de su cola actual, sin solapes posibles por construcción. El resultado —fecha de inicio, fecha de fin y fecha estimada— se audita y genera una notificación al mecánico con su hora de inicio.',
          'La máquina de estados de la orden sigue el flujo Creada → Asignada → En Curso → Terminada → Facturada, con dos transiciones hacia atrás permitidas de forma deliberada: de Terminada a En Curso, para reabrir un trabajo si se detecta un defecto tras el cierre, y de En Curso a Asignada, para corregir una asignación. Facturada es el único estado terminal. Cuatro guardas de negocio protegen el flujo: no se factura una orden sin terminar, una orden admite una única factura, y no se modifican líneas de una orden ya cerrada.',
          'Elegir "Facturada" en el desplegable dispara la creación de la factura correspondiente, que es quien arrastra la orden a ese estado — el estado es siempre consecuencia de un hecho de negocio real, nunca un cambio directo y aislado.',
          'Los contadores (Pendientes, En Taller, Terminadas) y los filtros por estado, mecánico y cliente se resuelven sobre los datos ya cargados en el cliente, con signals encadenados — filtrado instantáneo, sin ida y vuelta al servidor.',
        ],
      },
      {
        shot: 'modo-oscuro',
        alt: 'TallerApp en tema oscuro mostrando el panel de auditoría del sistema',
        title: 'Tema oscuro y auditoría del sistema',
        paragraphs: [
          'El modo oscuro combina PrimeNG y un conjunto de variables CSS propias bajo un único punto de conmutación: una clase en el elemento raíz que ambos sistemas consumen a la vez, evitando duplicar la lógica de tema entre la librería de componentes y los estilos propios. El calendario del dashboard, al depender de una librería externa con su propio sistema visual, observa ese cambio de clase para mantenerse sincronizado con el resto de la interfaz.',
          'El panel de auditoría es de solo lectura: no existe ninguna ruta de escritura sobre esa tabla en toda la aplicación, y el acceso está restringido a Administrador y Jefe de Taller mediante guardas de rol reforzadas en el backend. Cada registro asocia fecha, usuario, acción y entidad afectada, dejando una traza clara de quién hizo qué y cuándo — login, logout, altas, modificaciones y anulaciones quedan todos cubiertos.',
        ],
      },
    ],
    stackFull:
      'Angular 21 con PrimeNG, FullCalendar, Chart.js y jsPDF · NestJS 11 con TypeORM, PostgreSQL, JWT + Passport + bcrypt · Docker Compose · Vitest y Jest',
    // TODO: el repo showcase de TallerApp aún no existe. Cuando esté publicado,
    // descomentar y el enlace aparece solo en el pie del modal:
    // repo: { label: 'Ver repo showcase', href: 'https://github.com/masanco7/...' },
  },

  'gym-tracker': {
    id: 'gym-tracker',
    title: 'Gym Tracker',
    subtitle: 'PWA de entrenamiento personal · En producción desde abril 2026',
    badges: ['Angular 21', 'FastAPI', 'WebAuthn'],
    // Portada de la tarjeta: la pantalla Hoy, que es la que se usa a diario.
    hero: {
      shot: 'hoy',
      alt: 'Pantalla Hoy de Gym Tracker con la rutina del día y las series en curso',
    },
    intro: [
      'Gym Tracker es mi cuaderno de entrenamiento personal, una PWA que uso a diario desde abril de 2026. Nace de una necesidad concreta: llevar el registro de mis rutinas con control total sobre cómo se calcula el progreso y las progresiones, sin depender de una app genérica.',
      'El corazón del proyecto es un motor de progresión determinista: doble progresión cíclica alrededor de un objetivo de repeticiones por rutina, que decide automáticamente cuándo toca subir repeticiones y cuándo subir peso, trabajando sobre el historial completo de cada ejercicio. Un modelo de lenguaje local (Ollama) se limita a redactar el resumen en lenguaje natural — la decisión de progresión nunca depende del LLM.',
      'El acceso es completamente sin contraseña en el día a día: passkeys (WebAuthn) verificados en el propio servidor, con Face ID como el gesto de desbloqueo del dispositivo. El descanso entre series se avisa con notificaciones push reales, que llegan aunque el móvil esté bloqueado y la app cerrada. Y las gráficas de progreso están dibujadas a mano en SVG, sin ninguna librería de gráficos de por medio.',
      'Construida con Angular 21 zoneless y signals en el frontend, FastAPI en el backend, y persistencia en JSON y CSV con escritura atómica.',
    ],
    sections: [
      {
        shot: 'login',
        alt: 'Pantalla de acceso de Gym Tracker en escritorio, con acceso por Face ID y formulario de usuario',
        phoneShot: {
          shot: 'login-phone',
          alt: 'La misma pantalla de acceso de Gym Tracker en la PWA instalada en el móvil',
        },
        title: 'Login y passkeys',
        paragraphs: [
          'El acceso del día a día no usa contraseña: es un passkey estándar (WebAuthn), con Face ID como el gesto que desbloquea la credencial en el propio dispositivo. La verificación ocurre directamente en el servidor, sin ningún servicio intermedio — el backend valida el assertion criptográfico con la librería estándar de WebAuthn en Python.',
          'El registro de un passkey nuevo se hace desde Perfil, cada dispositivo con su propia credencial, lo que permite tener el móvil y el portátil dados de alta por separado. El formulario de usuario y contraseña convive siempre como vía alternativa, por si el dispositivo no soporta biometría o simplemente se prefiere ese camino.',
        ],
      },
      {
        shot: 'hoy',
        alt: 'Pantalla Hoy de Gym Tracker con la rutina del día y las series en curso',
        title: 'Hoy y autosave',
        paragraphs: [
          'La rutina del día se resuelve sola: el sistema consulta el planificador semanal (el mismo que se edita en Rutinas) y muestra directamente la sesión que toca, sin que haya que buscarla.',
          'Mientras se entrena, el progreso se guarda localmente en el dispositivo de forma continua — cada peso y repetición introducidos, cada serie completada. Cerrar la aplicación a mitad de sesión no supone perder nada: al reabrir, la sesión se restaura completa, incluido el temporizador de descanso, que recalcula el tiempo restante contra el reloj real en vez de depender de un contador que se hubiera quedado corriendo en segundo plano. El registro de un nuevo récord personal se calcula al cerrar la sesión, comparando los máximos conseguidos contra todo el historial. La aplicación funciona sin conexión: si el envío al servidor falla, la sesión queda encolada y se sincroniza en cuanto vuelve a haber red.',
        ],
      },
      {
        shot: 'historial',
        alt: 'Historial de sesiones de Gym Tracker agrupadas por mes, con tonelaje y récords',
        title: 'Historial',
        paragraphs: [
          'Cada sesión queda registrada con su tonelaje total movido — la suma de peso por repetición de cada serie completada — y los récords personales conseguidos ese día, agrupadas visualmente por mes. Las sesiones de cardio (como caminar) comparten el mismo modelo de datos que las de fuerza, distinguidas simplemente por su tipo de ejercicio, lo que mantiene todo el historial en un único sitio coherente.',
        ],
      },
      {
        shot: 'rutinas',
        alt: 'Catálogo de rutinas de Gym Tracker con el planificador semanal por días',
        title: 'Rutinas y planificador semanal',
        paragraphs: [
          'El catálogo de rutinas admite superseries reales: dos ejercicios enlazados donde el descanso no arranca hasta que ambos completan la serie correspondiente, tal y como se entrena de verdad una superserie en el gimnasio. Cada rutina se asigna a uno o varios días de la semana desde un planificador simple, y ese mapeo es exactamente lo que la pantalla Hoy consulta para saber qué toca cada día.',
          'El calentamiento vive como su propio checklist, independiente de las rutinas de fuerza, accesible en cualquier momento desde un acceso directo.',
        ],
      },
      {
        shot: 'ejercicios',
        alt: 'Catálogo de ejercicios de Gym Tracker agrupados por grupo muscular',
        title: 'Catálogo de ejercicios',
        paragraphs: [
          'El catálogo parte de un conjunto base y crece con ejercicios propios en cualquier momento, cada uno definido por su nombre, su grupo muscular y su tipo (de peso y repeticiones, o de tiempo). En cuanto un ejercicio acumula algún registro en el historial, aparece automáticamente disponible en la pantalla de Progreso, sin ningún paso de configuración adicional.',
        ],
      },
      {
        shot: 'coach',
        alt: 'Pantalla Coach de Gym Tracker con las recomendaciones de progresión por ejercicio',
        title: 'Coach: progresión automática',
        paragraphs: [
          'Un único botón dispara un análisis completo del historial de entrenamiento. La lógica que decide qué progresar es enteramente determinista: doble progresión cíclica alrededor de un objetivo de repeticiones por ejercicio — si no se ha alcanzado el tope, sugiere subir repeticiones; si el tope se sostiene varias sesiones, sugiere subir peso y volver a empezar el ciclo desde la base. Los ejercicios de tiempo siguen su propia progresión hacia el objetivo de duración.',
          'Un modelo de lenguaje ejecutado en local (Ollama) redacta el resumen en lenguaje natural que acompaña a las recomendaciones — su única función es la redacción; la decisión de progresión ya está tomada antes de que el modelo intervenga, lo que mantiene el sistema fiable incluso si el modelo de lenguaje no está disponible en ese momento.',
        ],
      },
      {
        shot: 'progreso',
        alt: 'Gráfica de progreso de Gym Tracker dibujada en SVG, con récord, actual e inicio',
        title: 'Progreso: gráficas dibujadas a mano',
        paragraphs: [
          'Las gráficas de evolución están construidas en SVG puro, sin ninguna librería de visualización de por medio — una decisión deliberada frente a alternativas mucho más pesadas para lo que realmente hace falta mostrar: una línea de progreso, un récord y el punto actual. Cada gráfica escala automáticamente el rango de valores, mantiene el grosor de línea constante independientemente del tamaño de pantalla, y responde al tacto o al cursor con un punto que señala el valor exacto en cualquier semana.',
          'El eje temporal se construye por semanas naturales, mostrando la evolución reciente de cada ejercicio seleccionado, con la unidad de medida (kilos, segundos o minutos) eligiéndose sola según el tipo de ejercicio.',
        ],
      },
      {
        shot: 'perfil',
        alt: 'Perfil de Gym Tracker con estadísticas globales, aviso de descanso y gestión de Face ID',
        title: 'Perfil: estadísticas y aviso de descanso',
        paragraphs: [
          'El resumen global agrupa sesiones totales, tonelaje acumulado y récords conseguidos. El aviso de descanso usa notificaciones push reales del sistema operativo — no una alerta dentro de la propia pestaña — por lo que llega aunque el móvil esté bloqueado o la aplicación cerrada, con una señal sonora propia diseñada para ser audible en el altavoz de un móvil incluso en modo silencio, además de vibración.',
          'Desde aquí también se gestionan los passkeys registrados y se activa el modo oscuro, que se mantiene entre sesiones sin necesidad de volver a configurarlo cada vez.',
        ],
      },
    ],
    stackFull:
      'Angular 21 zoneless con signals y standalone · TypeScript · Service Worker/PWA · Web Push + Web Audio API · WebAuthn/passkeys · Python 3.12 + FastAPI · Pydantic · filelock · persistencia CSV/JSON atómica · Ollama',
    // TODO: el repo showcase de Gym Tracker aún no existe (el repo real es privado).
    // Cuando esté publicado, descomentar y el enlace aparece solo en el pie del modal:
    // repo: { label: 'Ver repo showcase', href: 'https://github.com/masanco7/...' },
  },
};
