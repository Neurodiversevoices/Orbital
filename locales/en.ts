/**
 * Orbital English Language Pack v1
 *
 * INVARIANT: Capacity is the primary term
 *
 * PROHIBITED TERMS (never use):
 * - Energy (use Capacity)
 * - Wellness
 * - Burnout
 * - Symptoms
 * - Mental health
 */

export const en = {
  // ============================================
  // CORE TERMS (Canonical - Do Not Modify)
  // ============================================
  core: {
    capacity: 'Capacity',
    capacityAlternate: 'Available capacity',
    today: 'Today',
    baseline: 'Baseline',
    trend: 'Trend',
    signals: 'Signals',
    patterns: 'Patterns',
    nonDiagnostic: 'Non-diagnostic',
  },

  // ============================================
  // CAPACITY STATES
  // ============================================
  states: {
    resourced: 'High capacity',
    stretched: 'Stable',
    depleted: 'Depleted',
  },

  // ============================================
  // CATEGORIES (Capacity Drivers)
  // ============================================
  categories: {
    sensory: 'Sensory',
    demand: 'Demand',
    social: 'Social',
  },

  // ============================================
  // HOME SCREEN
  // ============================================
  home: {
    title: "Today's Capacity State",
    adjustPrompt: 'Adjust to reflect current capacity',
    driversLabel: 'Primary capacity drivers (optional)',
    addDetails: 'Add details (optional)',
    spectrum: {
      high: 'RESOURCED',
      low: 'DEPLETED',
    },
  },

  // ============================================
  // PATTERNS SCREEN
  // ============================================
  patterns: {
    // Locked state
    lockedTitle: 'Patterns unlock at 7 signals',
    lockedBody: "Log when it matters. No requirements, no pressure.",
    lockedProgress: '{count} of 7 logged',

    // Chart context
    chartContext: 'Capacity over time — normalized, non-diagnostic',

    // Stats
    statsBaseline: 'Baseline',
    statsTrend: 'Trend',
    statsDepleted: 'Depleted',

    // Category breakdown
    categoryTitle: 'Capacity Driver Attribution',
    correlation: 'correlation',
    noData: 'no data',

    // Observations section
    intelligenceTitle: 'Observations',
    trajectoryDeclining: 'Capacity declining this period',
    trajectoryImproving: 'Capacity improving this period',
    trajectoryStable: 'Capacity stable this period',
    comparedToPrevious: 'Compared to prior period',
    showsPattern: 'shows consistent pattern',
    correlationWith: 'correlation with reduced capacity',
    focusOn: 'Consider monitoring {category} load',
    continueTracking: 'Record depth strengthens over time',

    // Days
    days: {
      sunday: 'Sundays',
      monday: 'Mondays',
      tuesday: 'Tuesdays',
      wednesday: 'Wednesdays',
      thursday: 'Thursdays',
      friday: 'Fridays',
      saturday: 'Saturdays',
    },

    // Time periods
    timePeriods: {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
    },

    // Longitudinal note
    longitudinalNote: 'Patterns improve with continued signal collection',
  },

  // ============================================
  // SETTINGS SCREEN
  // ============================================
  settings: {
    dataSection: 'DATA',
    preferencesSection: 'PREFERENCES',
    language: 'Language',
    languageSublabel: 'App display language',
    exportData: 'Export Data',
    exportSublabel: '{count} entries',
    generateData: 'Generate Demo Data',
    generateSublabel: '6 months of sample entries',
    clearData: 'Clear All Data',
    clearSublabel: 'Delete everything',

    // Alerts
    noData: 'No Data',
    noDataMessage: 'There is no data to export.',
    noDataToClear: 'There is no data to clear.',
    clearConfirmTitle: 'Clear All Data',
    clearConfirmMessage: 'This will permanently delete {count} entries. This cannot be undone.',
    cancel: 'Cancel',
    deleteAll: 'Delete All',

    // About section
    aboutSection: 'ABOUT',
    appName: 'Orbital',
    tagline: 'Longitudinal Capacity Intelligence',
  },

  // ============================================
  // FAMILY / SHARED VIEWS
  // ============================================
  family: {
    sharedView: 'Shared view — read only',
    recordedBy: 'Capacity recorded by {name}',
  },

  // ============================================
  // TIME LABELS
  // ============================================
  time: {
    today: 'Today',
    yesterday: 'Yesterday',
    ranges: {
      '7d': '7D',
      '14d': '14D',
      '1m': '1M',
      '90d': '90D',
      '1y': '1Y',
    },
  },

  // ============================================
  // UNLOCK TIERS
  // ============================================
  unlockTiers: {
    week: {
      label: 'Week View',
      toast: 'Week View unlocked',
      body: "You've logged enough to see your first patterns. This is just the beginning—patterns sharpen with time.",
    },
    twoWeek: {
      label: 'Two-Week View',
      toast: 'Two-Week View unlocked',
      body: 'Trend detection is now active. You can start to see which direction your capacity is moving.',
    },
    month: {
      label: 'Month View',
      toast: 'Month View unlocked',
      body: 'Category attribution is now available. See which drivers—sensory, demand, social—correlate with your capacity shifts.',
    },
    quarter: {
      label: 'Quarter View',
      toast: 'Quarter View unlocked',
      body: 'Pattern intelligence is now active. Orbital can surface day-of-week and time-of-day patterns based on your history.',
    },
    year: {
      label: 'Year View',
      toast: '1-Year History unlocked',
      body: "You've built a full year of longitudinal capacity data. This is rare. This is yours. Patterns at this depth reveal what short-term tracking never could.",
    },
  },

  // ============================================
  // COMMON UI
  // ============================================
  common: {
    done: 'Done',
    save: 'Save',
    close: 'Close',
    back: 'Back',
  },

  // ============================================
  // EXPORT
  // ============================================
  export: {
    title: 'Export Options',
    ninetyDaySummary: '90-Day Summary',
    ninetyDaySublabel: 'Text overview of recent patterns',
    annualOverview: 'Annual Overview',
    annualSublabel: 'Full year capacity summary',
    fullJson: 'Full Data (JSON)',
    fullJsonSublabel: 'Complete backup, machine-readable',
    fullCsv: 'Full Data (CSV)',
    fullCsvSublabel: 'Spreadsheet-compatible format',
    disclaimer: 'Non-diagnostic. Normalized self-reported capacity data.',
    noData: 'No data available for this range',
    exportSuccess: 'Export ready',
  },

  // ============================================
  // SHARING
  // ============================================
  sharing: {
    title: 'Sharing',
    subtitle: 'Grant time-limited, read-only access',
    addRecipient: 'Add Recipient',
    recipientsSection: 'RECIPIENTS',
    noRecipients: 'No recipients added yet',
    recipientTypes: {
      parent: 'Parent / Caregiver',
      clinician: 'Clinician',
      employer: 'Employer',
      school: 'School',
      partner: 'Partner',
      other: 'Other',
    },
    duration: {
      7: '7 days',
      14: '14 days',
      30: '30 days',
      90: '90 days',
    },
    durationLabel: 'Share Duration',
    createShare: 'Create Share Link',
    shareCreated: 'Share link created',
    copyLink: 'Copy Link',
    linkCopied: 'Link copied',
    revokeShare: 'Revoke Access',
    revokeConfirmTitle: 'Revoke Access',
    revokeConfirmMessage: 'This will immediately end access for this recipient.',
    deleteRecipientTitle: 'Remove Recipient',
    deleteRecipientMessage: 'This will also revoke any active shares.',
    auditSection: 'ACTIVITY LOG',
    noAuditEntries: 'No activity recorded',
    auditActions: {
      share_created: 'Shared with',
      share_expired: 'Share expired for',
      share_revoked: 'Access revoked for',
      share_accessed: 'Viewed by',
      export_generated: 'Export generated',
    },
    readOnlyBanner: 'Shared view (read-only)',
    privateLabel: 'Private to you',
    confirm: 'Confirm',
    cancel: 'Cancel',
    delete: 'Delete',
  },

  // ============================================
  // DISCLAIMER (Institutional contexts)
  // ============================================
  disclaimer: {
    short: 'Non-diagnostic',
    full: 'This tool records self-reported functional capacity. It does not constitute clinical evaluation or diagnosis.',
    dataDescription: 'Normalized capacity signals over time.',
    purpose: 'Longitudinal record of available capacity for personal or shared use.',
  },

  // ============================================
  // ENTERPRISE FEATURES
  // ============================================
  enterprise: {
    executiveReports: 'Executive Reports',
    quarterlyReport: 'Quarterly Report',
    quarterlyReportSublabel: '90-day executive summary',
    annualReport: 'Annual Report',
    annualReportSublabel: 'Full year executive summary',
    historyVault: 'History Vault',
    historyVaultSublabel: 'Multi-year capacity data retention',
    totalHistory: '{years} years of data',
    sensoryAlerts: 'Sensory Alerts',
    sensoryAlertsSublabel: 'Environmental load monitoring',
    noiseLevel: 'Current noise level',
    noiseThreshold: 'Alert threshold',
    quietHours: 'Quiet hours',
    monitoringActive: 'Monitoring active',
    monitoringInactive: 'Monitoring inactive',
    institutionalTier: {
      personal: 'Personal',
      family: 'Family',
      pilot: 'Pilot',
      enterprise: 'Enterprise',
    },
  },

  // ============================================
  // GOVERNANCE & COMPLIANCE
  // ============================================
  governance: {
    legal: 'Legal & Policies',
    legalSublabel: 'Terms, privacy, disclaimers',
    consent: 'Consent Management',
    consentSublabel: 'Review and manage your consents',
    dataRights: 'Your Data Rights',
    dataRightsSublabel: 'Access, export, or delete your data',
    auditLog: 'Activity Log',
    auditLogSublabel: 'View access and sharing history',
    policies: {
      termsOfService: 'Terms of Service',
      privacyPolicy: 'Privacy Policy',
      dataRetention: 'Data Retention Policy',
      cancellationRefund: 'Cancellation & Refund Policy',
      nonDiagnostic: 'Non-Diagnostic Disclaimer',
      jurisdiction: 'Jurisdiction & Governing Law',
    },
    consentDetails: {
      dataCollection: 'Data Collection',
      dataProcessing: 'Data Processing',
      dataSharing: 'Data Sharing',
      dataExport: 'Data Export',
      institutionalAccess: 'Institutional Access',
      granted: 'Granted',
      revoked: 'Revoked',
      expired: 'Expired',
      grantConsent: 'Grant Consent',
      revokeConsent: 'Revoke Consent',
    },
    offboarding: {
      title: 'Account Termination',
      subtitle: 'Close your account and delete data',
      initiateButton: 'Begin Termination Process',
      exportWindow: 'Export Window',
      daysRemaining: '{days} days remaining',
      scheduledDeletion: 'Scheduled deletion',
      cancelOffboarding: 'Cancel Termination',
      confirmationRequired: 'Confirmation required',
    },
    disclosure: {
      title: 'Disclosures',
      noDisclosures: 'No active disclosures',
      acknowledge: 'Acknowledge',
      acknowledged: 'Acknowledged',
    },
  },

  // ============================================
  // ACCESSIBILITY
  // ============================================
  accessibility: {
    title: 'Accessibility',
    subtitle: 'Customize your experience',

    // Sections
    visualSection: 'VISUAL',
    motorSection: 'MOTOR & INPUT',
    cognitiveSection: 'COGNITIVE',
    audioSection: 'AUDIO',
    dataSection: 'DATA & CONNECTIVITY',

    // Visual settings
    highContrast: 'High Contrast',
    highContrastDesc: 'Increase contrast for better visibility',
    colorBlindMode: 'Color Vision',
    colorBlindModeDesc: 'Optimize colors for color blindness',
    colorBlindOptions: {
      none: 'Default',
      protanopia: 'Protanopia (Red-weak)',
      deuteranopia: 'Deuteranopia (Green-weak)',
      tritanopia: 'Tritanopia (Blue-weak)',
      monochrome: 'Monochrome',
    },
    textSize: 'Text Size',
    textSizeDesc: 'Adjust text size throughout the app',
    textSizeOptions: {
      default: 'Default',
      large: 'Large',
      xlarge: 'Extra Large',
    },
    reduceMotion: 'Reduce Motion',
    reduceMotionDesc: 'Minimize animations',

    // Motor settings
    bigButtonMode: 'Large Touch Targets',
    bigButtonModeDesc: 'Bigger buttons, easier to tap',
    buttonSize: 'Button Size',
    buttonSizeOptions: {
      default: 'Default',
      large: 'Large',
      xlarge: 'Extra Large',
    },
    oneHandedMode: 'One-Handed Mode',
    oneHandedModeDesc: 'Optimize layout for single-hand use',
    oneHandedOptions: {
      off: 'Off',
      left: 'Left Hand',
      right: 'Right Hand',
    },

    // Haptics
    hapticFeedback: 'Haptic Feedback',
    hapticFeedbackDesc: 'Feel confirmations and alerts',
    hapticIntensity: 'Haptic Intensity',
    hapticIntensityOptions: {
      off: 'Off',
      light: 'Light',
      medium: 'Medium',
      strong: 'Strong',
    },

    // Cognitive
    simplifiedText: 'Simplified Text',
    simplifiedTextDesc: 'Use shorter, simpler language',
    confirmActions: 'Confirm Actions',
    confirmActionsDesc: 'Show "Are you sure?" before changes',
    undoEnabled: 'Enable Undo',
    undoEnabledDesc: 'Allow undoing recent actions',
    showTooltips: 'Show Hints',
    showTooltipsDesc: 'Display helpful tips',

    // Voice
    voiceControl: 'Voice Control',
    voiceControlDesc: 'Control with voice commands',
    dictation: 'Dictation',
    dictationDesc: 'Speak to add notes',

    // Captions
    liveCaptions: 'Live Captions',
    liveCaptionsDesc: 'Show captions for audio',

    // Data
    offlineMode: 'Offline Mode',
    offlineModeDesc: 'Work without internet connection',
    lowDataMode: 'Low Data Mode',
    lowDataModeDesc: 'Reduce data usage',

    // Undo
    undoToast: 'Action undone',
    undoAvailable: 'Tap to undo',
    undoExpired: 'Undo expired',

    // Guided setup
    guidedSetup: 'Setup Wizard',
    guidedSetupDesc: 'Get help setting up the app',
    guidedSetupCompleted: 'Setup completed',
    startSetup: 'Start Setup',

    // Simple Mode
    simpleMode: 'Simple Mode',
    simpleModeDesc: 'Maximum accessibility with one tap',

    // Simplified text variants
    simplified: {
      home: {
        title: 'How are you?',
        adjustPrompt: 'Move the slider',
        spectrum: {
          high: 'GOOD',
          low: 'LOW',
        },
      },
      states: {
        resourced: 'Good',
        stretched: 'OK',
        depleted: 'Low',
      },
    },
  },

  // ============================================
  // DEMO MODE
  // ============================================
  demo: {
    advancedSection: 'ADVANCED',
    demoMode: 'Demo Mode',
    demoModeDesc: 'Load sample data for screenshots and demos',
    demoModeActive: 'Demo mode is active',
    demoModeActiveDesc: 'Using sample data. Real data is safely stored.',
    enableDemo: 'Enable Demo Mode',
    disableDemo: 'Exit Demo Mode',
    reseedData: 'Generate New Data',
    reseedDataDesc: 'Create fresh demo dataset',
    clearDemoData: 'Clear Demo Data',
    clearDemoDataDesc: 'Reset to empty state',
    duration: {
      '30d': '1 Month',
      '90d': '3 Months',
      '180d': '6 Months',
      '365d': '1 Year',
      '3y': '3 Years',
      '5y': '5 Years',
      '10y': '10 Years',
    },
    durationLabel: 'Data Range',
    unlockHint: 'Tap logo 5x to unlock advanced settings',
    advancedUnlocked: 'Advanced settings unlocked',
    confirmEnable: 'Enable Demo Mode?',
    confirmEnableMessage: 'Your real data will be safely backed up and replaced with sample data.',
    confirmDisable: 'Exit Demo Mode?',
    confirmDisableMessage: 'Demo data will be removed and your real data will be restored.',
    dataRestored: 'Real data restored',
    demoEnabled: 'Demo mode enabled',
    demoBanner: 'DEMO',
    processing: 'Processing...',
  },

  // ============================================
  // TEAM MODE (Enterprise Capacity Pulse)
  // ============================================
  teamMode: {
    title: 'Team Mode',
    subtitle: 'Opt-in workplace capacity pulse',
    joinTeam: 'Join Team',
    leaveTeam: 'Leave Team',
    teamCode: 'Team Code',
    teamCodePlaceholder: 'Enter team code',
    teamCodeInvalid: 'Invalid team code',
    noTeam: 'Not part of a team',
    noTeamDesc: 'Enter a team code to join your workplace pulse',
    joinSuccess: 'Joined team successfully',
    leaveSuccess: 'Left team successfully',
    leaveConfirmTitle: 'Leave Team',
    leaveConfirmMessage: 'You can rejoin anytime with the team code.',

    // Privacy banner
    privacyBanner: 'Your individual data is never shared. Only aggregate team data is visible.',

    // Threshold warning
    thresholdWarning: 'Team needs at least {min} participants to show aggregate data',
    participantCount: '{count} participants',

    // Aggregate display
    aggregateTitle: 'Team Capacity Pulse',
    capacityDistribution: 'Capacity Distribution',
    plenty: 'Plenty',
    elevated: 'Elevated',
    nearLimit: 'Near Limit',
    topDrivers: 'Top Drivers',
    weeklyTrend: 'Weekly Trend',
    trendImproving: 'Improving',
    trendStable: 'Stable',
    trendDeclining: 'Declining',
    participationConfidence: 'Data Confidence',
    confidenceHigh: 'High',
    confidenceMedium: 'Medium',
    confidenceLow: 'Low',
    totalSignals: '{count} signals this period',

    // Action panel
    actionPanelTitle: 'Suggested Actions',
    noSuggestions: 'No suggestions at this time',
  },

  // ============================================
  // SCHOOL ZONE (Student/Caregiver/Educator)
  // ============================================
  schoolZone: {
    title: 'School Zone',
    subtitle: 'Capacity support for education settings',
    joinSchool: 'Join School',
    leaveSchool: 'Leave School',
    schoolCode: 'School Code',
    schoolCodePlaceholder: 'Enter school code',
    schoolCodeInvalid: 'Invalid school code',
    noSchool: 'Not enrolled in a school zone',
    noSchoolDesc: 'Enter a school code to access school features',
    joinSuccess: 'Joined school zone successfully',
    leaveSuccess: 'Left school zone successfully',
    leaveConfirmTitle: 'Leave School Zone',
    leaveConfirmMessage: 'You can rejoin anytime with the school code.',

    // Role selection
    roleLabel: 'I am a',
    roleStudent: 'Student',
    roleCaregiver: 'Caregiver',
    roleEducator: 'Educator',

    // Privacy banner
    privacyBanner: 'Individual student data is never shared with educators. Only aggregate class data is visible.',

    // Threshold warning
    thresholdWarning: 'Class needs at least {min} students to show aggregate data',
    studentCount: '{count} students',

    // Student view
    studentViewTitle: 'Your Capacity',
    studentViewDesc: 'Log your capacity to help yourself and get support',
    goToLog: 'Log Now',

    // Caregiver view
    caregiverViewTitle: 'School Summary Card',
    caregiverViewDesc: 'Generate a summary to share with educators',
    generateCard: 'Generate Summary Card',
    shareCard: 'Share Card',
    cardDateRange: 'Period: {start} to {end}',
    cardCapacityTrend: 'Capacity Trend',
    cardAverageCapacity: 'Average Capacity',
    cardCommonDrivers: 'Common Drivers',
    cardWhatHelps: 'What Helps',
    cardWhatDrains: 'What Drains',
    cardEntriesCount: '{count} entries in period',
    notesExcluded: 'Personal notes excluded for privacy',

    // Educator view
    educatorViewTitle: 'Class Capacity Overview',
    educatorViewDesc: 'Aggregate view of class capacity patterns',
    classCapacity: 'Class Capacity Distribution',
    classDrivers: 'Class Drivers',
    classConfidence: 'Data Confidence',

    // Environment factors (School Summary Card)
    envFactors: {
      quiet_space: 'Quiet space',
      sensory_tools: 'Sensory tools',
      movement_breaks: 'Movement breaks',
      extra_time: 'Extra time',
      small_groups: 'Small groups',
      check_ins: 'Check-ins',
      loud_environment: 'Loud environment',
      bright_lights: 'Bright lights',
      time_pressure: 'Time pressure',
      multiple_instructions: 'Multiple instructions',
      crowded_spaces: 'Crowded spaces',
      social_demands: 'Social demands',
    },
  },
} as const;

export type TranslationKeys = typeof en;
