import { CHALLENGES } from "../../src/game/challenges";
import { TITLE_RULES } from "../../src/game/titles";
import { LEVELS, XP_PER_LEVEL } from "../../src/game/growth";
import { getPool, initDb } from "../db";
import { loadConfig } from "../config";
import type { UnlockRule } from "../game/unlockRule";

/** 章节标题到稳定 chapter_key 的映射 */
const CHAPTER_DEFINITIONS: Record<string, { key: string; sortOrder: number }> = {
  仓门初启: { key: "gate-open", sortOrder: 1 },
  暂存炼气: { key: "staging", sortOrder: 2 },
  分支御剑: { key: "branch", sortOrder: 3 },
  合并渡河: { key: "merge", sortOrder: 4 },
  回溯问心: { key: "history", sortOrder: 5 },
  冲突破境: { key: "conflict", sortOrder: 6 },
};

/**
 * 把前端 TitleRule 映射为数据库 unlock_rule JSON。
 * 功能：种子数据写入时统一 declarative 规则格式。
 * 参数：titleId - 称号 key。
 * 返回值：UnlockRule 对象。
 */
const buildTitleUnlockRule = (titleId: string): UnlockRule => {
  if (titleId === "initiate") return { type: "always" };
  if (titleId === "steady-cultivator") return { type: "completed_count", min: 3 };
  if (titleId === "flawless-mind") return { type: "perfect_score" };
  if (titleId === "git-daojun") return { type: "complete_all" };
  const challengeKey = TITLE_CHALLENGE_KEY_MAP[titleId];
  if (challengeKey) return { type: "complete_challenge", challengeKey };
  return { type: "complete_challenge", challengeKey: titleId };
};

/** 称号 id 到触发关卡的映射（称号 key 与关卡 key 不一致时使用） */
const TITLE_CHALLENGE_KEY_MAP: Record<string, string> = {
  "first-commit": "first-commit",
  "staging-mage": "staging-focus",
  "branch-walker": "branch-sword",
  "merge-adept": "merge-river",
  "timeline-hermit": "reset-path",
  "conflict-lord": "conflict-calm",
};

/** 称号稀有度映射 */
const TITLE_RARITY: Record<string, string> = {
  initiate: "common",
  "first-commit": "common",
  "steady-cultivator": "rare",
  "flawless-mind": "epic",
  "staging-mage": "common",
  "branch-walker": "common",
  "merge-adept": "rare",
  "timeline-hermit": "rare",
  "conflict-lord": "epic",
  "git-daojun": "legendary",
};

/**
 * 写入或更新章节、关卡、称号、等级与全局配置。
 * 功能：把 MVP 内容同步到数据库，后续在库中扩展即可。
 * 参数：无。
 * 返回值：Promise，完成后退出进程。
 */
const seedContent = async () => {
  const config = loadConfig();
  initDb(config);
  const db = getPool();

  for (const [title, chapterDef] of Object.entries(CHAPTER_DEFINITIONS)) {
    await db.query(
      `INSERT INTO challenge_chapters (chapter_key, title, sort_order, status)
       VALUES (?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE title = VALUES(title), sort_order = VALUES(sort_order), status = 'active'`,
      [chapterDef.key, title, chapterDef.sortOrder],
    );
  }

  let sortOrder = 1;
  for (const challenge of CHALLENGES) {
    const chapterDef = CHAPTER_DEFINITIONS[challenge.chapter];
    if (!chapterDef) {
      throw new Error(`未找到章节映射: ${challenge.chapter}`);
    }

    const content = {
      summary: challenge.summary,
      skill: challenge.skill,
      concept: challenge.concept,
      repositoryStates: challenge.repositoryStates,
      objectives: challenge.objectives,
      hints: challenge.hints,
      hintLevels: challenge.hintLevels,
      kind: challenge.kind,
      difficulty: challenge.difficulty,
      commands: challenge.commands,
    };

    await db.query(
      `INSERT INTO challenges (
        challenge_key, chapter_key, title, sort_order, version, base_xp, status, content
      ) VALUES (?, ?, ?, ?, 1, ?, 'active', ?)
      ON DUPLICATE KEY UPDATE
        chapter_key = VALUES(chapter_key),
        title = VALUES(title),
        sort_order = VALUES(sort_order),
        base_xp = VALUES(base_xp),
        content = VALUES(content),
        status = 'active'`,
      [challenge.id, chapterDef.key, challenge.title, sortOrder, challenge.baseXp, JSON.stringify(content)],
    );
    sortOrder += 1;
  }

  for (const title of TITLE_RULES) {
    await db.query(
      `INSERT INTO titles (title_key, name, description, rarity, unlock_rule, status)
       VALUES (?, ?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         rarity = VALUES(rarity),
         unlock_rule = VALUES(unlock_rule),
         status = 'active'`,
      [
        title.id,
        title.name,
        title.flavorText,
        TITLE_RARITY[title.id] ?? "common",
        JSON.stringify(buildTitleUnlockRule(title.id)),
      ],
    );
  }

  let levelSort = 1;
  for (const level of LEVELS) {
    await db.query(
      `INSERT INTO level_definitions (level, name, sort_order, status)
       VALUES (?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order), status = 'active'`,
      [level.level, level.name, levelSort],
    );
    levelSort += 1;
  }

  await db.query(
    `INSERT INTO game_config (config_key, config_value) VALUES ('xpPerLevel', ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [JSON.stringify(XP_PER_LEVEL)],
  );
  await db.query(
    `INSERT INTO game_config (config_key, config_value) VALUES ('defaultTitleKey', ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [JSON.stringify("initiate")],
  );

  console.log(`已同步 ${CHALLENGES.length} 个关卡、${TITLE_RULES.length} 个称号、${LEVELS.length} 个等级到数据库`);
  process.exit(0);
};

seedContent().catch((error) => {
  console.error("内容种子写入失败", error);
  process.exit(1);
});
