/**
 * Orbital Spanish Language Pack v1
 *
 * INVARIANT: Capacity → Capacidad (primary) | Capacidad disponible (alternate)
 *
 * This is a standards implementation, not a translation exercise.
 * All terms follow the approved Spanish Capacity Standard.
 *
 * PROHIBITED TERMS (never use):
 * - Energía (Energy)
 * - Chequeo (Check-in)
 * - Rastreo (Tracking)
 * - Bienestar (Wellness)
 * - Agotamiento (Burnout)
 * - Síntomas (Symptoms)
 * - Salud mental (Mental health)
 */

export const es = {
  // ============================================
  // CORE TERMS (Canonical - Do Not Modify)
  // ============================================
  core: {
    capacity: 'Capacidad',
    capacityAlternate: 'Capacidad disponible',
    today: 'Hoy',
    baseline: 'Línea base',
    trend: 'Tendencia',
    signals: 'Señales',
    patterns: 'Patrones',
    nonDiagnostic: 'Sin valor diagnóstico',
  },

  // ============================================
  // CAPACITY STATES
  // ============================================
  states: {
    resourced: 'Capacidad alta',
    stretched: 'Estable',
    depleted: 'Reducida',
  },

  // ============================================
  // CATEGORIES (Capacity Drivers)
  // ============================================
  categories: {
    sensory: 'Sensorial',
    demand: 'Demanda',
    social: 'Social',
  },

  // ============================================
  // HOME SCREEN
  // ============================================
  home: {
    title: 'Estado de capacidad actual',
    adjustPrompt: 'Ajusta para reflejar tu capacidad actual',
    driversLabel: 'Factores de capacidad (opcional)',
    addDetails: 'Agregar detalles (opcional)',
    spectrum: {
      high: 'ALTA',
      low: 'REDUCIDA',
    },
  },

  // ============================================
  // PATTERNS SCREEN
  // ============================================
  patterns: {
    // Locked state
    lockedTitle: 'Los patrones se activan con 7 señales',
    lockedBody: 'Registra cuando tenga sentido—sin rachas, sin presión.',
    lockedProgress: '{count} de 7 registradas',

    // Chart context
    chartContext: 'Capacidad a lo largo del tiempo — normalizada, sin valor diagnóstico',

    // Stats
    statsBaseline: 'Línea base',
    statsTrend: 'Tendencia',
    statsDepleted: 'Reducida',

    // Category breakdown
    categoryTitle: 'Atribución de factores de capacidad',
    correlation: 'correlación',
    noData: 'sin datos',

    // Intelligence section
    intelligenceTitle: 'Inteligencia de capacidad',
    trajectoryDeclining: 'Capacidad en descenso esta semana',
    trajectoryImproving: 'Capacidad en ascenso esta semana',
    trajectoryStable: 'Capacidad estable esta semana',
    comparedToPrevious: 'Comparado con la semana anterior',
    showsPattern: 'muestra un patrón consistente',
    correlationWith: 'correlación con capacidad reducida',
    focusOn: 'Enfócate en gestionar la carga de {category}',
    continueTracking: 'Continúa registrando para desarrollar perspectivas personalizadas',

    // Days
    days: {
      sunday: 'Domingos',
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábados',
    },

    // Time periods
    timePeriods: {
      morning: 'Mañana',
      afternoon: 'Tarde',
      evening: 'Noche',
    },

    // Longitudinal note
    longitudinalNote: 'Los patrones mejoran con la recolección continua de señales',
  },

  // ============================================
  // SETTINGS SCREEN
  // ============================================
  settings: {
    dataSection: 'DATOS',
    preferencesSection: 'PREFERENCIAS',
    language: 'Idioma',
    languageSublabel: 'Idioma de la aplicación',
    exportData: 'Exportar datos',
    exportSublabel: '{count} registros',
    generateData: 'Generar datos de demostración',
    generateSublabel: '6 meses de registros de muestra',
    clearData: 'Eliminar todos los datos',
    clearSublabel: 'Borrar todo',

    // Alerts
    noData: 'Sin datos',
    noDataMessage: 'No hay datos para exportar.',
    noDataToClear: 'No hay datos para eliminar.',
    clearConfirmTitle: 'Eliminar todos los datos',
    clearConfirmMessage: 'Esto eliminará permanentemente {count} registros. Esta acción no se puede deshacer.',
    cancel: 'Cancelar',
    deleteAll: 'Eliminar todo',

    // About section
    aboutSection: 'ACERCA DE',
    appName: 'Orbital',
    tagline: 'Inteligencia de capacidad longitudinal',
  },

  // ============================================
  // FAMILY / SHARED VIEWS
  // ============================================
  family: {
    sharedView: 'Vista compartida — solo lectura',
    recordedBy: 'Capacidad registrada por {name}',
  },

  // ============================================
  // TIME LABELS
  // ============================================
  time: {
    today: 'Hoy',
    yesterday: 'Ayer',
    ranges: {
      '7d': '7D',
      '14d': '14D',
      '1m': '1M',
      '90d': '90D',
      '1y': '1A',
    },
  },

  // ============================================
  // UNLOCK TIERS
  // ============================================
  unlockTiers: {
    week: {
      label: 'Vista semanal',
      toast: 'Vista semanal activada',
      body: 'Has registrado suficiente para ver tus primeros patrones. Esto es solo el comienzo—los patrones se agudizan con el tiempo.',
    },
    twoWeek: {
      label: 'Vista de dos semanas',
      toast: 'Vista de dos semanas activada',
      body: 'La detección de tendencias está activa. Puedes empezar a ver en qué dirección se mueve tu capacidad.',
    },
    month: {
      label: 'Vista mensual',
      toast: 'Vista mensual activada',
      body: 'La atribución por categoría está disponible. Observa qué factores—sensorial, demanda, social—se correlacionan con tus cambios de capacidad.',
    },
    quarter: {
      label: 'Vista trimestral',
      toast: 'Vista trimestral activada',
      body: 'La inteligencia de patrones está activa. Orbital puede mostrar patrones por día de la semana y hora del día basados en tu historial.',
    },
    year: {
      label: 'Vista anual',
      toast: 'Historial de 1 año activado',
      body: 'Has construido un año completo de datos longitudinales de capacidad. Esto es poco común. Esto es tuyo. Los patrones a esta profundidad revelan lo que el seguimiento a corto plazo nunca podría.',
    },
  },

  // ============================================
  // COMMON UI
  // ============================================
  common: {
    done: 'Listo',
    save: 'Guardar',
    close: 'Cerrar',
    back: 'Atrás',
  },

  // ============================================
  // EXPORT
  // ============================================
  export: {
    title: 'Opciones de exportación',
    ninetyDaySummary: 'Resumen de 90 días',
    ninetyDaySublabel: 'Resumen de patrones recientes',
    annualOverview: 'Resumen anual',
    annualSublabel: 'Resumen de capacidad del año completo',
    fullJson: 'Datos completos (JSON)',
    fullJsonSublabel: 'Respaldo completo, legible por máquinas',
    fullCsv: 'Datos completos (CSV)',
    fullCsvSublabel: 'Formato compatible con hojas de cálculo',
    disclaimer: 'Sin valor diagnóstico. Datos de capacidad autorreportados normalizados.',
    noData: 'No hay datos disponibles para este rango',
    exportSuccess: 'Exportación lista',
  },

  // ============================================
  // SHARING
  // ============================================
  sharing: {
    title: 'Compartir',
    subtitle: 'Otorgar acceso temporal de solo lectura',
    addRecipient: 'Agregar destinatario',
    recipientsSection: 'DESTINATARIOS',
    noRecipients: 'No hay destinatarios agregados',
    recipientTypes: {
      parent: 'Padre / Cuidador',
      clinician: 'Profesional de salud',
      employer: 'Empleador',
      school: 'Escuela',
      partner: 'Pareja',
      other: 'Otro',
    },
    duration: {
      7: '7 días',
      14: '14 días',
      30: '30 días',
      90: '90 días',
    },
    durationLabel: 'Duración del acceso',
    createShare: 'Crear enlace de acceso',
    shareCreated: 'Enlace de acceso creado',
    copyLink: 'Copiar enlace',
    linkCopied: 'Enlace copiado',
    revokeShare: 'Revocar acceso',
    revokeConfirmTitle: 'Revocar acceso',
    revokeConfirmMessage: 'Esto terminará inmediatamente el acceso para este destinatario.',
    deleteRecipientTitle: 'Eliminar destinatario',
    deleteRecipientMessage: 'Esto también revocará cualquier acceso activo.',
    auditSection: 'REGISTRO DE ACTIVIDAD',
    noAuditEntries: 'Sin actividad registrada',
    auditActions: {
      share_created: 'Compartido con',
      share_expired: 'Acceso expirado para',
      share_revoked: 'Acceso revocado para',
      share_accessed: 'Visto por',
      export_generated: 'Exportación generada',
    },
    readOnlyBanner: 'Vista compartida (solo lectura)',
    privateLabel: 'Privado para ti',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
  },

  // ============================================
  // DISCLAIMER (Institutional contexts)
  // ============================================
  disclaimer: {
    short: 'Sin valor diagnóstico',
    full: 'Esta herramienta registra capacidad funcional autorreportada. No constituye evaluación clínica ni diagnóstico.',
    dataDescription: 'Señales de capacidad normalizadas a lo largo del tiempo.',
    purpose: 'Registro longitudinal de capacidad disponible para uso personal o compartido.',
  },

  // ============================================
  // ENTERPRISE FEATURES
  // ============================================
  enterprise: {
    executiveReports: 'Informes Ejecutivos',
    quarterlyReport: 'Informe Trimestral',
    quarterlyReportSublabel: 'Resumen ejecutivo de 90 días',
    annualReport: 'Informe Anual',
    annualReportSublabel: 'Resumen ejecutivo del año completo',
    historyVault: 'Archivo Histórico',
    historyVaultSublabel: 'Retención de datos de capacidad a largo plazo',
    totalHistory: '{years} años de datos',
    sensoryAlerts: 'Alertas Sensoriales',
    sensoryAlertsSublabel: 'Monitoreo de carga ambiental',
    noiseLevel: 'Nivel de ruido actual',
    noiseThreshold: 'Umbral de alerta',
    quietHours: 'Horas de silencio',
    monitoringActive: 'Monitoreo activo',
    monitoringInactive: 'Monitoreo inactivo',
    institutionalTier: {
      personal: 'Personal',
      family: 'Familia',
      pilot: 'Piloto',
      enterprise: 'Empresarial',
    },
  },

  // ============================================
  // GOVERNANCE & COMPLIANCE
  // ============================================
  governance: {
    legal: 'Legal y Políticas',
    legalSublabel: 'Términos, privacidad, avisos',
    consent: 'Gestión de Consentimiento',
    consentSublabel: 'Revise y administre sus consentimientos',
    dataRights: 'Sus Derechos de Datos',
    dataRightsSublabel: 'Acceda, exporte o elimine sus datos',
    auditLog: 'Registro de Actividad',
    auditLogSublabel: 'Ver historial de acceso y compartición',
    policies: {
      termsOfService: 'Términos de Servicio',
      privacyPolicy: 'Política de Privacidad',
      dataRetention: 'Política de Retención de Datos',
      cancellationRefund: 'Política de Cancelación y Reembolso',
      nonDiagnostic: 'Aviso de No Diagnóstico',
      jurisdiction: 'Jurisdicción y Ley Aplicable',
    },
    consentDetails: {
      dataCollection: 'Recopilación de Datos',
      dataProcessing: 'Procesamiento de Datos',
      dataSharing: 'Compartición de Datos',
      dataExport: 'Exportación de Datos',
      institutionalAccess: 'Acceso Institucional',
      granted: 'Otorgado',
      revoked: 'Revocado',
      expired: 'Expirado',
      grantConsent: 'Otorgar Consentimiento',
      revokeConsent: 'Revocar Consentimiento',
    },
    offboarding: {
      title: 'Terminación de Cuenta',
      subtitle: 'Cierre su cuenta y elimine datos',
      initiateButton: 'Iniciar Proceso de Terminación',
      exportWindow: 'Ventana de Exportación',
      daysRemaining: '{days} días restantes',
      scheduledDeletion: 'Eliminación programada',
      cancelOffboarding: 'Cancelar Terminación',
      confirmationRequired: 'Confirmación requerida',
    },
    disclosure: {
      title: 'Divulgaciones',
      noDisclosures: 'Sin divulgaciones activas',
      acknowledge: 'Reconocer',
      acknowledged: 'Reconocido',
    },
  },

  // ============================================
  // ACCESSIBILITY
  // ============================================
  accessibility: {
    title: 'Accesibilidad',
    subtitle: 'Personaliza tu experiencia',

    // Simple Mode (quick toggle for max accessibility)
    simpleMode: 'Modo Simple',
    simpleModeDesc: 'Máxima accesibilidad con un toque',

    // Sections
    visualSection: 'VISUAL',
    motorSection: 'MOTOR Y ENTRADA',
    cognitiveSection: 'COGNITIVO',
    audioSection: 'AUDIO',
    dataSection: 'DATOS Y CONECTIVIDAD',

    // Visual settings
    highContrast: 'Alto Contraste',
    highContrastDesc: 'Aumentar contraste para mejor visibilidad',
    colorBlindMode: 'Visión del Color',
    colorBlindModeDesc: 'Optimizar colores para daltonismo',
    colorBlindOptions: {
      none: 'Predeterminado',
      protanopia: 'Protanopía (Rojo débil)',
      deuteranopia: 'Deuteranopía (Verde débil)',
      tritanopia: 'Tritanopía (Azul débil)',
      monochrome: 'Monocromático',
    },
    textSize: 'Tamaño del Texto',
    textSizeDesc: 'Ajustar tamaño del texto en la aplicación',
    textSizeOptions: {
      default: 'Predeterminado',
      large: 'Grande',
      xlarge: 'Extra Grande',
    },
    reduceMotion: 'Reducir Movimiento',
    reduceMotionDesc: 'Minimizar animaciones',

    // Motor settings
    bigButtonMode: 'Botones Grandes',
    bigButtonModeDesc: 'Botones más grandes, más fáciles de tocar',
    buttonSize: 'Tamaño de Botones',
    buttonSizeOptions: {
      default: 'Predeterminado',
      large: 'Grande',
      xlarge: 'Extra Grande',
    },
    oneHandedMode: 'Modo Una Mano',
    oneHandedModeDesc: 'Optimizar diseño para uso con una mano',
    oneHandedOptions: {
      off: 'Desactivado',
      left: 'Mano Izquierda',
      right: 'Mano Derecha',
    },

    // Haptics
    hapticFeedback: 'Retroalimentación Háptica',
    hapticFeedbackDesc: 'Sentir confirmaciones y alertas',
    hapticIntensity: 'Intensidad Háptica',
    hapticIntensityOptions: {
      off: 'Desactivado',
      light: 'Suave',
      medium: 'Medio',
      strong: 'Fuerte',
    },

    // Cognitive
    simplifiedText: 'Texto Simplificado',
    simplifiedTextDesc: 'Usar lenguaje más corto y simple',
    confirmActions: 'Confirmar Acciones',
    confirmActionsDesc: 'Mostrar "¿Estás seguro?" antes de cambios',
    undoEnabled: 'Activar Deshacer',
    undoEnabledDesc: 'Permitir deshacer acciones recientes',
    showTooltips: 'Mostrar Consejos',
    showTooltipsDesc: 'Mostrar consejos útiles',

    // Voice
    voiceControl: 'Control por Voz',
    voiceControlDesc: 'Controlar con comandos de voz',
    dictation: 'Dictado',
    dictationDesc: 'Hablar para agregar notas',

    // Captions
    liveCaptions: 'Subtítulos en Vivo',
    liveCaptionsDesc: 'Mostrar subtítulos para audio',

    // Data
    offlineMode: 'Modo Sin Conexión',
    offlineModeDesc: 'Trabajar sin conexión a internet',
    lowDataMode: 'Modo Bajo Consumo',
    lowDataModeDesc: 'Reducir uso de datos',

    // Undo
    undoToast: 'Acción deshecha',
    undoAvailable: 'Toca para deshacer',
    undoExpired: 'Deshacer expirado',

    // Guided setup
    guidedSetup: 'Asistente de Configuración',
    guidedSetupDesc: 'Obtener ayuda para configurar la aplicación',
    guidedSetupCompleted: 'Configuración completada',
    startSetup: 'Iniciar Configuración',

    // Simplified text variants
    simplified: {
      home: {
        title: '¿Cómo estás?',
        adjustPrompt: 'Mueve el control',
        spectrum: {
          high: 'BIEN',
          low: 'BAJO',
        },
      },
      states: {
        resourced: 'Bien',
        stretched: 'OK',
        depleted: 'Bajo',
      },
    },
  },

  // ============================================
  // TEAM MODE (Enterprise Capacity Pulse)
  // ============================================
  teamMode: {
    title: 'Modo Equipo',
    subtitle: 'Pulso de capacidad en el lugar de trabajo (opcional)',
    joinTeam: 'Unirse al Equipo',
    leaveTeam: 'Dejar el Equipo',
    teamCode: 'Código de Equipo',
    teamCodePlaceholder: 'Ingresa el código de equipo',
    teamCodeInvalid: 'Código de equipo inválido',
    noTeam: 'No eres parte de un equipo',
    noTeamDesc: 'Ingresa un código de equipo para unirte al pulso de tu lugar de trabajo',
    joinSuccess: 'Te uniste al equipo exitosamente',
    leaveSuccess: 'Dejaste el equipo exitosamente',
    leaveConfirmTitle: 'Dejar el Equipo',
    leaveConfirmMessage: 'Puedes volver a unirte en cualquier momento con el código de equipo.',

    // Privacy banner
    privacyBanner: 'Tus datos individuales nunca se comparten. Solo los datos agregados del equipo son visibles.',

    // Threshold warning
    thresholdWarning: 'El equipo necesita al menos {min} participantes para mostrar datos agregados',
    participantCount: '{count} participantes',

    // Aggregate display
    aggregateTitle: 'Pulso de Capacidad del Equipo',
    capacityDistribution: 'Distribución de Capacidad',
    plenty: 'Abundante',
    elevated: 'Elevado',
    nearLimit: 'Cerca del Límite',
    topDrivers: 'Principales Factores',
    weeklyTrend: 'Tendencia Semanal',
    trendImproving: 'Mejorando',
    trendStable: 'Estable',
    trendDeclining: 'Declinando',
    participationConfidence: 'Confianza de Datos',
    confidenceHigh: 'Alta',
    confidenceMedium: 'Media',
    confidenceLow: 'Baja',
    totalSignals: '{count} señales este período',

    // Action panel
    actionPanelTitle: 'Acciones Sugeridas',
    noSuggestions: 'Sin sugerencias en este momento',
  },

  // ============================================
  // SCHOOL ZONE (Student/Caregiver/Educator)
  // ============================================
  schoolZone: {
    title: 'Zona Escolar',
    subtitle: 'Apoyo de capacidad para entornos educativos',
    joinSchool: 'Unirse a la Escuela',
    leaveSchool: 'Dejar la Escuela',
    schoolCode: 'Código de Escuela',
    schoolCodePlaceholder: 'Ingresa el código de escuela',
    schoolCodeInvalid: 'Código de escuela inválido',
    noSchool: 'No estás inscrito en una zona escolar',
    noSchoolDesc: 'Ingresa un código de escuela para acceder a las funciones escolares',
    joinSuccess: 'Te uniste a la zona escolar exitosamente',
    leaveSuccess: 'Dejaste la zona escolar exitosamente',
    leaveConfirmTitle: 'Dejar la Zona Escolar',
    leaveConfirmMessage: 'Puedes volver a unirte en cualquier momento con el código de escuela.',

    // Role selection
    roleLabel: 'Soy un/a',
    roleStudent: 'Estudiante',
    roleCaregiver: 'Cuidador',
    roleEducator: 'Educador',

    // Privacy banner
    privacyBanner: 'Los datos individuales de estudiantes nunca se comparten con educadores. Solo los datos agregados de la clase son visibles.',

    // Threshold warning
    thresholdWarning: 'La clase necesita al menos {min} estudiantes para mostrar datos agregados',
    studentCount: '{count} estudiantes',

    // Student view
    studentViewTitle: 'Tu Capacidad',
    studentViewDesc: 'Registra tu capacidad para ayudarte y recibir apoyo',
    goToLog: 'Registrar Ahora',

    // Caregiver view
    caregiverViewTitle: 'Tarjeta de Resumen Escolar',
    caregiverViewDesc: 'Genera un resumen para compartir con educadores',
    generateCard: 'Generar Tarjeta de Resumen',
    shareCard: 'Compartir Tarjeta',
    cardDateRange: 'Período: {start} a {end}',
    cardCapacityTrend: 'Tendencia de Capacidad',
    cardAverageCapacity: 'Capacidad Promedio',
    cardCommonDrivers: 'Factores Comunes',
    cardWhatHelps: 'Qué Ayuda',
    cardWhatDrains: 'Qué Drena',
    cardEntriesCount: '{count} entradas en el período',
    notesExcluded: 'Notas personales excluidas por privacidad',

    // Educator view
    educatorViewTitle: 'Vista General de Capacidad de la Clase',
    educatorViewDesc: 'Vista agregada de patrones de capacidad de la clase',
    classCapacity: 'Distribución de Capacidad de la Clase',
    classDrivers: 'Factores de la Clase',
    classConfidence: 'Confianza de Datos',

    // Environment factors (School Summary Card)
    envFactors: {
      quiet_space: 'Espacio tranquilo',
      sensory_tools: 'Herramientas sensoriales',
      movement_breaks: 'Pausas de movimiento',
      extra_time: 'Tiempo extra',
      small_groups: 'Grupos pequeños',
      check_ins: 'Consultas',
      loud_environment: 'Ambiente ruidoso',
      bright_lights: 'Luces brillantes',
      time_pressure: 'Presión de tiempo',
      multiple_instructions: 'Múltiples instrucciones',
      crowded_spaces: 'Espacios abarrotados',
      social_demands: 'Demandas sociales',
    },
  },

  // ============================================
  // DEMO MODE
  // ============================================
  demo: {
    advancedSection: 'AVANZADO',
    demoMode: 'Modo Demo',
    demoModeDesc: 'Cargar datos de muestra para capturas y demos',
    demoModeActive: 'El modo demo está activo',
    demoModeActiveDesc: 'Usando datos de muestra. Tus datos reales están guardados.',
    enableDemo: 'Activar Modo Demo',
    disableDemo: 'Salir del Modo Demo',
    reseedData: 'Generar Nuevos Datos',
    reseedDataDesc: 'Crear nuevo conjunto de datos demo',
    clearDemoData: 'Borrar Datos Demo',
    clearDemoDataDesc: 'Reiniciar a estado vacío',
    duration: {
      '30d': '1 Mes',
      '90d': '3 Meses',
      '180d': '6 Meses',
      '365d': '1 Año',
      '3y': '3 Años',
      '5y': '5 Años',
      '10y': '10 Años',
    },
    durationLabel: 'Rango de Datos',
    unlockHint: 'Toca el logo 5 veces para desbloquear ajustes avanzados',
    advancedUnlocked: 'Ajustes avanzados desbloqueados',
    confirmEnable: '¿Activar Modo Demo?',
    confirmEnableMessage: 'Tus datos reales se guardarán de forma segura y se reemplazarán con datos de muestra.',
    confirmDisable: '¿Salir del Modo Demo?',
    confirmDisableMessage: 'Los datos demo se eliminarán y tus datos reales serán restaurados.',
    dataRestored: 'Datos reales restaurados',
    demoEnabled: 'Modo demo activado',
    demoBanner: 'DEMO',
    processing: 'Procesando...',
  },
} as const;

export type TranslationKeys = typeof es;
