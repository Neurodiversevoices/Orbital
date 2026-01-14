/**
 * Orbital Brazilian Portuguese Language Pack v1
 *
 * INVARIANT: Capacity → Capacidade (primary) | Capacidade disponível (alternate)
 *
 * This is a standards implementation, not a translation exercise.
 * All terms follow the approved Brazilian Portuguese Capacity Standard.
 *
 * PROHIBITED TERMS (never use):
 * - Energia (Energy)
 * - Bem-estar (Wellness)
 * - Esgotamento (Burnout)
 * - Sintomas (Symptoms)
 * - Saúde mental (Mental health)
 */

export const ptBR = {
  // ============================================
  // CORE TERMS (Canonical - Do Not Modify)
  // ============================================
  core: {
    capacity: 'Capacidade',
    capacityAlternate: 'Capacidade disponível',
    today: 'Hoje',
    baseline: 'Linha de base',
    trend: 'Tendência',
    signals: 'Sinais',
    patterns: 'Padrões',
    nonDiagnostic: 'Não diagnóstico',
  },

  // ============================================
  // CAPACITY STATES
  // ============================================
  states: {
    resourced: 'Capacidade alta',
    stretched: 'Estável',
    depleted: 'Reduzida',
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
    title: 'Estado de capacidade atual',
    adjustPrompt: 'Ajuste para refletir sua capacidade atual',
    driversLabel: 'Fatores de capacidade (opcional)',
    addDetails: 'Adicionar detalhes (opcional)',
    spectrum: {
      high: 'ALTA',
      low: 'REDUZIDA',
    },
  },

  // ============================================
  // PATTERNS SCREEN
  // ============================================
  patterns: {
    // Locked state
    lockedTitle: 'Padrões são liberados com 7 sinais',
    lockedBody: 'Registre quando fizer sentido—sem sequências, sem pressão.',
    lockedProgress: '{count} de 7 registrados',

    // Chart context
    chartContext: 'Capacidade ao longo do tempo — normalizada, não diagnóstica',

    // Stats
    statsBaseline: 'Linha de base',
    statsTrend: 'Tendência',
    statsDepleted: 'Reduzida',

    // Category breakdown
    categoryTitle: 'Atribuição de fatores de capacidade',
    correlation: 'correlação',
    noData: 'sem dados',

    // Intelligence section
    intelligenceTitle: 'Inteligência de capacidade',
    trajectoryDeclining: 'Capacidade em declínio esta semana',
    trajectoryImproving: 'Capacidade em ascensão esta semana',
    trajectoryStable: 'Capacidade estável esta semana',
    comparedToPrevious: 'Comparado à semana anterior',
    showsPattern: 'mostra padrão consistente',
    correlationWith: 'correlação com capacidade reduzida',
    focusOn: 'Foque em gerenciar a carga de {category}',
    continueTracking: 'Continue registrando para desenvolver insights personalizados',

    // Days
    days: {
      sunday: 'Domingos',
      monday: 'Segundas',
      tuesday: 'Terças',
      wednesday: 'Quartas',
      thursday: 'Quintas',
      friday: 'Sextas',
      saturday: 'Sábados',
    },

    // Time periods
    timePeriods: {
      morning: 'Manhã',
      afternoon: 'Tarde',
      evening: 'Noite',
    },

    // Longitudinal note
    longitudinalNote: 'Padrões melhoram com a coleta contínua de sinais',
  },

  // ============================================
  // SETTINGS SCREEN
  // ============================================
  settings: {
    dataSection: 'DADOS',
    preferencesSection: 'PREFERÊNCIAS',
    language: 'Idioma',
    languageSublabel: 'Idioma de exibição do aplicativo',
    exportData: 'Exportar dados',
    exportSublabel: '{count} registros',
    generateData: 'Gerar dados de demonstração',
    generateSublabel: '6 meses de registros de exemplo',
    clearData: 'Limpar todos os dados',
    clearSublabel: 'Apagar tudo',

    // Alerts
    noData: 'Sem dados',
    noDataMessage: 'Não há dados para exportar.',
    noDataToClear: 'Não há dados para limpar.',
    clearConfirmTitle: 'Limpar todos os dados',
    clearConfirmMessage: 'Isso excluirá permanentemente {count} registros. Esta ação não pode ser desfeita.',
    cancel: 'Cancelar',
    deleteAll: 'Excluir tudo',

    // About section
    aboutSection: 'SOBRE',
    appName: 'Orbital',
    tagline: 'Inteligência de capacidade longitudinal',
  },

  // ============================================
  // FAMILY / SHARED VIEWS
  // ============================================
  family: {
    sharedView: 'Visualização compartilhada — somente leitura',
    recordedBy: 'Capacidade registrada por {name}',
  },

  // ============================================
  // TIME LABELS
  // ============================================
  time: {
    today: 'Hoje',
    yesterday: 'Ontem',
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
      label: 'Visualização semanal',
      toast: 'Visualização semanal liberada',
      body: 'Você registrou o suficiente para ver seus primeiros padrões. Este é apenas o começo—os padrões ficam mais nítidos com o tempo.',
    },
    twoWeek: {
      label: 'Visualização de duas semanas',
      toast: 'Visualização de duas semanas liberada',
      body: 'A detecção de tendências agora está ativa. Você pode começar a ver em qual direção sua capacidade está se movendo.',
    },
    month: {
      label: 'Visualização mensal',
      toast: 'Visualização mensal liberada',
      body: 'A atribuição por categoria agora está disponível. Veja quais fatores—sensorial, demanda, social—se correlacionam com suas mudanças de capacidade.',
    },
    quarter: {
      label: 'Visualização trimestral',
      toast: 'Visualização trimestral liberada',
      body: 'A inteligência de padrões agora está ativa. O Orbital pode revelar padrões por dia da semana e horário do dia com base no seu histórico.',
    },
    year: {
      label: 'Visualização anual',
      toast: 'Histórico de 1 ano liberado',
      body: 'Você construiu um ano completo de dados longitudinais de capacidade. Isso é raro. Isso é seu. Padrões nessa profundidade revelam o que o rastreamento de curto prazo nunca poderia.',
    },
  },

  // ============================================
  // COMMON UI
  // ============================================
  common: {
    done: 'Concluído',
    save: 'Salvar',
    close: 'Fechar',
    back: 'Voltar',
  },

  // ============================================
  // EXPORT
  // ============================================
  export: {
    title: 'Opções de exportação',
    ninetyDaySummary: 'Resumo de 90 dias',
    ninetyDaySublabel: 'Visão geral dos padrões recentes',
    annualOverview: 'Visão anual',
    annualSublabel: 'Resumo de capacidade do ano completo',
    fullJson: 'Dados completos (JSON)',
    fullJsonSublabel: 'Backup completo, legível por máquina',
    fullCsv: 'Dados completos (CSV)',
    fullCsvSublabel: 'Formato compatível com planilhas',
    disclaimer: 'Não diagnóstico. Dados de capacidade auto-relatados normalizados.',
    noData: 'Nenhum dado disponível para este período',
    exportSuccess: 'Exportação pronta',
  },

  // ============================================
  // SHARING
  // ============================================
  sharing: {
    title: 'Compartilhamento',
    subtitle: 'Conceder acesso temporário somente leitura',
    addRecipient: 'Adicionar destinatário',
    recipientsSection: 'DESTINATÁRIOS',
    noRecipients: 'Nenhum destinatário adicionado ainda',
    recipientTypes: {
      parent: 'Pai / Cuidador',
      clinician: 'Profissional de saúde',
      employer: 'Empregador',
      school: 'Escola',
      partner: 'Parceiro(a)',
      other: 'Outro',
    },
    duration: {
      7: '7 dias',
      14: '14 dias',
      30: '30 dias',
      90: '90 dias',
    },
    durationLabel: 'Duração do compartilhamento',
    createShare: 'Criar link de compartilhamento',
    shareCreated: 'Link de compartilhamento criado',
    copyLink: 'Copiar link',
    linkCopied: 'Link copiado',
    revokeShare: 'Revogar acesso',
    revokeConfirmTitle: 'Revogar acesso',
    revokeConfirmMessage: 'Isso encerrará imediatamente o acesso para este destinatário.',
    deleteRecipientTitle: 'Remover destinatário',
    deleteRecipientMessage: 'Isso também revogará quaisquer compartilhamentos ativos.',
    auditSection: 'REGISTRO DE ATIVIDADE',
    noAuditEntries: 'Nenhuma atividade registrada',
    auditActions: {
      share_created: 'Compartilhado com',
      share_expired: 'Compartilhamento expirado para',
      share_revoked: 'Acesso revogado para',
      share_accessed: 'Visualizado por',
      export_generated: 'Exportação gerada',
    },
    readOnlyBanner: 'Visualização compartilhada (somente leitura)',
    privateLabel: 'Privado para você',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    delete: 'Excluir',
  },

  // ============================================
  // DISCLAIMER (Institutional contexts)
  // ============================================
  disclaimer: {
    short: 'Não diagnóstico',
    full: 'Esta ferramenta registra capacidade funcional auto-relatada. Não constitui avaliação clínica ou diagnóstico.',
    dataDescription: 'Sinais de capacidade normalizados ao longo do tempo.',
    purpose: 'Registro longitudinal de capacidade disponível para uso pessoal ou compartilhado.',
  },

  // ============================================
  // ENTERPRISE FEATURES
  // ============================================
  enterprise: {
    executiveReports: 'Relatórios Executivos',
    quarterlyReport: 'Relatório Trimestral',
    quarterlyReportSublabel: 'Resumo executivo de 90 dias',
    annualReport: 'Relatório Anual',
    annualReportSublabel: 'Resumo executivo do ano completo',
    historyVault: 'Arquivo Histórico',
    historyVaultSublabel: 'Retenção de dados de capacidade a longo prazo',
    totalHistory: '{years} anos de dados',
    sensoryAlerts: 'Alertas Sensoriais',
    sensoryAlertsSublabel: 'Monitoramento de carga ambiental',
    noiseLevel: 'Nível de ruído atual',
    noiseThreshold: 'Limite de alerta',
    quietHours: 'Horário de silêncio',
    monitoringActive: 'Monitoramento ativo',
    monitoringInactive: 'Monitoramento inativo',
    institutionalTier: {
      personal: 'Pessoal',
      family: 'Família',
      pilot: 'Piloto',
      enterprise: 'Empresarial',
    },
  },

  // ============================================
  // GOVERNANCE & COMPLIANCE
  // ============================================
  governance: {
    legal: 'Jurídico e Políticas',
    legalSublabel: 'Termos, privacidade, avisos',
    consent: 'Gerenciamento de Consentimento',
    consentSublabel: 'Revise e gerencie seus consentimentos',
    dataRights: 'Seus Direitos de Dados',
    dataRightsSublabel: 'Acesse, exporte ou exclua seus dados',
    auditLog: 'Registro de Atividade',
    auditLogSublabel: 'Visualizar histórico de acesso e compartilhamento',
    policies: {
      termsOfService: 'Termos de Serviço',
      privacyPolicy: 'Política de Privacidade',
      dataRetention: 'Política de Retenção de Dados',
      cancellationRefund: 'Política de Cancelamento e Reembolso',
      nonDiagnostic: 'Aviso de Não Diagnóstico',
      jurisdiction: 'Jurisdição e Lei Aplicável',
    },
    consentDetails: {
      dataCollection: 'Coleta de Dados',
      dataProcessing: 'Processamento de Dados',
      dataSharing: 'Compartilhamento de Dados',
      dataExport: 'Exportação de Dados',
      institutionalAccess: 'Acesso Institucional',
      granted: 'Concedido',
      revoked: 'Revogado',
      expired: 'Expirado',
      grantConsent: 'Conceder Consentimento',
      revokeConsent: 'Revogar Consentimento',
    },
    offboarding: {
      title: 'Encerramento de Conta',
      subtitle: 'Feche sua conta e exclua dados',
      initiateButton: 'Iniciar Processo de Encerramento',
      exportWindow: 'Janela de Exportação',
      daysRemaining: '{days} dias restantes',
      scheduledDeletion: 'Exclusão agendada',
      cancelOffboarding: 'Cancelar Encerramento',
      confirmationRequired: 'Confirmação necessária',
    },
    disclosure: {
      title: 'Divulgações',
      noDisclosures: 'Nenhuma divulgação ativa',
      acknowledge: 'Confirmar ciência',
      acknowledged: 'Ciência confirmada',
    },
  },

  // ============================================
  // ACCESSIBILITY
  // ============================================
  accessibility: {
    title: 'Acessibilidade',
    subtitle: 'Personalize sua experiência',

    // Simple Mode (quick toggle for max accessibility)
    simpleMode: 'Modo Simples',
    simpleModeDesc: 'Acessibilidade máxima com um toque',

    visualSection: 'VISUAL',
    motorSection: 'MOTOR E ENTRADA',
    cognitiveSection: 'COGNITIVO',
    audioSection: 'ÁUDIO',
    dataSection: 'DADOS E CONECTIVIDADE',
    highContrast: 'Alto Contraste',
    highContrastDesc: 'Aumentar contraste para melhor visibilidade',
    colorBlindMode: 'Visão de Cores',
    colorBlindModeDesc: 'Otimizar cores para daltonismo',
    colorBlindOptions: {
      none: 'Padrão',
      protanopia: 'Protanopia (Vermelho fraco)',
      deuteranopia: 'Deuteranopia (Verde fraco)',
      tritanopia: 'Tritanopia (Azul fraco)',
      monochrome: 'Monocromático',
    },
    textSize: 'Tamanho do Texto',
    textSizeDesc: 'Ajustar tamanho do texto no aplicativo',
    textSizeOptions: { default: 'Padrão', large: 'Grande', xlarge: 'Extra Grande' },
    reduceMotion: 'Reduzir Movimento',
    reduceMotionDesc: 'Minimizar animações',
    bigButtonMode: 'Botões Grandes',
    bigButtonModeDesc: 'Botões maiores, mais fáceis de tocar',
    buttonSize: 'Tamanho dos Botões',
    buttonSizeOptions: { default: 'Padrão', large: 'Grande', xlarge: 'Extra Grande' },
    oneHandedMode: 'Modo Uma Mão',
    oneHandedModeDesc: 'Otimizar layout para uso com uma mão',
    oneHandedOptions: { off: 'Desativado', left: 'Mão Esquerda', right: 'Mão Direita' },
    hapticFeedback: 'Feedback Háptico',
    hapticFeedbackDesc: 'Sentir confirmações e alertas',
    hapticIntensity: 'Intensidade Háptica',
    hapticIntensityOptions: { off: 'Desativado', light: 'Leve', medium: 'Médio', strong: 'Forte' },
    simplifiedText: 'Texto Simplificado',
    simplifiedTextDesc: 'Usar linguagem mais curta e simples',
    confirmActions: 'Confirmar Ações',
    confirmActionsDesc: 'Mostrar "Tem certeza?" antes de alterações',
    undoEnabled: 'Ativar Desfazer',
    undoEnabledDesc: 'Permitir desfazer ações recentes',
    showTooltips: 'Mostrar Dicas',
    showTooltipsDesc: 'Exibir dicas úteis',
    voiceControl: 'Controle por Voz',
    voiceControlDesc: 'Controlar com comandos de voz',
    dictation: 'Ditado',
    dictationDesc: 'Falar para adicionar notas',
    liveCaptions: 'Legendas ao Vivo',
    liveCaptionsDesc: 'Mostrar legendas para áudio',
    offlineMode: 'Modo Offline',
    offlineModeDesc: 'Trabalhar sem conexão com internet',
    lowDataMode: 'Modo Economia de Dados',
    lowDataModeDesc: 'Reduzir uso de dados',
    undoToast: 'Ação desfeita',
    undoAvailable: 'Toque para desfazer',
    undoExpired: 'Desfazer expirado',
    guidedSetup: 'Assistente de Configuração',
    guidedSetupDesc: 'Obter ajuda para configurar o aplicativo',
    guidedSetupCompleted: 'Configuração concluída',
    startSetup: 'Iniciar Configuração',
    simplified: {
      home: { title: 'Como você está?', adjustPrompt: 'Mova o controle', spectrum: { high: 'BEM', low: 'BAIXO' } },
      states: { resourced: 'Bem', stretched: 'OK', depleted: 'Baixo' },
    },
  },

  // ============================================
  // TEAM MODE (Enterprise Capacity Pulse)
  // ============================================
  teamMode: {
    title: 'Modo Equipe',
    subtitle: 'Pulso de capacidade no local de trabalho (opcional)',
    joinTeam: 'Entrar na Equipe',
    leaveTeam: 'Sair da Equipe',
    teamCode: 'Código da Equipe',
    teamCodePlaceholder: 'Digite o código da equipe',
    teamCodeInvalid: 'Código de equipe inválido',
    noTeam: 'Você não faz parte de uma equipe',
    noTeamDesc: 'Digite um código de equipe para entrar no pulso do seu local de trabalho',
    joinSuccess: 'Entrou na equipe com sucesso',
    leaveSuccess: 'Saiu da equipe com sucesso',
    leaveConfirmTitle: 'Sair da Equipe',
    leaveConfirmMessage: 'Você pode entrar novamente a qualquer momento com o código da equipe.',
    privacyBanner: 'Seus dados individuais nunca são compartilhados. Apenas dados agregados da equipe são visíveis.',
    thresholdWarning: 'A equipe precisa de pelo menos {min} participantes para mostrar dados agregados',
    participantCount: '{count} participantes',
    aggregateTitle: 'Pulso de Capacidade da Equipe',
    capacityDistribution: 'Distribuição de Capacidade',
    plenty: 'Abundante',
    elevated: 'Elevado',
    nearLimit: 'Perto do Limite',
    topDrivers: 'Principais Fatores',
    weeklyTrend: 'Tendência Semanal',
    trendImproving: 'Melhorando',
    trendStable: 'Estável',
    trendDeclining: 'Declinando',
    participationConfidence: 'Confiança dos Dados',
    confidenceHigh: 'Alta',
    confidenceMedium: 'Média',
    confidenceLow: 'Baixa',
    totalSignals: '{count} sinais neste período',
    actionPanelTitle: 'Ações Sugeridas',
    noSuggestions: 'Nenhuma sugestão no momento',
  },

  // ============================================
  // SCHOOL ZONE (Student/Caregiver/Educator)
  // ============================================
  schoolZone: {
    title: 'Zona Escolar',
    subtitle: 'Suporte de capacidade para ambientes educacionais',
    joinSchool: 'Entrar na Escola',
    leaveSchool: 'Sair da Escola',
    schoolCode: 'Código da Escola',
    schoolCodePlaceholder: 'Digite o código da escola',
    schoolCodeInvalid: 'Código de escola inválido',
    noSchool: 'Você não está inscrito em uma zona escolar',
    noSchoolDesc: 'Digite um código de escola para acessar os recursos escolares',
    joinSuccess: 'Entrou na zona escolar com sucesso',
    leaveSuccess: 'Saiu da zona escolar com sucesso',
    leaveConfirmTitle: 'Sair da Zona Escolar',
    leaveConfirmMessage: 'Você pode entrar novamente a qualquer momento com o código da escola.',
    roleLabel: 'Eu sou um/uma',
    roleStudent: 'Estudante',
    roleCaregiver: 'Cuidador',
    roleEducator: 'Educador',
    privacyBanner: 'Dados individuais dos estudantes nunca são compartilhados com educadores. Apenas dados agregados da turma são visíveis.',
    thresholdWarning: 'A turma precisa de pelo menos {min} estudantes para mostrar dados agregados',
    studentCount: '{count} estudantes',
    studentViewTitle: 'Sua Capacidade',
    studentViewDesc: 'Registre sua capacidade para se ajudar e receber suporte',
    goToLog: 'Registrar Agora',
    caregiverViewTitle: 'Cartão de Resumo Escolar',
    caregiverViewDesc: 'Gere um resumo para compartilhar com educadores',
    generateCard: 'Gerar Cartão de Resumo',
    shareCard: 'Compartilhar Cartão',
    cardDateRange: 'Período: {start} a {end}',
    cardCapacityTrend: 'Tendência de Capacidade',
    cardAverageCapacity: 'Capacidade Média',
    cardCommonDrivers: 'Fatores Comuns',
    cardWhatHelps: 'O que Ajuda',
    cardWhatDrains: 'O que Esgota',
    cardEntriesCount: '{count} entradas no período',
    notesExcluded: 'Notas pessoais excluídas por privacidade',
    educatorViewTitle: 'Visão Geral da Capacidade da Turma',
    educatorViewDesc: 'Visão agregada dos padrões de capacidade da turma',
    classCapacity: 'Distribuição de Capacidade da Turma',
    classDrivers: 'Fatores da Turma',
    classConfidence: 'Confiança dos Dados',
    envFactors: {
      quiet_space: 'Espaço tranquilo',
      sensory_tools: 'Ferramentas sensoriais',
      movement_breaks: 'Pausas de movimento',
      extra_time: 'Tempo extra',
      small_groups: 'Pequenos grupos',
      check_ins: 'Check-ins',
      loud_environment: 'Ambiente barulhento',
      bright_lights: 'Luzes brilhantes',
      time_pressure: 'Pressão de tempo',
      multiple_instructions: 'Múltiplas instruções',
      crowded_spaces: 'Espaços lotados',
      social_demands: 'Demandas sociais',
    },
  },

  // ============================================
  // DEMO MODE
  // ============================================
  demo: {
    advancedSection: 'AVANÇADO',
    demoMode: 'Modo Demo',
    demoModeDesc: 'Carregar dados de exemplo para capturas de tela e demos',
    demoModeActive: 'Modo demo está ativo',
    demoModeActiveDesc: 'Usando dados de exemplo. Seus dados reais estão guardados com segurança.',
    enableDemo: 'Ativar Modo Demo',
    disableDemo: 'Sair do Modo Demo',
    reseedData: 'Gerar Novos Dados',
    reseedDataDesc: 'Criar novo conjunto de dados demo',
    clearDemoData: 'Limpar Dados Demo',
    clearDemoDataDesc: 'Reiniciar para estado vazio',
    duration: {
      '30d': '1 Mês',
      '90d': '3 Meses',
      '180d': '6 Meses',
      '365d': '1 Ano',
      '3y': '3 Anos',
      '5y': '5 Anos',
      '10y': '10 Anos',
    },
    durationLabel: 'Intervalo de Dados',
    unlockHint: 'Toque no logo 5x para desbloquear configurações avançadas',
    advancedUnlocked: 'Configurações avançadas desbloqueadas',
    confirmEnable: 'Ativar Modo Demo?',
    confirmEnableMessage: 'Seus dados reais serão salvos com segurança e substituídos por dados de exemplo.',
    confirmDisable: 'Sair do Modo Demo?',
    confirmDisableMessage: 'Os dados demo serão removidos e seus dados reais serão restaurados.',
    dataRestored: 'Dados reais restaurados',
    demoEnabled: 'Modo demo ativado',
    demoBanner: 'DEMO',
    processing: 'Processando...',
  },
} as const;

export type TranslationKeys = typeof ptBR;
