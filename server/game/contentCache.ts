import {
  buildChallengeMetaMap,
  loadContentBootstrap,
  type ChallengeMeta,
  type ContentBootstrap,
  type PublicTitle,
} from "../services/contentService";

/** 内置兜底目录：数据库未就绪时保证服务可启动 */
const FALLBACK_CHALLENGE_META: Record<string, ChallengeMeta> = {
  "first-commit": { baseXp: 40, version: 1 },
  "staging-focus": { baseXp: 35, version: 1 },
  "branch-sword": { baseXp: 50, version: 1 },
  "merge-river": { baseXp: 55, version: 1 },
  "reset-path": { baseXp: 60, version: 1 },
  "conflict-calm": { baseXp: 70, version: 1 },
};

// 内存中的全量内容缓存
let cachedBootstrap: ContentBootstrap | null = null;
let challengeMetaCache: Record<string, ChallengeMeta> = { ...FALLBACK_CHALLENGE_META };

/**
 * 从数据库刷新全部内容缓存。
 * 功能：服务启动与内容变更后调用。
 * 参数：无。
 * 返回值：Promise，完成后更新内存缓存。
 */
export const refreshContentCache = async () => {
  const bootstrap = await loadContentBootstrap();
  cachedBootstrap = bootstrap;
  challengeMetaCache = buildChallengeMetaMap(bootstrap.challenges);
};

/**
 * 读取当前缓存的内容包。
 * 功能：供 bootstrap API 直接返回缓存，减少重复查库。
 * 参数：无。
 * 返回值：ContentBootstrap 或 null。
 */
export const getCachedBootstrap = () => cachedBootstrap;

/**
 * 读取全部已发布关卡 key。
 * 功能：称号 complete_all 规则与通关校验使用。
 * 参数：无。
 * 返回值：challenge_key 数组。
 */
export const getAllChallengeKeys = () => {
  if (cachedBootstrap) {
    return cachedBootstrap.challenges.map((item) => item.id);
  }
  return Object.keys(FALLBACK_CHALLENGE_META);
};

/**
 * 判断关卡 key 是否合法。
 * 功能：提交通关结果前校验 challengeKey。
 * 参数：challengeKey - 前端传来的关卡标识。
 * 返回值：true 表示合法。
 */
export const isValidChallengeKey = (challengeKey: string) => {
  return Object.prototype.hasOwnProperty.call(challengeMetaCache, challengeKey);
};

/**
 * 读取关卡基础经验值。
 * 功能：服务端计算 earnedXp 时使用。
 * 参数：challengeKey - 关卡标识。
 * 返回值：基础经验值。
 */
export const getChallengeBaseXp = (challengeKey: string) => {
  return challengeMetaCache[challengeKey]?.baseXp ?? 0;
};

/**
 * 读取关卡版本。
 * 功能：写入 attempts / progress 时使用。
 * 参数：challengeKey - 关卡标识。
 * 返回值：版本号，未知关卡返回 1。
 */
export const getChallengeVersion = (challengeKey: string) => {
  return challengeMetaCache[challengeKey]?.version ?? 1;
};

/**
 * 读取称号目录。
 * 功能：称号解锁与展示名解析。
 * 参数：无。
 * 返回值：称号数组。
 */
export const getCachedTitles = (): PublicTitle[] => {
  return cachedBootstrap?.titles ?? [];
};

/**
 * 读取称号展示名。
 * 功能：API 返回 unlockedTitles 时使用。
 * 参数：titleKey - 称号标识。
 * 返回值：展示名称。
 */
export const getTitleDisplayName = (titleKey: string) => {
  const title = getCachedTitles().find((item) => item.id === titleKey);
  return title?.name ?? titleKey;
};

/**
 * 读取默认称号 key。
 * 功能：新用户初始化 current_title_key。
 * 参数：无。
 * 返回值：默认称号 key。
 */
export const getDefaultTitleKey = () => {
  return cachedBootstrap?.config.defaultTitleKey ?? "initiate";
};

/**
 * 读取每级所需经验值。
 * 功能：等级计算。
 * 参数：无。
 * 返回值：xpPerLevel 数值。
 */
export const getXpPerLevel = () => {
  return cachedBootstrap?.config.xpPerLevel ?? 100;
};

/**
 * 读取最高等级。
 * 功能：getLevelFromXp 封顶。
 * 参数：无。
 * 返回值：最高等级数值。
 */
export const getMaxLevel = () => {
  const levels = cachedBootstrap?.levels ?? [];
  if (levels.length === 0) {
    return 10;
  }
  return levels[levels.length - 1].level;
};
