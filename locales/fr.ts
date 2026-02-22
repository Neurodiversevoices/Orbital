/**
 * Orbital French Language Pack v1
 *
 * INVARIANT: Capacity → Capacité (primary) | Capacité disponible (alternate)
 *
 * This is a standards implementation, not a translation exercise.
 * All terms follow the approved French Capacity Standard.
 *
 * PROHIBITED TERMS (never use):
 * - Énergie (Energy)
 * - Bien-être (Wellness)
 * - Épuisement (Burnout)
 * - Symptômes (Symptoms)
 * - Santé mentale (Mental health)
 */

export const fr = {
  // ============================================
  // CORE TERMS (Canonical - Do Not Modify)
  // ============================================
  core: {
    capacity: 'Capacité',
    capacityAlternate: 'Capacité disponible',
    today: "Aujourd'hui",
    baseline: 'Référence',
    trend: 'Tendance',
    signals: 'Signaux',
    patterns: 'Schémas',
    nonDiagnostic: 'Non diagnostique',
  },

  // ============================================
  // CAPACITY STATES
  // ============================================
  states: {
    resourced: 'Capacité élevée',
    stretched: 'Stable',
    depleted: 'Réduite',
  },

  // ============================================
  // CATEGORIES (Capacity Drivers)
  // ============================================
  categories: {
    sensory: 'Sensoriel',
    demand: 'Demande',
    social: 'Social',
  },

  // ============================================
  // HOME SCREEN
  // ============================================
  home: {
    title: 'État de capacité actuel',
    adjustPrompt: 'Ajustez pour refléter votre capacité actuelle',
    driversLabel: 'Facteurs de capacité (facultatif)',
    addDetails: 'Ajouter des détails (facultatif)',
    spectrum: {
      high: 'ÉLEVÉE',
      low: 'RÉDUITE',
    },
  },

  // ============================================
  // PATTERNS SCREEN
  // ============================================
  patterns: {
    // Locked state
    lockedTitle: 'Les schémas se débloquent à 7 signaux',
    lockedBody: 'Enregistrez quand cela compte—pas de séries, pas de pression.',
    lockedProgress: '{count} sur 7 enregistrés',

    // Chart context
    chartContext: 'Capacité au fil du temps — normalisée, non diagnostique',

    // Stats
    statsBaseline: 'Référence',
    statsTrend: 'Tendance',
    statsDepleted: 'Réduite',

    // Category breakdown
    categoryTitle: 'Attribution des facteurs de capacité',
    correlation: 'corrélation',
    noData: 'aucune donnée',

    // Intelligence section
    intelligenceTitle: 'Intelligence de capacité',
    trajectoryDeclining: 'Capacité en baisse cette semaine',
    trajectoryImproving: 'Capacité en hausse cette semaine',
    trajectoryStable: 'Capacité stable cette semaine',
    comparedToPrevious: 'Par rapport à la semaine précédente',
    showsPattern: 'montre un schéma cohérent',
    correlationWith: 'corrélation avec une capacité réduite',
    focusOn: 'Concentrez-vous sur la gestion de la charge {category}',
    continueTracking: 'Continuez à enregistrer pour développer des insights personnalisés',

    // Days
    days: {
      sunday: 'Dimanches',
      monday: 'Lundis',
      tuesday: 'Mardis',
      wednesday: 'Mercredis',
      thursday: 'Jeudis',
      friday: 'Vendredis',
      saturday: 'Samedis',
    },

    // Time periods
    timePeriods: {
      morning: 'Matin',
      afternoon: 'Après-midi',
      evening: 'Soir',
    },

    // Longitudinal note
    longitudinalNote: "Les schémas s'améliorent avec la collecte continue de signaux",
  },

  // ============================================
  // SETTINGS SCREEN
  // ============================================
  settings: {
    dataSection: 'DONNÉES',
    preferencesSection: 'PRÉFÉRENCES',
    language: 'Langue',
    languageSublabel: "Langue d'affichage de l'application",
    exportData: 'Exporter les données',
    exportSublabel: '{count} entrées',
    generateData: 'Générer des données de démonstration',
    generateSublabel: "6 mois d'entrées échantillons",
    clearData: 'Effacer toutes les données',
    clearSublabel: 'Tout supprimer',

    // Alerts
    noData: 'Aucune donnée',
    noDataMessage: "Il n'y a pas de données à exporter.",
    noDataToClear: "Il n'y a pas de données à effacer.",
    clearConfirmTitle: 'Effacer toutes les données',
    clearConfirmMessage: 'Cela supprimera définitivement {count} entrées. Cette action est irréversible.',
    cancel: 'Annuler',
    deleteAll: 'Tout supprimer',

    // About section
    aboutSection: 'À PROPOS',
    appName: 'Orbital',
    tagline: 'Intelligence de capacité longitudinale',
  },

  // ============================================
  // FAMILY / SHARED VIEWS
  // ============================================
  family: {
    sharedView: 'Vue partagée — lecture seule',
    recordedBy: 'Capacité enregistrée par {name}',
  },

  // ============================================
  // TIME LABELS
  // ============================================
  time: {
    today: "Aujourd'hui",
    yesterday: 'Hier',
    ranges: {
      '7d': '7J',
      '14d': '14J',
      '1m': '1M',
      '90d': '90J',
      '1y': '1A',
    },
  },

  // ============================================
  // UNLOCK TIERS
  // ============================================
  unlockTiers: {
    week: {
      label: 'Vue hebdomadaire',
      toast: 'Vue hebdomadaire débloquée',
      body: "Vous avez enregistré suffisamment pour voir vos premiers schémas. Ce n'est que le début—les schémas s'affinent avec le temps.",
    },
    twoWeek: {
      label: 'Vue sur deux semaines',
      toast: 'Vue sur deux semaines débloquée',
      body: 'La détection des tendances est maintenant active. Vous pouvez commencer à voir dans quelle direction évolue votre capacité.',
    },
    month: {
      label: 'Vue mensuelle',
      toast: 'Vue mensuelle débloquée',
      body: "L'attribution par catégorie est maintenant disponible. Voyez quels facteurs—sensoriel, demande, social—sont corrélés à vos variations de capacité.",
    },
    quarter: {
      label: 'Vue trimestrielle',
      toast: 'Vue trimestrielle débloquée',
      body: "L'intelligence des schémas est maintenant active. Orbital peut révéler des schémas par jour de la semaine et heure de la journée basés sur votre historique.",
    },
    year: {
      label: 'Vue annuelle',
      toast: "Historique d'1 an débloqué",
      body: "Vous avez construit une année complète de données longitudinales de capacité. C'est rare. C'est le vôtre. Les schémas à cette profondeur révèlent ce que le suivi à court terme ne pourrait jamais montrer.",
    },
  },

  // ============================================
  // COMMON UI
  // ============================================
  common: {
    done: 'Terminé',
    save: 'Enregistrer',
    close: 'Fermer',
    back: 'Retour',
  },

  // ============================================
  // EXPORT
  // ============================================
  export: {
    title: "Options d'exportation",
    ninetyDaySummary: 'Résumé 90 jours',
    ninetyDaySublabel: 'Aperçu textuel des schémas récents',
    annualOverview: 'Aperçu annuel',
    annualSublabel: "Résumé de capacité sur l'année complète",
    fullJson: 'Données complètes (JSON)',
    fullJsonSublabel: 'Sauvegarde complète, lisible par machine',
    fullCsv: 'Données complètes (CSV)',
    fullCsvSublabel: 'Format compatible tableur',
    disclaimer: 'Non diagnostique. Données de capacité auto-déclarées normalisées.',
    noData: 'Aucune donnée disponible pour cette période',
    exportSuccess: 'Exportation prête',
  },

  // ============================================
  // SHARING
  // ============================================
  sharing: {
    title: 'Partage',
    subtitle: 'Accorder un accès temporaire en lecture seule',
    addRecipient: 'Ajouter un destinataire',
    recipientsSection: 'DESTINATAIRES',
    noRecipients: 'Aucun destinataire ajouté',
    recipientTypes: {
      parent: 'Parent / Aidant',
      clinician: 'Clinicien',
      employer: 'Employeur',
      school: 'École',
      partner: 'Partenaire',
      other: 'Autre',
    },
    duration: {
      7: '7 jours',
      14: '14 jours',
      30: '30 jours',
      90: '90 jours',
    },
    durationLabel: 'Durée du partage',
    createShare: 'Créer un lien de partage',
    shareCreated: 'Lien de partage créé',
    copyLink: 'Copier le lien',
    linkCopied: 'Lien copié',
    revokeShare: "Révoquer l'accès",
    revokeConfirmTitle: "Révoquer l'accès",
    revokeConfirmMessage: "Cela mettra fin immédiatement à l'accès pour ce destinataire.",
    deleteRecipientTitle: 'Supprimer le destinataire',
    deleteRecipientMessage: 'Cela révoquera également tous les partages actifs.',
    auditSection: "JOURNAL D'ACTIVITÉ",
    noAuditEntries: 'Aucune activité enregistrée',
    auditActions: {
      share_created: 'Partagé avec',
      share_expired: 'Partage expiré pour',
      share_revoked: 'Accès révoqué pour',
      share_accessed: 'Consulté par',
      export_generated: 'Exportation générée',
    },
    readOnlyBanner: 'Vue partagée (lecture seule)',
    privateLabel: 'Privé pour vous',
    confirm: 'Confirmer',
    cancel: 'Annuler',
    delete: 'Supprimer',
  },

  // ============================================
  // DISCLAIMER (Institutional contexts)
  // ============================================
  disclaimer: {
    short: 'Non diagnostique',
    full: 'Cet outil enregistre la capacité fonctionnelle auto-déclarée. Il ne constitue pas une évaluation clinique ni un diagnostic.',
    dataDescription: 'Signaux de capacité normalisés au fil du temps.',
    purpose: 'Registre longitudinal de la capacité disponible pour usage personnel ou partagé.',
  },

  // ============================================
  // ENTERPRISE FEATURES
  // ============================================
  enterprise: {
    executiveReports: 'Rapports Exécutifs',
    quarterlyReport: 'Rapport Trimestriel',
    quarterlyReportSublabel: 'Résumé exécutif de 90 jours',
    annualReport: 'Rapport Annuel',
    annualReportSublabel: "Résumé exécutif de l'année complète",
    historyVault: 'Coffre Historique',
    historyVaultSublabel: 'Conservation des données de capacité à long terme',
    totalHistory: '{years} années de données',
    sensoryAlerts: 'Alertes Sensorielles',
    sensoryAlertsSublabel: 'Surveillance de la charge environnementale',
    noiseLevel: 'Niveau sonore actuel',
    noiseThreshold: "Seuil d'alerte",
    quietHours: 'Heures calmes',
    monitoringActive: 'Surveillance active',
    monitoringInactive: 'Surveillance inactive',
    institutionalTier: {
      personal: 'Personnel',
      family: 'Famille',
      pilot: 'Pilote',
      enterprise: 'Entreprise',
    },
  },

  // ============================================
  // GOVERNANCE & COMPLIANCE
  // ============================================
  governance: {
    legal: 'Juridique et Politiques',
    legalSublabel: 'Conditions, confidentialité, mentions',
    consent: 'Gestion du Consentement',
    consentSublabel: 'Consultez et gérez vos consentements',
    dataRights: 'Vos Droits sur les Données',
    dataRightsSublabel: 'Accédez, exportez ou supprimez vos données',
    auditLog: "Journal d'Activité",
    auditLogSublabel: "Consultez l'historique des accès et partages",
    policies: {
      termsOfService: "Conditions d'Utilisation",
      privacyPolicy: 'Politique de Confidentialité',
      dataRetention: 'Politique de Conservation des Données',
      cancellationRefund: "Politique d'Annulation et de Remboursement",
      nonDiagnostic: 'Avertissement Non Diagnostique',
      jurisdiction: 'Juridiction et Droit Applicable',
    },
    consentDetails: {
      dataCollection: 'Collecte de Données',
      dataProcessing: 'Traitement des Données',
      dataSharing: 'Partage des Données',
      dataExport: 'Exportation des Données',
      institutionalAccess: 'Accès Institutionnel',
      granted: 'Accordé',
      revoked: 'Révoqué',
      expired: 'Expiré',
      grantConsent: 'Accorder le Consentement',
      revokeConsent: 'Révoquer le Consentement',
    },
    offboarding: {
      title: 'Clôture de Compte',
      subtitle: 'Fermez votre compte et supprimez vos données',
      initiateButton: 'Commencer le Processus de Clôture',
      exportWindow: "Fenêtre d'Exportation",
      daysRemaining: '{days} jours restants',
      scheduledDeletion: 'Suppression programmée',
      cancelOffboarding: 'Annuler la Clôture',
      confirmationRequired: 'Confirmation requise',
    },
    disclosure: {
      title: 'Divulgations',
      noDisclosures: 'Aucune divulgation active',
      acknowledge: 'Accuser réception',
      acknowledged: 'Accusé réception',
    },
  },

  // ============================================
  // ACCESSIBILITY
  // ============================================
  accessibility: {
    title: 'Accessibilité',
    subtitle: 'Personnalisez votre expérience',
    visualSection: 'VISUEL',
    motorSection: 'MOTEUR ET SAISIE',
    cognitiveSection: 'COGNITIF',
    audioSection: 'AUDIO',
    dataSection: 'DONNÉES ET CONNECTIVITÉ',
    highContrast: 'Contraste Élevé',
    highContrastDesc: 'Augmenter le contraste pour une meilleure visibilité',
    colorBlindMode: 'Vision des Couleurs',
    colorBlindModeDesc: 'Optimiser les couleurs pour le daltonisme',
    colorBlindOptions: {
      none: 'Par défaut',
      protanopia: 'Protanopie (Rouge faible)',
      deuteranopia: 'Deutéranopie (Vert faible)',
      tritanopia: 'Tritanopie (Bleu faible)',
      monochrome: 'Monochrome',
    },
    textSize: 'Taille du Texte',
    textSizeDesc: "Ajuster la taille du texte dans l'application",
    textSizeOptions: { default: 'Par défaut', large: 'Grand', xlarge: 'Très Grand' },
    reduceMotion: 'Réduire les Mouvements',
    reduceMotionDesc: 'Minimiser les animations',
    bigButtonMode: 'Grands Boutons',
    bigButtonModeDesc: 'Boutons plus grands, plus faciles à toucher',
    buttonSize: 'Taille des Boutons',
    buttonSizeOptions: { default: 'Par défaut', large: 'Grand', xlarge: 'Très Grand' },
    oneHandedMode: 'Mode Une Main',
    oneHandedModeDesc: "Optimiser la disposition pour l'utilisation à une main",
    oneHandedOptions: { off: 'Désactivé', left: 'Main Gauche', right: 'Main Droite' },
    hapticFeedback: 'Retour Haptique',
    hapticFeedbackDesc: 'Ressentir les confirmations et alertes',
    hapticIntensity: 'Intensité Haptique',
    hapticIntensityOptions: { off: 'Désactivé', light: 'Léger', medium: 'Moyen', strong: 'Fort' },
    simplifiedText: 'Texte Simplifié',
    simplifiedTextDesc: 'Utiliser un langage plus court et simple',
    confirmActions: 'Confirmer les Actions',
    confirmActionsDesc: 'Afficher "Êtes-vous sûr?" avant les modifications',
    undoEnabled: 'Activer Annuler',
    undoEnabledDesc: "Permettre d'annuler les actions récentes",
    showTooltips: 'Afficher les Conseils',
    showTooltipsDesc: 'Afficher des conseils utiles',
    voiceControl: 'Contrôle Vocal',
    voiceControlDesc: 'Contrôler avec des commandes vocales',
    dictation: 'Dictée',
    dictationDesc: 'Parler pour ajouter des notes',
    liveCaptions: 'Sous-titres en Direct',
    liveCaptionsDesc: "Afficher les sous-titres pour l'audio",
    offlineMode: 'Mode Hors Ligne',
    offlineModeDesc: 'Travailler sans connexion internet',
    lowDataMode: 'Mode Économie de Données',
    lowDataModeDesc: "Réduire l'utilisation des données",
    undoToast: 'Action annulée',
    undoAvailable: 'Touchez pour annuler',
    undoExpired: 'Annulation expirée',
    simpleMode: 'Mode Simple',
    simpleModeDesc: "Accessibilité maximale en une seule touche",
    guidedSetup: 'Assistant de Configuration',
    guidedSetupDesc: "Obtenir de l'aide pour configurer l'application",
    guidedSetupCompleted: 'Configuration terminée',
    startSetup: 'Démarrer la Configuration',
    simplified: {
      home: { title: 'Comment allez-vous?', adjustPrompt: 'Déplacez le curseur', spectrum: { high: 'BIEN', low: 'BAS' } },
      states: { resourced: 'Bien', stretched: 'OK', depleted: 'Bas' },
    },
  },

  // ============================================
  // DEMO MODE
  // ============================================
  demo: {
    advancedSection: 'AVANCÉ',
    demoMode: 'Mode Démo',
    demoModeDesc: "Charger des données d'exemple pour les captures d'écran et démos",
    demoModeActive: 'Le mode démo est actif',
    demoModeActiveDesc: "Utilisation de données d'exemple. Vos données réelles sont en sécurité.",
    enableDemo: 'Activer le Mode Démo',
    disableDemo: 'Quitter le Mode Démo',
    reseedData: 'Générer Nouvelles Données',
    reseedDataDesc: "Créer un nouveau jeu de données d'exemple",
    clearDemoData: 'Effacer les Données Démo',
    clearDemoDataDesc: "Réinitialiser à l'état vide",
    duration: {
      '30d': '30 Signaux',
      '90d': '90 Signaux',
      '180d': '180 Signaux',
      '365d': '365 Signaux',
      '3y': '3 Ans',
      '5y': '5 Ans',
      '10y': '10 Ans',
    },
    durationLabel: 'Plage de Données',
    unlockHint: 'Appuyez 5x sur le logo pour débloquer les paramètres avancés',
    advancedUnlocked: 'Paramètres avancés débloqués',
    confirmEnable: 'Activer le Mode Démo?',
    confirmEnableMessage: "Vos données réelles seront sauvegardées en sécurité et remplacées par des données d'exemple.",
    confirmDisable: 'Quitter le Mode Démo?',
    confirmDisableMessage: 'Les données démo seront supprimées et vos données réelles seront restaurées.',
    dataRestored: 'Données réelles restaurées',
    demoEnabled: 'Mode démo activé',
    demoBanner: 'DÉMO',
    processing: 'Traitement...',
  },

  // ============================================
  // TEAM MODE
  // ============================================
  teamMode: {
    title: "Mode Équipe",
    subtitle: "Pouls optionnel de capacité du lieu de travail",
    joinTeam: "Rejoindre l'Équipe",
    leaveTeam: "Quitter l'Équipe",
    teamCode: "Code d'Équipe",
    teamCodePlaceholder: "Entrez le code d'équipe",
    teamCodeInvalid: "Code d'équipe invalide",
    noTeam: "Ne fait pas partie d'une équipe",
    noTeamDesc: "Entrez un code d'équipe pour rejoindre le pouls de votre lieu de travail",
    joinSuccess: "Équipe rejointe avec succès",
    leaveSuccess: "Équipe quittée avec succès",
    leaveConfirmTitle: "Quitter l'Équipe",
    leaveConfirmMessage: "Vous pouvez rejoindre à tout moment avec le code d'équipe.",
    privacyBanner: "Vos données individuelles ne sont jamais partagées. Seules les données agrégées de l'équipe sont visibles.",
    thresholdWarning: "L'équipe a besoin d'au moins {min} participants pour afficher les données agrégées",
    participantCount: '{count} participants',
    aggregateTitle: "Pouls de Capacité de l'Équipe",
    capacityDistribution: 'Distribution de Capacité',
    plenty: 'Suffisante',
    elevated: 'Élevée',
    nearLimit: 'Proche de la Limite',
    topDrivers: 'Principaux Facteurs',
    weeklyTrend: 'Tendance Hebdomadaire',
    trendImproving: 'En Amélioration',
    trendStable: 'Stable',
    trendDeclining: 'En Déclin',
    participationConfidence: 'Confiance des Données',
    confidenceHigh: 'Élevée',
    confidenceMedium: 'Moyenne',
    confidenceLow: 'Faible',
    totalSignals: '{count} signaux cette période',
    actionPanelTitle: 'Actions Suggérées',
    noSuggestions: 'Aucune suggestion pour le moment',
  },

  // ============================================
  // SCHOOL ZONE
  // ============================================
  schoolZone: {
    title: 'Zone Scolaire',
    subtitle: "Soutien de capacité pour les environnements éducatifs",
    joinSchool: "Rejoindre l'École",
    leaveSchool: "Quitter l'École",
    schoolCode: "Code d'École",
    schoolCodePlaceholder: "Entrez le code d'école",
    schoolCodeInvalid: "Code d'école invalide",
    noSchool: "Non inscrit dans une zone scolaire",
    noSchoolDesc: "Entrez un code d'école pour accéder aux fonctionnalités scolaires",
    joinSuccess: 'Zone scolaire rejointe avec succès',
    leaveSuccess: 'Zone scolaire quittée avec succès',
    leaveConfirmTitle: 'Quitter la Zone Scolaire',
    leaveConfirmMessage: "Vous pouvez rejoindre à tout moment avec le code d'école.",
    roleLabel: 'Je suis',
    roleStudent: 'Élève',
    roleCaregiver: 'Parent/Accompagnant',
    roleEducator: 'Éducateur',
    privacyBanner: "Les données individuelles des élèves ne sont jamais partagées avec les éducateurs. Seules les données agrégées de la classe sont visibles.",
    thresholdWarning: "La classe a besoin d'au moins {min} élèves pour afficher les données agrégées",
    studentCount: '{count} élèves',
    studentViewTitle: 'Votre Capacité',
    studentViewDesc: 'Enregistrez votre capacité pour vous aider et obtenir du soutien',
    goToLog: 'Enregistrer Maintenant',
    caregiverViewTitle: 'Fiche Résumé Scolaire',
    caregiverViewDesc: 'Générer un résumé à partager avec les éducateurs',
    generateCard: 'Générer la Fiche Résumé',
    shareCard: 'Partager la Fiche',
    cardDateRange: 'Période : {start} à {end}',
    cardCapacityTrend: 'Tendance de Capacité',
    cardAverageCapacity: 'Capacité Moyenne',
    cardCommonDrivers: 'Facteurs Communs',
    cardWhatHelps: 'Ce qui Aide',
    cardWhatDrains: 'Ce qui Épuise',
    cardEntriesCount: '{count} entrées sur la période',
    notesExcluded: 'Notes personnelles exclues pour la confidentialité',
    educatorViewTitle: 'Vue d\'Ensemble de la Capacité de la Classe',
    educatorViewDesc: 'Vue agrégée des tendances de capacité de la classe',
    classCapacity: 'Distribution de Capacité de la Classe',
    classDrivers: 'Facteurs de la Classe',
    classConfidence: 'Confiance des Données',
    envFactors: {
      quiet_space: 'Espace calme',
      sensory_tools: 'Outils sensoriels',
      movement_breaks: 'Pauses mouvement',
      extra_time: 'Temps supplémentaire',
      small_groups: 'Petits groupes',
      check_ins: 'Points de suivi',
      loud_environment: 'Environnement bruyant',
      bright_lights: 'Lumières vives',
      time_pressure: 'Pression temporelle',
      multiple_instructions: 'Instructions multiples',
      crowded_spaces: 'Espaces bondés',
      social_demands: 'Exigences sociales',
    },
  },
} as const;

export type TranslationKeys = typeof fr;
