import { buildLocalGameBootstrap, loadGameContent } from "./gameContent";

export type ChallengeCatalogLoadResult = {
  challenges: ReturnType<typeof buildLocalGameBootstrap>["challenges"];
  source: "local" | "remote";
};

/**
 * 从后端拉取关卡目录（兼容旧调用，内部走 bootstrap）。
 * 功能：仅需要关卡列表时使用。
 * 参数：fetcher - 可选 fetch。
 * 返回值：关卡数组及数据来源。
 */
export const loadChallengeCatalog = (fetcher?: typeof fetch): Promise<ChallengeCatalogLoadResult> => {
  return loadGameContent(fetcher).then((result) => ({
    challenges: result.bootstrap.challenges,
    source: result.source,
  }));
};

export { getChallengeById, isChallengeLocked } from "./gameContent";
