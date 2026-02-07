/**
 * Orbital Italian Language Pack v1
 *
 * INVARIANT: Capacity → Capacità (primary) | Capacità disponibile (alternate)
 *
 * This is a standards implementation, not a translation exercise.
 * All terms follow the approved Italian Capacity Standard.
 *
 * PROHIBITED TERMS (never use):
 * - Energia (Energy)
 * - Benessere (Wellness)
 * - Esaurimento (Burnout)
 * - Sintomi (Symptoms)
 * - Salute mentale (Mental health)
 */

export const it = {
  // ============================================
  // CORE TERMS (Canonical - Do Not Modify)
  // ============================================
  core: {
    capacity: 'Capacità',
    capacityAlternate: 'Capacità disponibile',
    today: 'Oggi',
    baseline: 'Riferimento',
    trend: 'Tendenza',
    signals: 'Segnali',
    patterns: 'Schemi',
    nonDiagnostic: 'Non diagnostico',
  },

  // ============================================
  // CAPACITY STATES
  // ============================================
  states: {
    resourced: 'Capacità elevata',
    stretched: 'Stabile',
    depleted: 'Ridotta',
  },

  // ============================================
  // CATEGORIES (Capacity Drivers)
  // ============================================
  categories: {
    sensory: 'Sensoriale',
    demand: 'Richiesta',
    social: 'Sociale',
  },

  // ============================================
  // HOME SCREEN
  // ============================================
  home: {
    title: 'Stato di capacità attuale',
    adjustPrompt: 'Regola per riflettere la tua capacità attuale',
    driversLabel: 'Fattori di capacità (facoltativo)',
    addDetails: 'Aggiungi dettagli (facoltativo)',
    spectrum: {
      high: 'ELEVATA',
      low: 'RIDOTTA',
    },
  },

  // ============================================
  // PATTERNS SCREEN
  // ============================================
  patterns: {
    // Locked state
    lockedTitle: 'Gli schemi si sbloccano a 7 segnali',
    lockedBody: 'Registra quando è importante—nessuna serie, nessuna pressione.',
    lockedProgress: '{count} di 7 registrati',

    // Chart context
    chartContext: 'Capacità nel tempo — normalizzata, non diagnostica',

    // Stats
    statsBaseline: 'Riferimento',
    statsTrend: 'Tendenza',
    statsDepleted: 'Ridotta',

    // Category breakdown
    categoryTitle: 'Attribuzione dei fattori di capacità',
    correlation: 'correlazione',
    noData: 'nessun dato',

    // Intelligence section
    intelligenceTitle: 'Intelligenza della capacità',
    trajectoryDeclining: 'Capacità in calo questa settimana',
    trajectoryImproving: 'Capacità in aumento questa settimana',
    trajectoryStable: 'Capacità stabile questa settimana',
    comparedToPrevious: 'Rispetto alla settimana precedente',
    showsPattern: 'mostra uno schema coerente',
    correlationWith: 'correlazione con capacità ridotta',
    focusOn: 'Concentrati sulla gestione del carico {category}',
    continueTracking: 'Continua a registrare per sviluppare insight personalizzati',

    // Days
    days: {
      sunday: 'Domeniche',
      monday: 'Lunedì',
      tuesday: 'Martedì',
      wednesday: 'Mercoledì',
      thursday: 'Giovedì',
      friday: 'Venerdì',
      saturday: 'Sabati',
    },

    // Time periods
    timePeriods: {
      morning: 'Mattina',
      afternoon: 'Pomeriggio',
      evening: 'Sera',
    },

    // Longitudinal note
    longitudinalNote: 'Gli schemi migliorano con la raccolta continua di segnali',
  },

  // ============================================
  // SETTINGS SCREEN
  // ============================================
  settings: {
    dataSection: 'DATI',
    preferencesSection: 'PREFERENZE',
    language: 'Lingua',
    languageSublabel: "Lingua di visualizzazione dell'app",
    exportData: 'Esporta dati',
    exportSublabel: '{count} voci',
    generateData: 'Genera dati dimostrativi',
    generateSublabel: '6 mesi di voci di esempio',
    clearData: 'Cancella tutti i dati',
    clearSublabel: 'Elimina tutto',

    // Alerts
    noData: 'Nessun dato',
    noDataMessage: 'Non ci sono dati da esportare.',
    noDataToClear: 'Non ci sono dati da cancellare.',
    clearConfirmTitle: 'Cancella tutti i dati',
    clearConfirmMessage: 'Questo eliminerà permanentemente {count} voci. Questa azione non può essere annullata.',
    cancel: 'Annulla',
    deleteAll: 'Elimina tutto',

    // About section
    aboutSection: 'INFORMAZIONI',
    appName: 'Orbital',
    tagline: 'Intelligenza della capacità longitudinale',
  },

  // ============================================
  // FAMILY / SHARED VIEWS
  // ============================================
  family: {
    sharedView: 'Vista condivisa — solo lettura',
    recordedBy: 'Capacità registrata da {name}',
  },

  // ============================================
  // TIME LABELS
  // ============================================
  time: {
    today: 'Oggi',
    yesterday: 'Ieri',
    ranges: {
      '7d': '7G',
      '14d': '14G',
      '1m': '1M',
      '90d': '90G',
      '1y': '1A',
    },
  },

  // ============================================
  // UNLOCK TIERS
  // ============================================
  unlockTiers: {
    week: {
      label: 'Vista settimanale',
      toast: 'Vista settimanale sbloccata',
      body: "Hai registrato abbastanza per vedere i tuoi primi schemi. Questo è solo l'inizio—gli schemi diventano più nitidi con il tempo.",
    },
    twoWeek: {
      label: 'Vista due settimane',
      toast: 'Vista due settimane sbloccata',
      body: 'Il rilevamento delle tendenze è ora attivo. Puoi iniziare a vedere in quale direzione si sta muovendo la tua capacità.',
    },
    month: {
      label: 'Vista mensile',
      toast: 'Vista mensile sbloccata',
      body: "L'attribuzione per categoria è ora disponibile. Vedi quali fattori—sensoriale, richiesta, sociale—sono correlati ai tuoi cambiamenti di capacità.",
    },
    quarter: {
      label: 'Vista trimestrale',
      toast: 'Vista trimestrale sbloccata',
      body: "L'intelligenza degli schemi è ora attiva. Orbital può rivelare schemi per giorno della settimana e ora del giorno basati sulla tua cronologia.",
    },
    year: {
      label: 'Vista annuale',
      toast: 'Storico di 1 anno sbloccato',
      body: 'Hai costruito un anno completo di dati longitudinali sulla capacità. Questo è raro. Questo è tuo. Gli schemi a questa profondità rivelano ciò che il monitoraggio a breve termine non potrebbe mai mostrare.',
    },
  },

  // ============================================
  // COMMON UI
  // ============================================
  common: {
    done: 'Fatto',
    save: 'Salva',
    close: 'Chiudi',
    back: 'Indietro',
  },

  // ============================================
  // EXPORT
  // ============================================
  export: {
    title: 'Opzioni di esportazione',
    ninetyDaySummary: 'Riepilogo 90 giorni',
    ninetyDaySublabel: 'Panoramica testuale degli schemi recenti',
    annualOverview: 'Panoramica annuale',
    annualSublabel: "Riepilogo della capacità dell'anno completo",
    fullJson: 'Dati completi (JSON)',
    fullJsonSublabel: 'Backup completo, leggibile dalla macchina',
    fullCsv: 'Dati completi (CSV)',
    fullCsvSublabel: 'Formato compatibile con fogli di calcolo',
    disclaimer: 'Non diagnostico. Dati di capacità auto-riportati normalizzati.',
    noData: 'Nessun dato disponibile per questo periodo',
    exportSuccess: 'Esportazione pronta',
  },

  // ============================================
  // SHARING
  // ============================================
  sharing: {
    title: 'Condivisione',
    subtitle: 'Concedi accesso temporaneo in sola lettura',
    addRecipient: 'Aggiungi destinatario',
    recipientsSection: 'DESTINATARI',
    noRecipients: 'Nessun destinatario aggiunto ancora',
    recipientTypes: {
      parent: 'Genitore / Caregiver',
      clinician: 'Clinico',
      employer: 'Datore di lavoro',
      school: 'Scuola',
      partner: 'Partner',
      other: 'Altro',
    },
    duration: {
      7: '7 giorni',
      14: '14 giorni',
      30: '30 giorni',
      90: '90 giorni',
    },
    durationLabel: 'Durata della condivisione',
    createShare: 'Crea link di condivisione',
    shareCreated: 'Link di condivisione creato',
    copyLink: 'Copia link',
    linkCopied: 'Link copiato',
    revokeShare: 'Revoca accesso',
    revokeConfirmTitle: 'Revoca accesso',
    revokeConfirmMessage: "Questo terminerà immediatamente l'accesso per questo destinatario.",
    deleteRecipientTitle: 'Rimuovi destinatario',
    deleteRecipientMessage: 'Questo revocherà anche eventuali condivisioni attive.',
    auditSection: 'REGISTRO ATTIVITÀ',
    noAuditEntries: 'Nessuna attività registrata',
    auditActions: {
      share_created: 'Condiviso con',
      share_expired: 'Condivisione scaduta per',
      share_revoked: 'Accesso revocato per',
      share_accessed: 'Visualizzato da',
      export_generated: 'Esportazione generata',
    },
    readOnlyBanner: 'Vista condivisa (solo lettura)',
    privateLabel: 'Privato per te',
    confirm: 'Conferma',
    cancel: 'Annulla',
    delete: 'Elimina',
  },

  // ============================================
  // DISCLAIMER (Institutional contexts)
  // ============================================
  disclaimer: {
    short: 'Non diagnostico',
    full: 'Questo strumento registra la capacità funzionale auto-riportata. Non costituisce valutazione clinica o diagnosi.',
    dataDescription: 'Segnali di capacità normalizzati nel tempo.',
    purpose: 'Registro longitudinale della capacità disponibile per uso personale o condiviso.',
  },

  // ============================================
  // ENTERPRISE FEATURES
  // ============================================
  enterprise: {
    executiveReports: 'Report Esecutivi',
    quarterlyReport: 'Report Trimestrale',
    quarterlyReportSublabel: 'Riepilogo esecutivo di 90 giorni',
    annualReport: 'Report Annuale',
    annualReportSublabel: "Riepilogo esecutivo dell'anno completo",
    historyVault: 'Archivio Storico',
    historyVaultSublabel: 'Conservazione a lungo termine dei dati di capacità',
    totalHistory: '{years} anni di dati',
    sensoryAlerts: 'Avvisi Sensoriali',
    sensoryAlertsSublabel: 'Monitoraggio del carico ambientale',
    noiseLevel: 'Livello di rumore attuale',
    noiseThreshold: 'Soglia di avviso',
    quietHours: 'Ore di silenzio',
    monitoringActive: 'Monitoraggio attivo',
    monitoringInactive: 'Monitoraggio inattivo',
    institutionalTier: {
      personal: 'Personale',
      family: 'Famiglia',
      pilot: 'Pilota',
      enterprise: 'Aziendale',
    },
  },

  // ============================================
  // GOVERNANCE & COMPLIANCE
  // ============================================
  governance: {
    legal: 'Legale e Politiche',
    legalSublabel: 'Termini, privacy, avvisi',
    consent: 'Gestione del Consenso',
    consentSublabel: 'Rivedi e gestisci i tuoi consensi',
    dataRights: 'I Tuoi Diritti sui Dati',
    dataRightsSublabel: 'Accedi, esporta o elimina i tuoi dati',
    auditLog: 'Registro Attività',
    auditLogSublabel: 'Visualizza cronologia di accessi e condivisioni',
    policies: {
      termsOfService: 'Termini di Servizio',
      privacyPolicy: 'Informativa sulla Privacy',
      dataRetention: 'Politica di Conservazione dei Dati',
      cancellationRefund: 'Politica di Cancellazione e Rimborso',
      nonDiagnostic: 'Avviso Non Diagnostico',
      jurisdiction: 'Giurisdizione e Legge Applicabile',
    },
    consentDetails: {
      dataCollection: 'Raccolta Dati',
      dataProcessing: 'Elaborazione Dati',
      dataSharing: 'Condivisione Dati',
      dataExport: 'Esportazione Dati',
      institutionalAccess: 'Accesso Istituzionale',
      granted: 'Concesso',
      revoked: 'Revocato',
      expired: 'Scaduto',
      grantConsent: 'Concedi Consenso',
      revokeConsent: 'Revoca Consenso',
    },
    offboarding: {
      title: 'Chiusura Account',
      subtitle: 'Chiudi il tuo account ed elimina i dati',
      initiateButton: 'Avvia Processo di Chiusura',
      exportWindow: 'Finestra di Esportazione',
      daysRemaining: '{days} giorni rimanenti',
      scheduledDeletion: 'Eliminazione programmata',
      cancelOffboarding: 'Annulla Chiusura',
      confirmationRequired: 'Conferma richiesta',
    },
    disclosure: {
      title: 'Comunicazioni',
      noDisclosures: 'Nessuna comunicazione attiva',
      acknowledge: 'Presa visione',
      acknowledged: 'Presa visione confermata',
    },
  },

  // ============================================
  // ACCESSIBILITY
  // ============================================
  accessibility: {
    title: 'Accessibilità',
    subtitle: 'Personalizza la tua esperienza',
    visualSection: 'VISIVO',
    motorSection: 'MOTORIO E INPUT',
    cognitiveSection: 'COGNITIVO',
    audioSection: 'AUDIO',
    dataSection: 'DATI E CONNETTIVITÀ',
    highContrast: 'Alto Contrasto',
    highContrastDesc: 'Aumentare il contrasto per una migliore visibilità',
    colorBlindMode: 'Visione dei Colori',
    colorBlindModeDesc: 'Ottimizzare i colori per il daltonismo',
    colorBlindOptions: {
      none: 'Predefinito',
      protanopia: 'Protanopia (Rosso debole)',
      deuteranopia: 'Deuteranopia (Verde debole)',
      tritanopia: 'Tritanopia (Blu debole)',
      monochrome: 'Monocromatico',
    },
    textSize: 'Dimensione Testo',
    textSizeDesc: "Regolare la dimensione del testo nell'app",
    textSizeOptions: { default: 'Predefinito', large: 'Grande', xlarge: 'Extra Grande' },
    reduceMotion: 'Riduci Movimento',
    reduceMotionDesc: 'Minimizzare le animazioni',
    bigButtonMode: 'Pulsanti Grandi',
    bigButtonModeDesc: 'Pulsanti più grandi, più facili da toccare',
    buttonSize: 'Dimensione Pulsanti',
    buttonSizeOptions: { default: 'Predefinito', large: 'Grande', xlarge: 'Extra Grande' },
    oneHandedMode: 'Modalità Una Mano',
    oneHandedModeDesc: "Ottimizzare il layout per l'uso con una mano",
    oneHandedOptions: { off: 'Disattivato', left: 'Mano Sinistra', right: 'Mano Destra' },
    hapticFeedback: 'Feedback Aptico',
    hapticFeedbackDesc: 'Sentire conferme e avvisi',
    hapticIntensity: 'Intensità Aptica',
    hapticIntensityOptions: { off: 'Disattivato', light: 'Leggero', medium: 'Medio', strong: 'Forte' },
    simplifiedText: 'Testo Semplificato',
    simplifiedTextDesc: 'Usare un linguaggio più breve e semplice',
    confirmActions: 'Conferma Azioni',
    confirmActionsDesc: 'Mostrare "Sei sicuro?" prima delle modifiche',
    undoEnabled: 'Abilita Annulla',
    undoEnabledDesc: 'Permettere di annullare le azioni recenti',
    showTooltips: 'Mostra Suggerimenti',
    showTooltipsDesc: 'Visualizzare suggerimenti utili',
    voiceControl: 'Controllo Vocale',
    voiceControlDesc: 'Controllare con comandi vocali',
    dictation: 'Dettatura',
    dictationDesc: 'Parlare per aggiungere note',
    liveCaptions: 'Sottotitoli in Tempo Reale',
    liveCaptionsDesc: "Mostrare sottotitoli per l'audio",
    offlineMode: 'Modalità Offline',
    offlineModeDesc: 'Lavorare senza connessione internet',
    lowDataMode: 'Modalità Risparmio Dati',
    lowDataModeDesc: "Ridurre l'uso dei dati",
    undoToast: 'Azione annullata',
    undoAvailable: 'Tocca per annullare',
    undoExpired: 'Annulla scaduto',
    guidedSetup: 'Configurazione Guidata',
    guidedSetupDesc: "Ottenere aiuto per configurare l'app",
    guidedSetupCompleted: 'Configurazione completata',
    startSetup: 'Avvia Configurazione',
    simplified: {
      home: { title: 'Come stai?', adjustPrompt: 'Muovi il cursore', spectrum: { high: 'BENE', low: 'BASSO' } },
      states: { resourced: 'Bene', stretched: 'OK', depleted: 'Basso' },
    },
  },

  // ============================================
  // DEMO MODE
  // ============================================
  demo: {
    advancedSection: 'AVANZATO',
    demoMode: 'Modalità Demo',
    demoModeDesc: 'Caricare dati di esempio per screenshot e demo',
    demoModeActive: 'La modalità demo è attiva',
    demoModeActiveDesc: 'Uso di dati di esempio. I tuoi dati reali sono al sicuro.',
    enableDemo: 'Attiva Modalità Demo',
    disableDemo: 'Esci dalla Modalità Demo',
    reseedData: 'Genera Nuovi Dati',
    reseedDataDesc: 'Creare nuovo set di dati demo',
    clearDemoData: 'Cancella Dati Demo',
    clearDemoDataDesc: 'Ripristinare a stato vuoto',
    duration: {
      '30d': '30 Segnali',
      '90d': '90 Segnali',
      '180d': '180 Segnali',
      '365d': '365 Segnali',
    },
    durationLabel: 'Intervallo Dati',
    unlockHint: 'Tocca il logo 5 volte per sbloccare le impostazioni avanzate',
    advancedUnlocked: 'Impostazioni avanzate sbloccate',
    confirmEnable: 'Attivare la Modalità Demo?',
    confirmEnableMessage: 'I tuoi dati reali saranno salvati in sicurezza e sostituiti con dati di esempio.',
    confirmDisable: 'Uscire dalla Modalità Demo?',
    confirmDisableMessage: 'I dati demo saranno rimossi e i tuoi dati reali saranno ripristinati.',
    dataRestored: 'Dati reali ripristinati',
    demoEnabled: 'Modalità demo attivata',
    demoBanner: 'DEMO',
    processing: 'Elaborazione...',
  },

  // ============================================
  // TEAM MODE (Enterprise Capacity Pulse)
  // ============================================
  teamMode: {
    title: 'Modalità Team',
    subtitle: 'Polso di capacità lavorativa opzionale',
    joinTeam: 'Unisciti al team',
    leaveTeam: 'Lascia il team',
    teamCode: 'Codice team',
    teamCodePlaceholder: 'Inserisci il codice team',
    teamCodeInvalid: 'Codice team non valido',
    noTeam: 'Non fai parte di un team',
    noTeamDesc: 'Inserisci un codice team per unirti al polso del tuo luogo di lavoro',
    joinSuccess: 'Ti sei unito al team con successo',
    leaveSuccess: 'Hai lasciato il team con successo',
    leaveConfirmTitle: 'Lascia il team',
    leaveConfirmMessage: 'Puoi rientrare in qualsiasi momento con il codice team.',
    privacyBanner: 'I tuoi dati individuali non vengono mai condivisi. Solo i dati aggregati del team sono visibili.',
    thresholdWarning: 'Il team necessita di almeno {min} partecipanti per mostrare i dati aggregati',
    participantCount: '{count} partecipanti',
    aggregateTitle: 'Polso di Capacità del Team',
    capacityDistribution: 'Distribuzione della Capacità',
    plenty: 'Sufficiente',
    elevated: 'Elevata',
    nearLimit: 'Vicino al limite',
    topDrivers: 'Principali fattori',
    weeklyTrend: 'Tendenza settimanale',
    trendImproving: 'In miglioramento',
    trendStable: 'Stabile',
    trendDeclining: 'In calo',
    participationConfidence: 'Affidabilità dei dati',
    confidenceHigh: 'Alta',
    confidenceMedium: 'Media',
    confidenceLow: 'Bassa',
    totalSignals: '{count} segnali in questo periodo',
    actionPanelTitle: 'Azioni suggerite',
    noSuggestions: 'Nessun suggerimento al momento',
  },

  // ============================================
  // SCHOOL ZONE (Student/Caregiver/Educator)
  // ============================================
  schoolZone: {
    title: 'Zona Scolastica',
    subtitle: 'Supporto di capacità per ambienti educativi',
    joinSchool: 'Unisciti alla scuola',
    leaveSchool: 'Lascia la scuola',
    schoolCode: 'Codice scolastico',
    schoolCodePlaceholder: 'Inserisci il codice scolastico',
    schoolCodeInvalid: 'Codice scolastico non valido',
    noSchool: 'Non iscritto in una zona scolastica',
    noSchoolDesc: 'Inserisci un codice scolastico per accedere alle funzionalità scolastiche',
    joinSuccess: 'Zona scolastica raggiunta con successo',
    leaveSuccess: 'Zona scolastica abbandonata con successo',
    leaveConfirmTitle: 'Lascia la zona scolastica',
    leaveConfirmMessage: 'Puoi rientrare in qualsiasi momento con il codice scolastico.',
    roleLabel: 'Io sono',
    roleStudent: 'Studente',
    roleCaregiver: 'Genitore / Caregiver',
    roleEducator: 'Educatore',
    privacyBanner: 'I dati individuali degli studenti non vengono mai condivisi con gli educatori. Solo i dati aggregati della classe sono visibili.',
    thresholdWarning: 'La classe necessita di almeno {min} studenti per mostrare i dati aggregati',
    studentCount: '{count} studenti',
    studentViewTitle: 'La Tua Capacità',
    studentViewDesc: 'Registra la tua capacità per aiutarti e ricevere supporto',
    goToLog: 'Registra ora',
    caregiverViewTitle: 'Scheda riepilogativa scolastica',
    caregiverViewDesc: 'Genera un riepilogo da condividere con gli educatori',
    generateCard: 'Genera scheda riepilogativa',
    shareCard: 'Condividi scheda',
    cardDateRange: 'Periodo: {start} a {end}',
    cardCapacityTrend: 'Tendenza della capacità',
    cardAverageCapacity: 'Capacità media',
    cardCommonDrivers: 'Fattori comuni',
    cardWhatHelps: 'Cosa aiuta',
    cardWhatDrains: 'Cosa affatica',
    cardEntriesCount: '{count} voci nel periodo',
    notesExcluded: 'Note personali escluse per la privacy',
    educatorViewTitle: 'Panoramica della capacità della classe',
    educatorViewDesc: 'Vista aggregata degli schemi di capacità della classe',
    classCapacity: 'Distribuzione della capacità della classe',
    classDrivers: 'Fattori della classe',
    classConfidence: 'Affidabilità dei dati',
    envFactors: {
      quiet_space: 'Spazio tranquillo',
      sensory_tools: 'Strumenti sensoriali',
      movement_breaks: 'Pause di movimento',
      extra_time: 'Tempo extra',
      small_groups: 'Piccoli gruppi',
      check_ins: 'Verifiche',
      loud_environment: 'Ambiente rumoroso',
      bright_lights: 'Luci forti',
      time_pressure: 'Pressione del tempo',
      multiple_instructions: 'Istruzioni multiple',
      crowded_spaces: 'Spazi affollati',
      social_demands: 'Richieste sociali',
    },
  },
} as const;

export type TranslationKeys = typeof it;
