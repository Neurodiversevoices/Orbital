/**
 * Orbital Japanese Language Pack v1
 *
 * INVARIANT: Capacity → キャパシティ (primary) | 利用可能なキャパシティ (alternate)
 *
 * This is a standards implementation, not a translation exercise.
 * All terms follow the approved Japanese Capacity Standard.
 *
 * PROHIBITED TERMS (never use):
 * - エネルギー (Energy)
 * - ウェルネス (Wellness)
 * - 燃え尽き (Burnout)
 * - 症状 (Symptoms)
 * - メンタルヘルス (Mental health)
 */

export const ja = {
  // ============================================
  // CORE TERMS (Canonical - Do Not Modify)
  // ============================================
  core: {
    capacity: 'キャパシティ',
    capacityAlternate: '利用可能なキャパシティ',
    today: '今日',
    baseline: '基準値',
    trend: 'トレンド',
    signals: 'シグナル',
    patterns: 'パターン',
    nonDiagnostic: '非診断',
  },

  // ============================================
  // CAPACITY STATES
  // ============================================
  states: {
    resourced: '高キャパシティ',
    stretched: '安定',
    depleted: '低下',
  },

  // ============================================
  // CATEGORIES (Capacity Drivers)
  // ============================================
  categories: {
    sensory: '感覚',
    demand: '負荷',
    social: '社会的',
  },

  // ============================================
  // HOME SCREEN
  // ============================================
  home: {
    title: '現在のキャパシティ状態',
    adjustPrompt: '現在のキャパシティを反映するように調整',
    driversLabel: 'キャパシティ要因（任意）',
    addDetails: '詳細を追加（任意）',
    spectrum: {
      high: '高',
      low: '低下',
    },
  },

  // ============================================
  // PATTERNS SCREEN
  // ============================================
  patterns: {
    // Locked state
    lockedTitle: 'パターンは7つのシグナルで解除されます',
    lockedBody: '意味のある時に記録してください—連続記録や強制はありません。',
    lockedProgress: '{count} / 7 記録済み',

    // Chart context
    chartContext: '時間経過によるキャパシティ — 正規化済み、非診断',

    // Stats
    statsBaseline: '基準値',
    statsTrend: 'トレンド',
    statsDepleted: '低下',

    // Category breakdown
    categoryTitle: 'キャパシティ要因の帰属',
    correlation: '相関',
    noData: 'データなし',

    // Intelligence section
    intelligenceTitle: 'キャパシティ・インテリジェンス',
    trajectoryDeclining: '今週キャパシティが低下傾向',
    trajectoryImproving: '今週キャパシティが上昇傾向',
    trajectoryStable: '今週キャパシティが安定',
    comparedToPrevious: '前週と比較',
    showsPattern: '一貫したパターンを示す',
    correlationWith: 'キャパシティ低下との相関',
    focusOn: '{category}負荷の管理に集中',
    continueTracking: '引き続き記録してパーソナライズされた洞察を構築',

    // Days
    days: {
      sunday: '日曜日',
      monday: '月曜日',
      tuesday: '火曜日',
      wednesday: '水曜日',
      thursday: '木曜日',
      friday: '金曜日',
      saturday: '土曜日',
    },

    // Time periods
    timePeriods: {
      morning: '朝',
      afternoon: '午後',
      evening: '夕方',
    },

    // Longitudinal note
    longitudinalNote: 'パターンはシグナルの継続的な収集で改善されます',
  },

  // ============================================
  // SETTINGS SCREEN
  // ============================================
  settings: {
    dataSection: 'データ',
    preferencesSection: '設定',
    language: '言語',
    languageSublabel: 'アプリの表示言語',
    exportData: 'データをエクスポート',
    exportSublabel: '{count} 件のエントリ',
    generateData: 'デモデータを生成',
    generateSublabel: '6ヶ月分のサンプルエントリ',
    clearData: 'すべてのデータを削除',
    clearSublabel: 'すべて削除',

    // Alerts
    noData: 'データなし',
    noDataMessage: 'エクスポートするデータがありません。',
    noDataToClear: '削除するデータがありません。',
    clearConfirmTitle: 'すべてのデータを削除',
    clearConfirmMessage: '{count} 件のエントリが完全に削除されます。この操作は取り消せません。',
    cancel: 'キャンセル',
    deleteAll: 'すべて削除',

    // About section
    aboutSection: 'このアプリについて',
    appName: 'Orbital',
    tagline: '縦断的キャパシティ・インテリジェンス',
  },

  // ============================================
  // FAMILY / SHARED VIEWS
  // ============================================
  family: {
    sharedView: '共有ビュー — 読み取り専用',
    recordedBy: '{name} が記録したキャパシティ',
  },

  // ============================================
  // TIME LABELS
  // ============================================
  time: {
    today: '今日',
    yesterday: '昨日',
    ranges: {
      '7d': '7日',
      '14d': '14日',
      '1m': '1ヶ月',
      '90d': '90日',
      '1y': '1年',
    },
  },

  // ============================================
  // UNLOCK TIERS
  // ============================================
  unlockTiers: {
    week: {
      label: '週間ビュー',
      toast: '週間ビューが解除されました',
      body: '最初のパターンを見るのに十分なデータが記録されました。これはまだ始まりです—パターンは時間とともにより明確になります。',
    },
    twoWeek: {
      label: '2週間ビュー',
      toast: '2週間ビューが解除されました',
      body: 'トレンド検出が有効になりました。キャパシティがどの方向に動いているか確認できます。',
    },
    month: {
      label: '月間ビュー',
      toast: '月間ビューが解除されました',
      body: 'カテゴリー帰属が利用可能になりました。感覚、負荷、社会的のどの要因がキャパシティの変化と相関しているか確認できます。',
    },
    quarter: {
      label: '四半期ビュー',
      toast: '四半期ビューが解除されました',
      body: 'パターン・インテリジェンスが有効になりました。Orbitalは履歴に基づいて曜日と時間帯のパターンを表示できます。',
    },
    year: {
      label: '年間ビュー',
      toast: '1年間の履歴が解除されました',
      body: '1年分の縦断的キャパシティデータが構築されました。これは稀少です。これはあなたのものです。この深さのパターンは、短期的な追跡では決して明らかにならないものを示します。',
    },
  },

  // ============================================
  // COMMON UI
  // ============================================
  common: {
    done: '完了',
    save: '保存',
    close: '閉じる',
    back: '戻る',
  },

  // ============================================
  // EXPORT
  // ============================================
  export: {
    title: 'エクスポートオプション',
    ninetyDaySummary: '90日サマリー',
    ninetyDaySublabel: '最近のパターンのテキスト概要',
    annualOverview: '年間概要',
    annualSublabel: '完全な年間キャパシティサマリー',
    fullJson: '完全データ（JSON）',
    fullJsonSublabel: '完全バックアップ、機械可読',
    fullCsv: '完全データ（CSV）',
    fullCsvSublabel: 'スプレッドシート互換形式',
    disclaimer: '非診断。正規化された自己申告キャパシティデータ。',
    noData: 'この期間のデータがありません',
    exportSuccess: 'エクスポート準備完了',
  },

  // ============================================
  // SHARING
  // ============================================
  sharing: {
    title: '共有',
    subtitle: '期間限定の読み取り専用アクセスを付与',
    addRecipient: '受信者を追加',
    recipientsSection: '受信者',
    noRecipients: 'まだ受信者が追加されていません',
    recipientTypes: {
      parent: '保護者',
      clinician: '臨床医',
      employer: '雇用主',
      school: '学校',
      partner: 'パートナー',
      other: 'その他',
    },
    duration: {
      7: '7日間',
      14: '14日間',
      30: '30日間',
      90: '90日間',
    },
    durationLabel: '共有期間',
    createShare: '共有リンクを作成',
    shareCreated: '共有リンクが作成されました',
    copyLink: 'リンクをコピー',
    linkCopied: 'リンクがコピーされました',
    revokeShare: 'アクセスを取り消す',
    revokeConfirmTitle: 'アクセスを取り消す',
    revokeConfirmMessage: 'この受信者のアクセスが即座に終了します。',
    deleteRecipientTitle: '受信者を削除',
    deleteRecipientMessage: 'アクティブな共有も取り消されます。',
    auditSection: 'アクティビティログ',
    noAuditEntries: 'アクティビティが記録されていません',
    auditActions: {
      share_created: '共有先',
      share_expired: '共有期限切れ',
      share_revoked: 'アクセス取り消し',
      share_accessed: '閲覧者',
      export_generated: 'エクスポート生成',
    },
    readOnlyBanner: '共有ビュー（読み取り専用）',
    privateLabel: '個人専用',
    confirm: '確認',
    cancel: 'キャンセル',
    delete: '削除',
  },

  // ============================================
  // DISCLAIMER (Institutional contexts)
  // ============================================
  disclaimer: {
    short: '非診断',
    full: 'このツールは自己申告による機能的キャパシティを記録します。臨床評価や診断を構成するものではありません。',
    dataDescription: '時間経過による正規化されたキャパシティシグナル。',
    purpose: '個人使用または共有使用のための利用可能なキャパシティの縦断的記録。',
  },

  // ============================================
  // ENTERPRISE FEATURES
  // ============================================
  enterprise: {
    executiveReports: 'エグゼクティブレポート',
    quarterlyReport: '四半期レポート',
    quarterlyReportSublabel: '90日間エグゼクティブサマリー',
    annualReport: '年間レポート',
    annualReportSublabel: '年間エグゼクティブサマリー',
    historyVault: 'ヒストリーボールト',
    historyVaultSublabel: '長期キャパシティデータ保持',
    totalHistory: '{years}年分のデータ',
    sensoryAlerts: '感覚アラート',
    sensoryAlertsSublabel: '環境負荷モニタリング',
    noiseLevel: '現在の騒音レベル',
    noiseThreshold: 'アラート閾値',
    quietHours: '静音時間',
    monitoringActive: 'モニタリング有効',
    monitoringInactive: 'モニタリング無効',
    institutionalTier: {
      personal: '個人',
      family: 'ファミリー',
      pilot: 'パイロット',
      enterprise: 'エンタープライズ',
    },
  },

  // ============================================
  // GOVERNANCE & COMPLIANCE
  // ============================================
  governance: {
    legal: '法的事項とポリシー',
    legalSublabel: '利用規約、プライバシー、免責事項',
    consent: '同意管理',
    consentSublabel: '同意の確認と管理',
    dataRights: 'データに関する権利',
    dataRightsSublabel: 'データへのアクセス、エクスポート、または削除',
    auditLog: 'アクティビティログ',
    auditLogSublabel: 'アクセスと共有の履歴を表示',
    policies: {
      termsOfService: '利用規約',
      privacyPolicy: 'プライバシーポリシー',
      dataRetention: 'データ保持ポリシー',
      cancellationRefund: 'キャンセルと返金ポリシー',
      nonDiagnostic: '非診断に関する免責事項',
      jurisdiction: '管轄と準拠法',
    },
    consentDetails: {
      dataCollection: 'データ収集',
      dataProcessing: 'データ処理',
      dataSharing: 'データ共有',
      dataExport: 'データエクスポート',
      institutionalAccess: '機関アクセス',
      granted: '付与済み',
      revoked: '取り消し済み',
      expired: '期限切れ',
      grantConsent: '同意を付与',
      revokeConsent: '同意を取り消す',
    },
    offboarding: {
      title: 'アカウント終了',
      subtitle: 'アカウントを閉鎖しデータを削除',
      initiateButton: '終了プロセスを開始',
      exportWindow: 'エクスポート期間',
      daysRemaining: '残り{days}日',
      scheduledDeletion: '削除予定',
      cancelOffboarding: '終了をキャンセル',
      confirmationRequired: '確認が必要です',
    },
    disclosure: {
      title: '開示事項',
      noDisclosures: 'アクティブな開示事項はありません',
      acknowledge: '確認する',
      acknowledged: '確認済み',
    },
  },

  // ============================================
  // ACCESSIBILITY
  // ============================================
  accessibility: {
    title: 'アクセシビリティ',
    subtitle: '体験をカスタマイズ',
    visualSection: '視覚',
    motorSection: '運動機能と入力',
    cognitiveSection: '認知',
    audioSection: 'オーディオ',
    dataSection: 'データと接続',
    highContrast: 'ハイコントラスト',
    highContrastDesc: '視認性を高めるためにコントラストを上げる',
    colorBlindMode: '色覚',
    colorBlindModeDesc: '色覚異常に合わせて色を最適化',
    colorBlindOptions: {
      none: 'デフォルト',
      protanopia: '1型色覚（赤色弱）',
      deuteranopia: '2型色覚（緑色弱）',
      tritanopia: '3型色覚（青色弱）',
      monochrome: 'モノクロ',
    },
    textSize: 'テキストサイズ',
    textSizeDesc: 'アプリ全体のテキストサイズを調整',
    textSizeOptions: { default: 'デフォルト', large: '大', xlarge: '特大' },
    reduceMotion: 'モーションを減らす',
    reduceMotionDesc: 'アニメーションを最小限に',
    bigButtonMode: '大きなボタン',
    bigButtonModeDesc: 'タップしやすい大きなボタン',
    buttonSize: 'ボタンサイズ',
    buttonSizeOptions: { default: 'デフォルト', large: '大', xlarge: '特大' },
    oneHandedMode: '片手モード',
    oneHandedModeDesc: '片手操作用にレイアウトを最適化',
    oneHandedOptions: { off: 'オフ', left: '左手', right: '右手' },
    hapticFeedback: '触覚フィードバック',
    hapticFeedbackDesc: '確認やアラートを振動で感じる',
    hapticIntensity: '触覚の強さ',
    hapticIntensityOptions: { off: 'オフ', light: '弱', medium: '中', strong: '強' },
    simplifiedText: 'シンプルなテキスト',
    simplifiedTextDesc: '短くシンプルな言葉を使用',
    confirmActions: 'アクションを確認',
    confirmActionsDesc: '変更前に「本当によろしいですか？」を表示',
    undoEnabled: '元に戻すを有効化',
    undoEnabledDesc: '最近のアクションを元に戻せるようにする',
    showTooltips: 'ヒントを表示',
    showTooltipsDesc: '役立つヒントを表示',
    voiceControl: '音声コントロール',
    voiceControlDesc: '音声コマンドで操作',
    dictation: '音声入力',
    dictationDesc: '話してメモを追加',
    liveCaptions: 'ライブキャプション',
    liveCaptionsDesc: 'オーディオの字幕を表示',
    offlineMode: 'オフラインモード',
    offlineModeDesc: 'インターネット接続なしで作業',
    lowDataMode: '低データモード',
    lowDataModeDesc: 'データ使用量を削減',
    undoToast: 'アクションを元に戻しました',
    undoAvailable: 'タップして元に戻す',
    undoExpired: '元に戻す期限切れ',
    guidedSetup: 'セットアップウィザード',
    guidedSetupDesc: 'アプリの設定をサポート',
    guidedSetupCompleted: 'セットアップ完了',
    startSetup: 'セットアップを開始',
    simpleMode: 'シンプルモード',
    simpleModeDesc: 'ワンタップで最大限のアクセシビリティ',
    simplified: {
      home: { title: '調子はどう？', adjustPrompt: 'スライダーを動かす', spectrum: { high: '良い', low: '低い' } },
      states: { resourced: '良い', stretched: 'まあまあ', depleted: '低い' },
    },
  },

  // ============================================
  // DEMO MODE
  // ============================================
  demo: {
    advancedSection: '詳細設定',
    demoMode: 'デモモード',
    demoModeDesc: 'スクリーンショットやデモ用のサンプルデータを読み込む',
    demoModeActive: 'デモモードがアクティブです',
    demoModeActiveDesc: 'サンプルデータを使用中。実データは安全に保存されています。',
    enableDemo: 'デモモードを有効化',
    disableDemo: 'デモモードを終了',
    reseedData: '新しいデータを生成',
    reseedDataDesc: '新しいデモデータセットを作成',
    clearDemoData: 'デモデータを消去',
    clearDemoDataDesc: '空の状態にリセット',
    duration: {
      '30d': '30シグナル',
      '90d': '90シグナル',
      '180d': '180シグナル',
      '365d': '365シグナル',
      '3y': '3年',
      '5y': '5年',
      '10y': '10年',
    },
    durationLabel: 'データ範囲',
    unlockHint: 'ロゴを5回タップして詳細設定をアンロック',
    advancedUnlocked: '詳細設定がアンロックされました',
    confirmEnable: 'デモモードを有効にしますか？',
    confirmEnableMessage: '実データは安全にバックアップされ、サンプルデータに置き換えられます。',
    confirmDisable: 'デモモードを終了しますか？',
    confirmDisableMessage: 'デモデータは削除され、実データが復元されます。',
    dataRestored: '実データが復元されました',
    demoEnabled: 'デモモードが有効になりました',
    demoBanner: 'デモ',
    processing: '処理中...',
  },

  // ============================================
  // TEAM MODE (Enterprise Capacity Pulse)
  // ============================================
  teamMode: {
    title: 'チームモード',
    subtitle: '職場キャパシティパルス（オプトイン）',
    joinTeam: 'チームに参加',
    leaveTeam: 'チームを離脱',
    teamCode: 'チームコード',
    teamCodePlaceholder: 'チームコードを入力',
    teamCodeInvalid: '無効なチームコード',
    noTeam: 'チームに所属していません',
    noTeamDesc: 'チームコードを入力して職場パルスに参加',
    joinSuccess: 'チームに参加しました',
    leaveSuccess: 'チームから離脱しました',
    leaveConfirmTitle: 'チームを離脱',
    leaveConfirmMessage: 'チームコードでいつでも再参加できます。',
    privacyBanner: '個人データは共有されません。チームの集計データのみが表示されます。',
    thresholdWarning: '集計データを表示するには、チームに最低{min}人の参加者が必要です',
    participantCount: '{count}人の参加者',
    aggregateTitle: 'チームキャパシティパルス',
    capacityDistribution: 'キャパシティ分布',
    plenty: '十分',
    elevated: '上昇',
    nearLimit: '限界付近',
    topDrivers: '主要因',
    weeklyTrend: '週間トレンド',
    trendImproving: '改善中',
    trendStable: '安定',
    trendDeclining: '低下中',
    participationConfidence: 'データ信頼度',
    confidenceHigh: '高',
    confidenceMedium: '中',
    confidenceLow: '低',
    totalSignals: 'この期間のシグナル数: {count}',
    actionPanelTitle: '推奨アクション',
    noSuggestions: '現在の提案はありません',
  },

  // ============================================
  // SCHOOL ZONE (Student/Caregiver/Educator)
  // ============================================
  schoolZone: {
    title: 'スクールゾーン',
    subtitle: '教育環境向けキャパシティサポート',
    joinSchool: '学校に参加',
    leaveSchool: '学校を離脱',
    schoolCode: '学校コード',
    schoolCodePlaceholder: '学校コードを入力',
    schoolCodeInvalid: '無効な学校コード',
    noSchool: 'スクールゾーンに登録されていません',
    noSchoolDesc: '学校コードを入力して学校機能にアクセス',
    joinSuccess: 'スクールゾーンに参加しました',
    leaveSuccess: 'スクールゾーンから離脱しました',
    leaveConfirmTitle: 'スクールゾーンを離脱',
    leaveConfirmMessage: '学校コードでいつでも再参加できます。',
    roleLabel: '私は',
    roleStudent: '生徒',
    roleCaregiver: '保護者',
    roleEducator: '教育者',
    privacyBanner: '個々の生徒のデータは教育者と共有されません。クラスの集計データのみが表示されます。',
    thresholdWarning: '集計データを表示するには、クラスに最低{min}人の生徒が必要です',
    studentCount: '{count}人の生徒',
    studentViewTitle: 'あなたのキャパシティ',
    studentViewDesc: '自分を助けサポートを受けるためにキャパシティを記録',
    goToLog: '今すぐ記録',
    caregiverViewTitle: '学校サマリーカード',
    caregiverViewDesc: '教育者と共有するためのサマリーを生成',
    generateCard: 'サマリーカードを生成',
    shareCard: 'カードを共有',
    cardDateRange: '期間: {start} ～ {end}',
    cardCapacityTrend: 'キャパシティトレンド',
    cardAverageCapacity: '平均キャパシティ',
    cardCommonDrivers: '共通の要因',
    cardWhatHelps: '助けになるもの',
    cardWhatDrains: '消耗させるもの',
    cardEntriesCount: '期間中の記録数: {count}',
    notesExcluded: 'プライバシー保護のため個人メモは除外',
    educatorViewTitle: 'クラスキャパシティ概要',
    educatorViewDesc: 'クラスのキャパシティパターンの集計ビュー',
    classCapacity: 'クラスのキャパシティ分布',
    classDrivers: 'クラスの要因',
    classConfidence: 'データ信頼度',
    envFactors: {
      quiet_space: '静かな空間',
      sensory_tools: '感覚ツール',
      movement_breaks: '運動休憩',
      extra_time: '追加時間',
      small_groups: '少人数グループ',
      check_ins: 'チェックイン',
      loud_environment: '騒がしい環境',
      bright_lights: '明るい照明',
      time_pressure: '時間的プレッシャー',
      multiple_instructions: '複数の指示',
      crowded_spaces: '混雑した空間',
      social_demands: '社会的要求',
    },
  },
} as const;

export type TranslationKeys = typeof ja;
