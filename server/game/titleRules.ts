import { evaluateUnlockRule, type UnlockRuleContext } from "./unlockRule";
import { getAllChallengeKeys, getCachedTitles, getDefaultTitleKey, getTitleDisplayName } from "./contentCache";

export type TitleUnlockContext = UnlockRuleContext;

export const DEFAULT_TITLE_KEY = "initiate";

/**
 * 计算本次新解锁的称号 key 列表。
 * 功能：通关结算事务中调用，规则来自数据库 titles.unlock_rule。
 * 参数：context - 当前玩家进度与本次通关上下文；ownedTitleKeys - 已解锁称号。
 * 返回值：新解锁的 title_key 数组。
 */
export const getNewlyUnlockedTitleKeys = (context: TitleUnlockContext, ownedTitleKeys: string[]) => {
  const ownedSet = new Set(ownedTitleKeys);
  const newlyUnlocked: string[] = [];
  const ruleContext: UnlockRuleContext = {
    ...context,
    allChallengeKeys: getAllChallengeKeys(),
  };

  for (const title of getCachedTitles()) {
    if (ownedSet.has(title.id)) {
      continue;
    }
    if (evaluateUnlockRule(title.unlockRule, ruleContext)) {
      newlyUnlocked.push(title.id);
      ownedSet.add(title.id);
    }
  }

  return newlyUnlocked;
};

export { getTitleDisplayName, getDefaultTitleKey };
