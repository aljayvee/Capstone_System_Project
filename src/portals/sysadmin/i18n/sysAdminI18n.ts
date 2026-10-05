export type SysAdminLanguage = "zh" | "en";

export interface SysAdminTranslations {
  // Brand & Shell Header
  brandTitle: string;
  brandSubtitle: string;
  apiOnline: string;
  dbActive: string;
  loggedInAs: string;
  roleSysAdmin: string;
  signOutTooltip: string;
  initializingConsole: string;
  staffPortalLink: string;

  // Navigation Tabs
  tabOverview: string;
  tabThreats: string;
  tabUsers: string;
  tabAudit: string;
  tabTraffic: string;
  tabDevOps: string;
  tabStaff: string;
  tabSettings: string;

  // System Pulse / Overview
  overviewTitle: string;
  overviewSubtitle: string;
  allSystemsOperational: string;
  serverProcessTitle: string;
  serverProcessDesc: string;
  databaseTitle: string;
  databaseDesc: string;
  securitySessionsTitle: string;
  securitySessionsDesc: string;
  trafficAnalyzerTitle: string;
  trafficAnalyzerDesc: string;
  diagnosticHubTitle: string;
  threatDefenseCardTitle: string;
  threatDefenseCardDesc: string;
  userAuditCardTitle: string;
  userAuditCardDesc: string;
  securityLogsCardTitle: string;
  securityLogsCardDesc: string;
  trafficCardTitle: string;
  trafficCardDesc: string;

  // Login Screen
  loginSystemTitle: string;
  loginSystemSubtitle: string;
  loginCardTitle: string;
  loginCardSubtitle: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  capsLockWarning: string;
  loginButton: string;
  loginButtonVerifying: string;
  loginFooterNotice: string;
  copyrightNotice: string;

  // 2FA Verification
  twoFactorTitle: string;
  twoFactorSubtitle: string;
  twoFactorEmailSent: string;
  twoFactorCodeLabel: string;
  twoFactorCodePlaceholder: string;
  twoFactorTrustDevice: string;
  twoFactorVerifyButton: string;
  twoFactorVerifyingButton: string;
  twoFactorResendCode: string;
  twoFactorResendingCode: string;
  twoFactorResentSuccess: string;
  twoFactorCancelButton: string;
  twoFactorMissingCode: string;
  twoFactorMissingCredentials: string;

  // Language Switcher Labels
  langChinese: string;
  langEnglish: string;
  langDefaultTag: string;

  // Sub-Module Titles & Tabs
  devopsHeaderTitle: string;
  devopsHeaderSubtitle: string;
  devopsTabTelemetry: string;
  devopsTabServices: string;
  devopsTabBackups: string;
  devopsTabLogs: string;
  devopsTabAlerts: string;

  threatsHeaderTitle: string;
  threatsHeaderSubtitle: string;
  threatsTabBlocklist: string;
  threatsTabWhitelist: string;
  threatsTabStream: string;
  threatsTabPolicies: string;

  usersHeaderTitle: string;
  usersHeaderSubtitle: string;
  usersTabAll: string;
  usersTabOwner: string;
  usersTabDispatcher: string;
  usersTabRider: string;
  usersTabCustomer: string;

  auditHeaderTitle: string;
  auditHeaderSubtitle: string;
  auditTabAuth: string;
  auditTabModifications: string;
  auditTabThreats: string;
  auditTabLifecycle: string;

  trafficHeaderTitle: string;
  trafficHeaderSubtitle: string;
  trafficTabOverview: string;
  trafficTabLiveTerminal: string;

  staffHeaderTitle: string;
  staffHeaderSubtitle: string;

  settingsHeaderTitle: string;
  settingsHeaderSubtitle: string;
}

