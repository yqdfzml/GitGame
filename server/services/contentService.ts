import type { RowDataPacket } from "mysql2";
import { getPool } from "../db";
import type { UnlockRule } from "../game/unlockRule";

/** 关卡 content JSON 在数据库中的字段结构 */
export type ChallengeContentPayload = {
  summary: string;
  skill: string;
  concept: string;
  repositoryStates: string[];
  objectives: string[];
  hints: string[];
  hintLevels: string[];
  kind: string;
  difficulty: string;
  commands: string[];
};

type ChallengeRow = RowDataPacket & {
  challenge_key: string;
  chapter_title: string;
  title: string;
  sort_order: number;
  version: number;
  base_xp: number;
  content: ChallengeContentPayload;
};

type TitleRow = RowDataPacket & {
  title_key: string;
  name: string;
  description: string;
  rarity: string;
  unlock_rule: UnlockRule;
};

type LevelRow = RowDataPacket & {
  level: number;
  name: string;
  sort_order: number;
};

type ConfigRow = RowDataPacket & {
  config_key: string;
  config_value: unknown;
};

/** 对外输出的关卡结构，与前端 Challenge 类型对齐 */
export type PublicChallenge = {
  id: string;
  chapter: string;
  title: string;
  summary: string;
  skill: string;
  concept: string;
  repositoryStates: string[];
  objectives: string[];
  hints: string[];
  hintLevels: string[];
  kind: string;
  difficulty: string;
  baseXp: number;
  commands: string[];
  version: number;
};

/** 对外输出的称号结构 */
export type PublicTitle = {
  id: string;
  name: string;
  flavorText: string;
  rarity: string;
  unlockRule: UnlockRule;
};

/** 对外输出的等级结构 */
export type PublicLevel = {
  level: number;
  name: string;
};

/** 游戏全局配置 */
export type PublicGameConfig = {
  xpPerLevel: number;
  defaultTitleKey: string;
};

/** 内容引导包：前端启动时一次性拉取 */
export type ContentBootstrap = {
  challenges: PublicChallenge[];
  titles: PublicTitle[];
  levels: PublicLevel[];
  config: PublicGameConfig;
  totalChallenges: number;
  totalTitles: number;
};

/** 服务端校验用的关卡元信息 */
export type ChallengeMeta = {
  baseXp: number;
  version: number;
};

/**
 * 读取所有已发布关卡列表。
 * 功能：供公开内容 API 与前端拉取关卡目录。
 * 参数：无。
 * 返回值：按章节与排序字段排列的关卡数组。
 */
export const listActiveChallenges = async (): Promise<PublicChallenge[]> => {
  const db = getPool();
  const [rows] = await db.query<ChallengeRow[]>(
    `SELECT
      c.challenge_key,
      ch.title AS chapter_title,
      c.title,
      c.sort_order,
      c.version,
      c.base_xp,
      c.content
    FROM challenges c
    INNER JOIN challenge_chapters ch ON ch.chapter_key = c.chapter_key
    WHERE c.status = 'active' AND ch.status = 'active'
    ORDER BY ch.sort_order ASC, c.sort_order ASC`,
  );

  return rows.map((row) => {
    const rawContent = row.content;
    const content: ChallengeContentPayload =
      typeof rawContent === "string" ? JSON.parse(rawContent) : rawContent;
    return {
      id: row.challenge_key,
      chapter: row.chapter_title,
      title: row.title,
      summary: content.summary,
      skill: content.skill,
      concept: content.concept,
      repositoryStates: content.repositoryStates,
      objectives: content.objectives,
      hints: content.hints,
      hintLevels: content.hintLevels,
      kind: content.kind,
      difficulty: content.difficulty,
      baseXp: row.base_xp,
      commands: content.commands,
      version: row.version,
    };
  });
};

/**
 * 构建关卡元信息映射，供通关校验与 XP 计算使用。
 * 功能：把数据库关卡列表转换为 key -> meta 字典。
 * 参数：challenges - 关卡列表。
 * 返回值：challenge_key 到元信息的映射。
 */
export const buildChallengeMetaMap = (challenges: PublicChallenge[]): Record<string, ChallengeMeta> => {
  const metaMap: Record<string, ChallengeMeta> = {};
  for (const challenge of challenges) {
    metaMap[challenge.id] = {
      baseXp: challenge.baseXp,
      version: challenge.version,
    };
  }
  return metaMap;
};

/**
 * 读取所有已发布称号。
 * 功能：供公开内容 API 与称号墙展示。
 * 参数：无。
 * 返回值：称号数组。
 */
export const listActiveTitles = async (): Promise<PublicTitle[]> => {
  const db = getPool();
  const [rows] = await db.query<TitleRow[]>(
    `SELECT title_key, name, description, rarity, unlock_rule
     FROM titles
     WHERE status = 'active' AND deleted_at IS NULL
     ORDER BY id ASC`,
  );

  return rows.map((row) => {
    const unlockRule = typeof row.unlock_rule === "string" ? JSON.parse(row.unlock_rule) : row.unlock_rule;
    return {
      id: row.title_key,
      name: row.name,
      flavorText: row.description,
      rarity: row.rarity,
      unlockRule,
    };
  });
};

/**
 * 读取等级名称表。
 * 功能：供前端展示段位名称。
 * 参数：无。
 * 返回值：等级数组。
 */
export const listActiveLevels = async (): Promise<PublicLevel[]> => {
  const db = getPool();
  const [rows] = await db.query<LevelRow[]>(
    `SELECT level, name, sort_order
     FROM level_definitions
     WHERE status = 'active'
     ORDER BY sort_order ASC, level ASC`,
  );

  return rows.map((row) => ({
    level: row.level,
    name: row.name,
  }));
};

/**
 * 读取游戏全局配置。
 * 功能：提供 xpPerLevel、默认称号等运行时参数。
 * 参数：无。
 * 返回值：PublicGameConfig。
 */
export const loadGameConfig = async (): Promise<PublicGameConfig> => {
  const db = getPool();
  const [rows] = await db.query<ConfigRow[]>("SELECT config_key, config_value FROM game_config");

  const configMap: Record<string, unknown> = {};
  for (const row of rows) {
    configMap[row.config_key] =
      typeof row.config_value === "string" ? JSON.parse(row.config_value) : row.config_value;
  }

  return {
    xpPerLevel: Number(configMap.xpPerLevel ?? 100),
    defaultTitleKey: String(configMap.defaultTitleKey ?? "initiate"),
  };
};

/**
 * 一次性读取全部游戏内容。
 * 功能：GET /api/content/bootstrap。
 * 参数：无。
 * 返回值：ContentBootstrap。
 */
export const loadContentBootstrap = async (): Promise<ContentBootstrap> => {
  const [challenges, titles, levels, config] = await Promise.all([
    listActiveChallenges(),
    listActiveTitles(),
    listActiveLevels(),
    loadGameConfig(),
  ]);

  return {
    challenges,
    titles,
    levels,
    config,
    totalChallenges: challenges.length,
    totalTitles: titles.length,
  };
};
