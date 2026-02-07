/**
 * Orbital German Language Pack v1
 *
 * INVARIANT: Capacity → Kapazität (primary) | Verfügbare Kapazität (alternate)
 *
 * This is a standards implementation, not a translation exercise.
 * All terms follow the approved German Capacity Standard.
 *
 * PROHIBITED TERMS (never use):
 * - Energie (Energy)
 * - Wellness (Wellness)
 * - Burnout (Burnout)
 * - Symptome (Symptoms)
 * - Psychische Gesundheit (Mental health)
 */

export const de = {
  // ============================================
  // CORE TERMS (Canonical - Do Not Modify)
  // ============================================
  core: {
    capacity: 'Kapazität',
    capacityAlternate: 'Verfügbare Kapazität',
    today: 'Heute',
    baseline: 'Ausgangswert',
    trend: 'Trend',
    signals: 'Signale',
    patterns: 'Muster',
    nonDiagnostic: 'Nicht diagnostisch',
  },

  // ============================================
  // CAPACITY STATES
  // ============================================
  states: {
    resourced: 'Hohe Kapazität',
    stretched: 'Stabil',
    depleted: 'Reduziert',
  },

  // ============================================
  // CATEGORIES (Capacity Drivers)
  // ============================================
  categories: {
    sensory: 'Sensorisch',
    demand: 'Anforderung',
    social: 'Sozial',
  },

  // ============================================
  // HOME SCREEN
  // ============================================
  home: {
    title: 'Aktueller Kapazitätszustand',
    adjustPrompt: 'Anpassen, um aktuelle Kapazität widerzuspiegeln',
    driversLabel: 'Kapazitätsfaktoren (optional)',
    addDetails: 'Details hinzufügen (optional)',
    spectrum: {
      high: 'HOCH',
      low: 'REDUZIERT',
    },
  },

  // ============================================
  // PATTERNS SCREEN
  // ============================================
  patterns: {
    // Locked state
    lockedTitle: 'Muster werden bei 7 Signalen freigeschaltet',
    lockedBody: 'Erfassen Sie, wenn es wichtig ist—keine Serien, kein Druck.',
    lockedProgress: '{count} von 7 erfasst',

    // Chart context
    chartContext: 'Kapazität im Zeitverlauf — normalisiert, nicht diagnostisch',

    // Stats
    statsBaseline: 'Ausgangswert',
    statsTrend: 'Trend',
    statsDepleted: 'Reduziert',

    // Category breakdown
    categoryTitle: 'Zuordnung der Kapazitätsfaktoren',
    correlation: 'Korrelation',
    noData: 'keine Daten',

    // Intelligence section
    intelligenceTitle: 'Kapazitäts-Intelligenz',
    trajectoryDeclining: 'Kapazität diese Woche rückläufig',
    trajectoryImproving: 'Kapazität diese Woche steigend',
    trajectoryStable: 'Kapazität diese Woche stabil',
    comparedToPrevious: 'Im Vergleich zur Vorwoche',
    showsPattern: 'zeigt konsistentes Muster',
    correlationWith: 'Korrelation mit reduzierter Kapazität',
    focusOn: 'Fokussieren Sie sich auf die Verwaltung der {category}-Last',
    continueTracking: 'Erfassen Sie weiter, um personalisierte Erkenntnisse zu entwickeln',

    // Days
    days: {
      sunday: 'Sonntage',
      monday: 'Montage',
      tuesday: 'Dienstage',
      wednesday: 'Mittwoche',
      thursday: 'Donnerstage',
      friday: 'Freitage',
      saturday: 'Samstage',
    },

    // Time periods
    timePeriods: {
      morning: 'Morgen',
      afternoon: 'Nachmittag',
      evening: 'Abend',
    },

    // Longitudinal note
    longitudinalNote: 'Muster verbessern sich mit fortgesetzter Signalerfassung',
  },

  // ============================================
  // SETTINGS SCREEN
  // ============================================
  settings: {
    dataSection: 'DATEN',
    preferencesSection: 'EINSTELLUNGEN',
    language: 'Sprache',
    languageSublabel: 'App-Anzeigesprache',
    exportData: 'Daten exportieren',
    exportSublabel: '{count} Einträge',
    generateData: 'Demodaten generieren',
    generateSublabel: '6 Monate Beispieleinträge',
    clearData: 'Alle Daten löschen',
    clearSublabel: 'Alles löschen',

    // Alerts
    noData: 'Keine Daten',
    noDataMessage: 'Es gibt keine Daten zum Exportieren.',
    noDataToClear: 'Es gibt keine Daten zum Löschen.',
    clearConfirmTitle: 'Alle Daten löschen',
    clearConfirmMessage: 'Dies löscht dauerhaft {count} Einträge. Dies kann nicht rückgängig gemacht werden.',
    cancel: 'Abbrechen',
    deleteAll: 'Alle löschen',

    // About section
    aboutSection: 'ÜBER',
    appName: 'Orbital',
    tagline: 'Longitudinale Kapazitäts-Intelligenz',
  },

  // ============================================
  // FAMILY / SHARED VIEWS
  // ============================================
  family: {
    sharedView: 'Geteilte Ansicht — nur Lesen',
    recordedBy: 'Kapazität erfasst von {name}',
  },

  // ============================================
  // TIME LABELS
  // ============================================
  time: {
    today: 'Heute',
    yesterday: 'Gestern',
    ranges: {
      '7d': '7T',
      '14d': '14T',
      '1m': '1M',
      '90d': '90T',
      '1y': '1J',
    },
  },

  // ============================================
  // UNLOCK TIERS
  // ============================================
  unlockTiers: {
    week: {
      label: 'Wochenansicht',
      toast: 'Wochenansicht freigeschaltet',
      body: 'Sie haben genug erfasst, um Ihre ersten Muster zu sehen. Dies ist erst der Anfang—Muster werden mit der Zeit schärfer.',
    },
    twoWeek: {
      label: 'Zwei-Wochen-Ansicht',
      toast: 'Zwei-Wochen-Ansicht freigeschaltet',
      body: 'Die Trenderkennung ist jetzt aktiv. Sie können beginnen zu sehen, in welche Richtung sich Ihre Kapazität bewegt.',
    },
    month: {
      label: 'Monatsansicht',
      toast: 'Monatsansicht freigeschaltet',
      body: 'Die Kategoriezuordnung ist jetzt verfügbar. Sehen Sie, welche Faktoren—sensorisch, Anforderung, sozial—mit Ihren Kapazitätsveränderungen korrelieren.',
    },
    quarter: {
      label: 'Quartalsansicht',
      toast: 'Quartalsansicht freigeschaltet',
      body: 'Die Muster-Intelligenz ist jetzt aktiv. Orbital kann Wochentags- und Tageszeitenmuster basierend auf Ihrer Historie aufzeigen.',
    },
    year: {
      label: 'Jahresansicht',
      toast: '1-Jahres-Historie freigeschaltet',
      body: 'Sie haben ein komplettes Jahr an longitudinalen Kapazitätsdaten aufgebaut. Das ist selten. Das gehört Ihnen. Muster in dieser Tiefe enthüllen, was kurzfristiges Tracking niemals könnte.',
    },
  },

  // ============================================
  // COMMON UI
  // ============================================
  common: {
    done: 'Fertig',
    save: 'Speichern',
    close: 'Schließen',
    back: 'Zurück',
  },

  // ============================================
  // EXPORT
  // ============================================
  export: {
    title: 'Exportoptionen',
    ninetyDaySummary: '90-Tage-Zusammenfassung',
    ninetyDaySublabel: 'Textübersicht der jüngsten Muster',
    annualOverview: 'Jahresübersicht',
    annualSublabel: 'Vollständige Jahres-Kapazitätszusammenfassung',
    fullJson: 'Vollständige Daten (JSON)',
    fullJsonSublabel: 'Komplettes Backup, maschinenlesbar',
    fullCsv: 'Vollständige Daten (CSV)',
    fullCsvSublabel: 'Tabellenkalkulationskompatibles Format',
    disclaimer: 'Nicht diagnostisch. Normalisierte selbstberichtete Kapazitätsdaten.',
    noData: 'Keine Daten für diesen Zeitraum verfügbar',
    exportSuccess: 'Export bereit',
  },

  // ============================================
  // SHARING
  // ============================================
  sharing: {
    title: 'Teilen',
    subtitle: 'Zeitlich begrenzten Nur-Lese-Zugriff gewähren',
    addRecipient: 'Empfänger hinzufügen',
    recipientsSection: 'EMPFÄNGER',
    noRecipients: 'Noch keine Empfänger hinzugefügt',
    recipientTypes: {
      parent: 'Elternteil / Betreuer',
      clinician: 'Kliniker',
      employer: 'Arbeitgeber',
      school: 'Schule',
      partner: 'Partner',
      other: 'Andere',
    },
    duration: {
      7: '7 Tage',
      14: '14 Tage',
      30: '30 Tage',
      90: '90 Tage',
    },
    durationLabel: 'Freigabedauer',
    createShare: 'Freigabelink erstellen',
    shareCreated: 'Freigabelink erstellt',
    copyLink: 'Link kopieren',
    linkCopied: 'Link kopiert',
    revokeShare: 'Zugriff widerrufen',
    revokeConfirmTitle: 'Zugriff widerrufen',
    revokeConfirmMessage: 'Dies beendet sofort den Zugriff für diesen Empfänger.',
    deleteRecipientTitle: 'Empfänger entfernen',
    deleteRecipientMessage: 'Dies widerruft auch alle aktiven Freigaben.',
    auditSection: 'AKTIVITÄTSPROTOKOLL',
    noAuditEntries: 'Keine Aktivität erfasst',
    auditActions: {
      share_created: 'Geteilt mit',
      share_expired: 'Freigabe abgelaufen für',
      share_revoked: 'Zugriff widerrufen für',
      share_accessed: 'Angesehen von',
      export_generated: 'Export generiert',
    },
    readOnlyBanner: 'Geteilte Ansicht (nur Lesen)',
    privateLabel: 'Privat für Sie',
    confirm: 'Bestätigen',
    cancel: 'Abbrechen',
    delete: 'Löschen',
  },

  // ============================================
  // DISCLAIMER (Institutional contexts)
  // ============================================
  disclaimer: {
    short: 'Nicht diagnostisch',
    full: 'Dieses Tool erfasst selbstberichtete funktionale Kapazität. Es stellt keine klinische Bewertung oder Diagnose dar.',
    dataDescription: 'Normalisierte Kapazitätssignale im Zeitverlauf.',
    purpose: 'Longitudinale Aufzeichnung der verfügbaren Kapazität für persönliche oder geteilte Nutzung.',
  },

  // ============================================
  // ENTERPRISE FEATURES
  // ============================================
  enterprise: {
    executiveReports: 'Führungsberichte',
    quarterlyReport: 'Quartalsbericht',
    quarterlyReportSublabel: '90-Tage-Führungszusammenfassung',
    annualReport: 'Jahresbericht',
    annualReportSublabel: 'Vollständige Jahres-Führungszusammenfassung',
    historyVault: 'Historisches Archiv',
    historyVaultSublabel: 'Langfristige Kapazitätsdatenaufbewahrung',
    totalHistory: '{years} Jahre an Daten',
    sensoryAlerts: 'Sensorische Warnungen',
    sensoryAlertsSublabel: 'Überwachung der Umgebungsbelastung',
    noiseLevel: 'Aktueller Geräuschpegel',
    noiseThreshold: 'Warnschwelle',
    quietHours: 'Ruhezeiten',
    monitoringActive: 'Überwachung aktiv',
    monitoringInactive: 'Überwachung inaktiv',
    institutionalTier: {
      personal: 'Persönlich',
      family: 'Familie',
      pilot: 'Pilot',
      enterprise: 'Unternehmen',
    },
  },

  // ============================================
  // GOVERNANCE & COMPLIANCE
  // ============================================
  governance: {
    legal: 'Rechtliches und Richtlinien',
    legalSublabel: 'Bedingungen, Datenschutz, Hinweise',
    consent: 'Einwilligungsverwaltung',
    consentSublabel: 'Überprüfen und verwalten Sie Ihre Einwilligungen',
    dataRights: 'Ihre Datenrechte',
    dataRightsSublabel: 'Zugriff auf, Export oder Löschung Ihrer Daten',
    auditLog: 'Aktivitätsprotokoll',
    auditLogSublabel: 'Zugriffs- und Freigabeverlauf anzeigen',
    policies: {
      termsOfService: 'Nutzungsbedingungen',
      privacyPolicy: 'Datenschutzrichtlinie',
      dataRetention: 'Datenaufbewahrungsrichtlinie',
      cancellationRefund: 'Kündigungs- und Erstattungsrichtlinie',
      nonDiagnostic: 'Nicht-diagnostischer Hinweis',
      jurisdiction: 'Gerichtsstand und anwendbares Recht',
    },
    consentDetails: {
      dataCollection: 'Datenerfassung',
      dataProcessing: 'Datenverarbeitung',
      dataSharing: 'Datenfreigabe',
      dataExport: 'Datenexport',
      institutionalAccess: 'Institutioneller Zugriff',
      granted: 'Erteilt',
      revoked: 'Widerrufen',
      expired: 'Abgelaufen',
      grantConsent: 'Einwilligung erteilen',
      revokeConsent: 'Einwilligung widerrufen',
    },
    offboarding: {
      title: 'Kontobeendigung',
      subtitle: 'Schließen Sie Ihr Konto und löschen Sie Daten',
      initiateButton: 'Beendigungsprozess starten',
      exportWindow: 'Exportfenster',
      daysRemaining: '{days} Tage verbleibend',
      scheduledDeletion: 'Geplante Löschung',
      cancelOffboarding: 'Beendigung abbrechen',
      confirmationRequired: 'Bestätigung erforderlich',
    },
    disclosure: {
      title: 'Offenlegungen',
      noDisclosures: 'Keine aktiven Offenlegungen',
      acknowledge: 'Zur Kenntnis nehmen',
      acknowledged: 'Zur Kenntnis genommen',
    },
  },

  // ============================================
  // ACCESSIBILITY
  // ============================================
  accessibility: {
    title: 'Barrierefreiheit',
    subtitle: 'Passen Sie Ihre Erfahrung an',
    visualSection: 'VISUELL',
    motorSection: 'MOTORIK & EINGABE',
    cognitiveSection: 'KOGNITIV',
    audioSection: 'AUDIO',
    dataSection: 'DATEN & KONNEKTIVITÄT',
    highContrast: 'Hoher Kontrast',
    highContrastDesc: 'Kontrast für bessere Sichtbarkeit erhöhen',
    colorBlindMode: 'Farbsehen',
    colorBlindModeDesc: 'Farben für Farbenblindheit optimieren',
    colorBlindOptions: {
      none: 'Standard',
      protanopia: 'Protanopie (Rotschwäche)',
      deuteranopia: 'Deuteranopie (Grünschwäche)',
      tritanopia: 'Tritanopie (Blauschwäche)',
      monochrome: 'Monochrom',
    },
    textSize: 'Textgröße',
    textSizeDesc: 'Textgröße in der App anpassen',
    textSizeOptions: { default: 'Standard', large: 'Groß', xlarge: 'Sehr Groß' },
    reduceMotion: 'Bewegung Reduzieren',
    reduceMotionDesc: 'Animationen minimieren',
    bigButtonMode: 'Große Schaltflächen',
    bigButtonModeDesc: 'Größere Tasten, leichter zu tippen',
    buttonSize: 'Schaltflächengröße',
    buttonSizeOptions: { default: 'Standard', large: 'Groß', xlarge: 'Sehr Groß' },
    oneHandedMode: 'Einhandmodus',
    oneHandedModeDesc: 'Layout für Einhandbedienung optimieren',
    oneHandedOptions: { off: 'Aus', left: 'Linke Hand', right: 'Rechte Hand' },
    hapticFeedback: 'Haptisches Feedback',
    hapticFeedbackDesc: 'Bestätigungen und Warnungen spüren',
    hapticIntensity: 'Haptische Intensität',
    hapticIntensityOptions: { off: 'Aus', light: 'Leicht', medium: 'Mittel', strong: 'Stark' },
    simplifiedText: 'Vereinfachter Text',
    simplifiedTextDesc: 'Kürzere, einfachere Sprache verwenden',
    confirmActions: 'Aktionen Bestätigen',
    confirmActionsDesc: '"Sind Sie sicher?" vor Änderungen anzeigen',
    undoEnabled: 'Rückgängig Aktivieren',
    undoEnabledDesc: 'Letzte Aktionen rückgängig machen erlauben',
    showTooltips: 'Hinweise Anzeigen',
    showTooltipsDesc: 'Hilfreiche Tipps anzeigen',
    voiceControl: 'Sprachsteuerung',
    voiceControlDesc: 'Mit Sprachbefehlen steuern',
    dictation: 'Diktat',
    dictationDesc: 'Sprechen um Notizen hinzuzufügen',
    liveCaptions: 'Live-Untertitel',
    liveCaptionsDesc: 'Untertitel für Audio anzeigen',
    offlineMode: 'Offline-Modus',
    offlineModeDesc: 'Ohne Internetverbindung arbeiten',
    lowDataMode: 'Datensparmodus',
    lowDataModeDesc: 'Datenverbrauch reduzieren',
    undoToast: 'Aktion rückgängig gemacht',
    undoAvailable: 'Tippen zum Rückgängigmachen',
    undoExpired: 'Rückgängig abgelaufen',
    guidedSetup: 'Einrichtungsassistent',
    guidedSetupDesc: 'Hilfe bei der App-Einrichtung erhalten',
    guidedSetupCompleted: 'Einrichtung abgeschlossen',
    startSetup: 'Einrichtung Starten',
    simpleMode: 'Einfacher Modus',
    simpleModeDesc: 'Maximale Barrierefreiheit mit einem Tippen',
    simplified: {
      home: { title: 'Wie geht es Ihnen?', adjustPrompt: 'Schieberegler bewegen', spectrum: { high: 'GUT', low: 'NIEDRIG' } },
      states: { resourced: 'Gut', stretched: 'OK', depleted: 'Niedrig' },
    },
  },

  // ============================================
  // DEMO MODE
  // ============================================
  demo: {
    advancedSection: 'ERWEITERT',
    demoMode: 'Demo-Modus',
    demoModeDesc: 'Beispieldaten für Screenshots und Demos laden',
    demoModeActive: 'Demo-Modus ist aktiv',
    demoModeActiveDesc: 'Beispieldaten werden verwendet. Ihre echten Daten sind sicher gespeichert.',
    enableDemo: 'Demo-Modus Aktivieren',
    disableDemo: 'Demo-Modus Beenden',
    reseedData: 'Neue Daten Generieren',
    reseedDataDesc: 'Neuen Demo-Datensatz erstellen',
    clearDemoData: 'Demo-Daten Löschen',
    clearDemoDataDesc: 'Auf leeren Zustand zurücksetzen',
    duration: {
      '30d': '30 Signale',
      '90d': '90 Signale',
      '180d': '180 Signale',
      '365d': '365 Signale',
      '3y': '3 Jahre',
      '5y': '5 Jahre',
      '10y': '10 Jahre',
    },
    durationLabel: 'Datenbereich',
    unlockHint: 'Logo 5x antippen um erweiterte Einstellungen freizuschalten',
    advancedUnlocked: 'Erweiterte Einstellungen freigeschaltet',
    confirmEnable: 'Demo-Modus Aktivieren?',
    confirmEnableMessage: 'Ihre echten Daten werden sicher gespeichert und durch Beispieldaten ersetzt.',
    confirmDisable: 'Demo-Modus Beenden?',
    confirmDisableMessage: 'Demo-Daten werden entfernt und Ihre echten Daten werden wiederhergestellt.',
    dataRestored: 'Echte Daten wiederhergestellt',
    demoEnabled: 'Demo-Modus aktiviert',
    demoBanner: 'DEMO',
    processing: 'Verarbeitung...',
  },

  // ============================================
  // TEAM MODE (Enterprise Capacity Pulse)
  // ============================================
  teamMode: {
    title: 'Team-Modus',
    subtitle: 'Opt-in-Kapazitätspuls am Arbeitsplatz',
    joinTeam: 'Team beitreten',
    leaveTeam: 'Team verlassen',
    teamCode: 'Team-Code',
    teamCodePlaceholder: 'Team-Code eingeben',
    teamCodeInvalid: 'Ungültiger Team-Code',
    noTeam: 'Kein Teammitglied',
    noTeamDesc: 'Geben Sie einen Team-Code ein, um dem Arbeitsplatzpuls beizutreten',
    joinSuccess: 'Erfolgreich dem Team beigetreten',
    leaveSuccess: 'Team erfolgreich verlassen',
    leaveConfirmTitle: 'Team verlassen',
    leaveConfirmMessage: 'Sie können jederzeit mit dem Team-Code wieder beitreten.',
    privacyBanner: 'Ihre individuellen Daten werden nie geteilt. Nur aggregierte Teamdaten sind sichtbar.',
    thresholdWarning: 'Das Team benötigt mindestens {min} Teilnehmer, um aggregierte Daten anzuzeigen',
    participantCount: '{count} Teilnehmer',
    aggregateTitle: 'Team-Kapazitätspuls',
    capacityDistribution: 'Kapazitätsverteilung',
    plenty: 'Ausreichend',
    elevated: 'Erhöht',
    nearLimit: 'Nahe am Limit',
    topDrivers: 'Hauptfaktoren',
    weeklyTrend: 'Wöchentlicher Trend',
    trendImproving: 'Verbessernd',
    trendStable: 'Stabil',
    trendDeclining: 'Rückläufig',
    participationConfidence: 'Datenvertrauen',
    confidenceHigh: 'Hoch',
    confidenceMedium: 'Mittel',
    confidenceLow: 'Niedrig',
    totalSignals: '{count} Signale in diesem Zeitraum',
    actionPanelTitle: 'Vorgeschlagene Maßnahmen',
    noSuggestions: 'Derzeit keine Vorschläge',
  },

  // ============================================
  // SCHOOL ZONE (Student/Caregiver/Educator)
  // ============================================
  schoolZone: {
    title: 'Schulzone',
    subtitle: 'Kapazitätsunterstützung für Bildungseinrichtungen',
    joinSchool: 'Schule beitreten',
    leaveSchool: 'Schule verlassen',
    schoolCode: 'Schulcode',
    schoolCodePlaceholder: 'Schulcode eingeben',
    schoolCodeInvalid: 'Ungültiger Schulcode',
    noSchool: 'Nicht in einer Schulzone eingeschrieben',
    noSchoolDesc: 'Geben Sie einen Schulcode ein, um auf Schulfunktionen zuzugreifen',
    joinSuccess: 'Erfolgreich der Schulzone beigetreten',
    leaveSuccess: 'Schulzone erfolgreich verlassen',
    leaveConfirmTitle: 'Schulzone verlassen',
    leaveConfirmMessage: 'Sie können jederzeit mit dem Schulcode wieder beitreten.',
    roleLabel: 'Ich bin',
    roleStudent: 'Schüler/in',
    roleCaregiver: 'Erziehungsberechtigte/r',
    roleEducator: 'Lehrkraft',
    privacyBanner: 'Individuelle Schülerdaten werden nie mit Lehrkräften geteilt. Nur aggregierte Klassendaten sind sichtbar.',
    thresholdWarning: 'Die Klasse benötigt mindestens {min} Schüler, um aggregierte Daten anzuzeigen',
    studentCount: '{count} Schüler',
    studentViewTitle: 'Ihre Kapazität',
    studentViewDesc: 'Erfassen Sie Ihre Kapazität, um sich selbst zu helfen und Unterstützung zu erhalten',
    goToLog: 'Jetzt erfassen',
    caregiverViewTitle: 'Schulübersichtskarte',
    caregiverViewDesc: 'Erstellen Sie eine Zusammenfassung zum Teilen mit Lehrkräften',
    generateCard: 'Übersichtskarte erstellen',
    shareCard: 'Karte teilen',
    cardDateRange: 'Zeitraum: {start} bis {end}',
    cardCapacityTrend: 'Kapazitätstrend',
    cardAverageCapacity: 'Durchschnittliche Kapazität',
    cardCommonDrivers: 'Häufige Faktoren',
    cardWhatHelps: 'Was hilft',
    cardWhatDrains: 'Was belastet',
    cardEntriesCount: '{count} Einträge im Zeitraum',
    notesExcluded: 'Persönliche Notizen aus Datenschutzgründen ausgeschlossen',
    educatorViewTitle: 'Klassenkapazitätsübersicht',
    educatorViewDesc: 'Aggregierte Ansicht der Kapazitätsmuster der Klasse',
    classCapacity: 'Kapazitätsverteilung der Klasse',
    classDrivers: 'Klassenfaktoren',
    classConfidence: 'Datenvertrauen',
    envFactors: {
      quiet_space: 'Ruhiger Raum',
      sensory_tools: 'Sensorische Hilfsmittel',
      movement_breaks: 'Bewegungspausen',
      extra_time: 'Zusätzliche Zeit',
      small_groups: 'Kleine Gruppen',
      check_ins: 'Rückmeldungen',
      loud_environment: 'Laute Umgebung',
      bright_lights: 'Helles Licht',
      time_pressure: 'Zeitdruck',
      multiple_instructions: 'Mehrfache Anweisungen',
      crowded_spaces: 'Überfüllte Räume',
      social_demands: 'Soziale Anforderungen',
    },
  },
} as const;

export type TranslationKeys = typeof de;