export const SYSADMIN_TRANSLATIONS: Record<SysAdminLanguage, SysAdminTranslations> = {
  zh: {
    // Brand & Shell Header
    brandTitle: "SUGO EXPRESS",
    brandSubtitle: "系统管理运维中枢",
    apiOnline: "API 端口 5000 在线",
    dbActive: "MariaDB 数据库正常运行",
    loggedInAs: "当前操作员:",
    roleSysAdmin: "系统管理员",
    signOutTooltip: "退出系统管理控制台",
    initializingConsole: "正在初始化 IT 运维管理控制台...",
    staffPortalLink: "返回员工系统",

    // Navigation Tabs
    tabOverview: "系统脉搏",
    tabThreats: "威胁防御",
    tabUsers: "账户监控",
    tabAudit: "审计日志",
    tabTraffic: "流量分析",
    tabDevOps: "运维控制",
    tabStaff: "运维团队",
    tabSettings: "安全设置",

    // System Pulse / Overview
    overviewTitle: "系统脉搏与核心基础设施概览",
    overviewSubtitle: "实时监测后端微服务、MariaDB 关系数据库及网络性能遥测状态",
    allSystemsOperational: "所有核心系统运行正常",
    serverProcessTitle: "服务端核心进程",
    serverProcessDesc: "PM2 守护进程在线 • 端口 5000",
    databaseTitle: "关系型数据库集群",
    databaseDesc: "3NF 严格范式架构 • Prisma ORM",
    securitySessionsTitle: "安全凭证与认证会话",
    securitySessionsDesc: "单设备并发挤占驱逐策略已激活",
    trafficAnalyzerTitle: "实时网络流量分析引擎",
    trafficAnalyzerDesc: "GoAccess • Nginx 实时日志分析引擎",
    diagnosticHubTitle: "快捷运维与安全诊断中枢",
    threatDefenseCardTitle: "IP 威胁防御与边缘拦截",
    threatDefenseCardDesc: "管理恶意 IP 拦截名单、白名单豁免权限及实时入侵防护",
    userAuditCardTitle: "全域用户账户审计与监视",
    userAuditCardDesc: "全时段监视业主、调度员、配送骑手与终端客户在线会话态势",
    securityLogsCardTitle: "安全与合规审计日志中心",
    securityLogsCardDesc: "调阅鉴权失败记录、异地设备接管事件与敏感配置操作日志",
    trafficCardTitle: "Web 访问流量与网络态势",
    trafficCardDesc: "启动经过双向安全鉴权的 GoAccess 实时访问流量终端分析器",

    // Login Screen
    loginSystemTitle: "SUGO EXPRESS",
    loginSystemSubtitle: "系统管理运维控制台",
    loginCardTitle: "管理员身份安全鉴权",
    loginCardSubtitle: "高安全等级生产运维与基础设施架构中枢",
    usernameLabel: "管理员账号",
    usernamePlaceholder: "请输入系统管理员用户名",
    passwordLabel: "访问密钥 / 密码",
    passwordPlaceholder: "请输入管理员密码",
    capsLockWarning: "大写锁定键已开启 (Caps Lock)",
    loginButton: "登录运维控制台",
    loginButtonVerifying: "正在验证身份安全凭证...",
    loginFooterNotice: "仅限授权人员访问。系统已启动全维度审计，所有访问尝试、执行指令均记录客户端 IP 地址、设备指纹及时间戳。",
    copyrightNotice: "SUGO Express © 2026 • 核心系统安全与网络通信架构部",

    // 2FA Verification
    twoFactorTitle: "双因素身份安全验证 (2FA)",
    twoFactorSubtitle: "自适应多重安全身份质询",
    twoFactorEmailSent: "安全验证动态代码已发送至您的受保护管理员邮箱:",
    twoFactorCodeLabel: "6位动态安全验证码",
    twoFactorCodePlaceholder: "请输入 6 位数字验证码",
    twoFactorTrustDevice: "信任此设备 30 天（免安全质询）",
    twoFactorVerifyButton: "验证凭证并进入控制台",
    twoFactorVerifyingButton: "正在校验安全代码...",
    twoFactorResendCode: "重新发送验证码",
    twoFactorResendingCode: "正在重新发送...",
    twoFactorResentSuccess: "新的动态安全验证码已发送至您的管理员邮箱。",
    twoFactorCancelButton: "取消并返回常规登录",
    twoFactorMissingCode: "请输入完整的 6 位动态安全验证码。",
    twoFactorMissingCredentials: "请输入管理员用户名与密码。",

    // Language Switcher Labels
    langChinese: "简体中文",
    langEnglish: "English",
    langDefaultTag: "默认",

    // Sub-Module Titles & Tabs
    devopsHeaderTitle: "DevOps 基础设施运维调度指挥中心",
    devopsHeaderSubtitle: "系统进程遥测、微服务生命周期治理、Gzip 数据库压缩快照、日志脱敏实时流与 Telegram 应急联动",
    devopsTabTelemetry: "概览与核心遥测",
    devopsTabServices: "服务控制与生命周期",
    devopsTabBackups: "数据库快照与容灾备份",
    devopsTabLogs: "实时系统日志 (自动脱敏)",
    devopsTabAlerts: "Telegram 应急告警集成",

    threatsHeaderTitle: "网络安全威胁防御与边缘拦截中心",
    threatsHeaderSubtitle: "双层级 IP 防御引擎：Nginx 内核边缘丢弃 + Express 内存级快速拦截与恶意扫描识别",
    threatsTabBlocklist: "活动黑名单",
    threatsTabWhitelist: "免疫白名单",
    threatsTabStream: "实时入侵检测日志",
    threatsTabPolicies: "防御规则策略",

    usersHeaderTitle: "多角色全域用户账户监控与会话审计",
    usersHeaderSubtitle: "实时监视业主、调度员、配送骑手与终端客户在线状态、设备会话及账户安全治理",
    usersTabAll: "全部角色",
    usersTabOwner: "业主运营 (Owner)",
    usersTabDispatcher: "调度员 (Dispatcher)",
    usersTabRider: "配送骑手 (Rider)",
    usersTabCustomer: "终端客户 (Customer)",

    auditHeaderTitle: "系统合规与操作审计日志中心",
    auditHeaderSubtitle: "全域安全操作溯源、用户生命周期变更与权限治理追踪（严格脱敏与隐私保护规范）",
    auditTabAuth: "登录鉴权与会话",
    auditTabModifications: "账户配置与状态变更",
    auditTabThreats: "安全威胁与入侵事件",
    auditTabLifecycle: "系统生命周期",

    trafficHeaderTitle: "Web 访问流量与网络态势监控",
    trafficHeaderSubtitle: "实时监测 Nginx 反向代理层访问吞吐、地理分布、IP 频次与协议状态",
    trafficTabOverview: "原生指标概览",
    trafficTabLiveTerminal: "GoAccess 实时终端报告",

    staffHeaderTitle: "IT 系统运维管理员团队管理",
    staffHeaderSubtitle: "查看与配置具有系统级运维权限的 tbl_sys_admin 专业技术人员",

    settingsHeaderTitle: "系统管理员个人安全与账户设置",
    settingsHeaderSubtitle: "管理登录凭证、多因素认证策略、受信任设备列表与密码合规性",
  },
  en: {
    // Brand & Shell Header
    brandTitle: "SUGO EXPRESS",
    brandSubtitle: "IT Management",
    apiOnline: "API: 5000 Online",
    dbActive: "MariaDB Active",
    loggedInAs: "Logged in as:",
    roleSysAdmin: "SYSADMIN",
    signOutTooltip: "Sign Out of SysAdmin Portal",
    initializingConsole: "Initializing IT Console...",
    staffPortalLink: "Staff Portal",

    // Navigation Tabs
    tabOverview: "System Pulse",
    tabThreats: "Threat Center",
    tabUsers: "Account Monitor",
    tabAudit: "Audit Logs",
    tabTraffic: "Traffic (GoAccess)",
    tabDevOps: "DevOps Suite",
    tabStaff: "IT Admins",
    tabSettings: "Account Settings",

    // System Pulse / Overview
    overviewTitle: "System Pulse & Infrastructure Overview",
    overviewSubtitle: "Real-time status of backend services, database, and telemetry",
    allSystemsOperational: "All Systems Operational",
    serverProcessTitle: "Server Process",
    serverProcessDesc: "PM2 Online • Port 5000",
    databaseTitle: "Relational Database",
    databaseDesc: "3NF Schema • Prisma ORM",
    securitySessionsTitle: "Security Sessions",
    securitySessionsDesc: "Single-Device Eviction Active",
    trafficAnalyzerTitle: "Traffic Analyzer",
    trafficAnalyzerDesc: "GoAccess • Nginx Real-Time Log Engine",
    diagnosticHubTitle: "Quick IT Diagnostic Hub",
    threatDefenseCardTitle: "IP Threat Defense",
    threatDefenseCardDesc: "Manage blacklisted IPs, whitelist immunity, and intrusion alerts",
    userAuditCardTitle: "Audit User Accounts",
    userAuditCardDesc: "Inspect online presence across Owner, Dispatcher, Rider, Customer",
    securityLogsCardTitle: "Inspect Security Logs",
    securityLogsCardDesc: "View login failures, device takeovers, and profile modifications",
    trafficCardTitle: "Monitor Web Traffic",
    trafficCardDesc: "Launch authenticated GoAccess access log viewer",

    // Login Screen
    loginSystemTitle: "SUGO EXPRESS",
    loginSystemSubtitle: "IT Management Console",
    loginCardTitle: "Administrator Authentication",
    loginCardSubtitle: "High-security infrastructure command & operations portal",
    usernameLabel: "Administrator Account",
    usernamePlaceholder: "Enter administrator username",
    passwordLabel: "Access Key / Password",
    passwordPlaceholder: "Enter administrator password",
    capsLockWarning: "Caps Lock is active",
    loginButton: "Access IT Console",
    loginButtonVerifying: "Verifying Credentials...",
    loginFooterNotice: "Authorized personnel only. All access attempts and commands are logged with client IP address and timestamp.",
    copyrightNotice: "SUGO Express © 2026 • System Security & Network Architecture",

    // 2FA Verification
    twoFactorTitle: "Two-Factor Authentication",
    twoFactorSubtitle: "Adaptive security identity challenge",
    twoFactorEmailSent: "A security verification code has been dispatched to your administrator email:",
    twoFactorCodeLabel: "6-Digit Security Code",
    twoFactorCodePlaceholder: "Enter 6-digit code",
    twoFactorTrustDevice: "Trust this device for 30 days (bypass 2FA challenge)",
    twoFactorVerifyButton: "Verify & Enter Console",
    twoFactorVerifyingButton: "Verifying Security Code...",
    twoFactorResendCode: "Resend Code",
    twoFactorResendingCode: "Resending...",
    twoFactorResentSuccess: "A fresh verification code has been sent to your administrator email.",
    twoFactorCancelButton: "Cancel & Return to Login",
    twoFactorMissingCode: "Please enter the complete 6-digit verification code.",
    twoFactorMissingCredentials: "Please enter both username and password.",

    // Language Switcher Labels
    langChinese: "简体中文",
    langEnglish: "English",
    langDefaultTag: "Default",

    // Sub-Module Titles & Tabs
    devopsHeaderTitle: "DevOps & Infrastructure Command Center",
    devopsHeaderSubtitle: "Process telemetry, service lifecycle controls, gzip database backups, live sanitized log streaming, and emergency alerts",
    devopsTabTelemetry: "Overview & Telemetry",
    devopsTabServices: "Service Controls",
    devopsTabBackups: "Database Backups",
    devopsTabLogs: "Live System Logs",
    devopsTabAlerts: "Telegram Alerts",

    threatsHeaderTitle: "Threat Defense & Edge Intrusion Center",
    threatsHeaderSubtitle: "Dual-tier IP defense: Nginx edge drops + Express in-memory O(1) heuristic intrusion engine",
    threatsTabBlocklist: "Active Blocklist",
    threatsTabWhitelist: "Whitelist Immunity",
    threatsTabStream: "Live Intrusion Feed",
    threatsTabPolicies: "Defense Policies",

    usersHeaderTitle: "Multi-Role User Account Monitoring & Inspection",
    usersHeaderSubtitle: "Real-time visibility into Owner, Dispatcher, Rider, and Customer presence, sessions, and account governance",
    usersTabAll: "All Roles",
    usersTabOwner: "Owner Operations",
    usersTabDispatcher: "Dispatchers",
    usersTabRider: "Delivery Riders",
    usersTabCustomer: "Customers",

    auditHeaderTitle: "Categorized Audit Logs & Compliance Center",
    auditHeaderSubtitle: "Comprehensive audit trails covering authentications, modifications, security threats, and system lifecycle",
    auditTabAuth: "Auth & Sessions",
    auditTabModifications: "Account Modifications",
    auditTabThreats: "Security Threats",
    auditTabLifecycle: "System Lifecycle",

    trafficHeaderTitle: "Web Traffic Analytics & Threat Monitoring",
    trafficHeaderSubtitle: "Real-time visibility into Nginx requests, geolocations, IP frequencies, and response codes",
    trafficTabOverview: "Native Metrics",
    trafficTabLiveTerminal: "GoAccess Terminal Report",

    staffHeaderTitle: "IT Administrator Staff Governance",
    staffHeaderSubtitle: "Oversee and provision administrative personnel in tbl_sys_admin",

    settingsHeaderTitle: "Account & Profile Settings",
    settingsHeaderSubtitle: "Manage your credentials, 2FA policies, active trusted devices, and security preferences",
  },
};
