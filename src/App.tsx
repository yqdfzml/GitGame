import {
  Award,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleDot,
  GitBranch,
  GitCommitHorizontal,
  History,
  Home,
  Medal,
  RotateCcw,
  Sparkles,
  Terminal,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CHALLENGES } from "./game/challenges";
import { evaluateCommand, getLayeredHint } from "./game/commandEngine";
import { syncChallengeAttempt } from "./game/cloudSync";
import { isApiEnabled, loginAccount, registerAccount, updateCurrentTitle } from "./game/apiClient";
import {
  clearAuthSession,
  loadAuthSession,
  loadAuthUser,
  saveAuthSession,
} from "./game/authStorage";
import { mergeProfilesPreferHigher, pullCloudProfile } from "./game/profileSync";
import {
  applyChallengeResult,
  createChallengeResult,
  createInitialProfile,
  getLevelInfo,
  getLevelProgress,
} from "./game/growth";
import { clearProfile, loadProfile, saveProfile } from "./game/storage";
import { getTitleById, TITLE_RULES } from "./game/titles";
import type { AuthUser, Challenge, ChallengeResult, ChallengeSyncStatus, PlayerProfile } from "./game/types";

type Page = "home" | "levels" | "play" | "profile";
type TerminalLine = { kind: "input" | "success" | "warn" | "info"; text: string };
type CompletionNotice = {
  result: ChallengeResult;
  unlockedTitles: string[];
  bestScoreUpdated: boolean;
  syncStatus: ChallengeSyncStatus;
};

const kindIcon = {
  commit: GitCommitHorizontal,
  staging: CircleDot,
  branch: GitBranch,
  merge: BookOpenCheck,
  history: History,
  conflict: Zap,
};

const navItems = [
  { page: "home" as const, label: "修炼台", icon: Home },
  { page: "levels" as const, label: "关卡", icon: BookOpenCheck },
  { page: "profile" as const, label: "个人中心", icon: User },
];

const getLocked = (challenge: Challenge, profile: PlayerProfile) => {
  const index = CHALLENGES.findIndex((item) => item.id === challenge.id);
  return index > 0 && !profile.completedChallengeIds.includes(CHALLENGES[index - 1].id);
};

function App() {
  const [page, setPage] = useState<Page>("home");
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => loadAuthUser());
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [activeChallengeId, setActiveChallengeId] = useState(CHALLENGES[0].id);
  const [completedCommands, setCompletedCommands] = useState<string[]>([]);
  const [commandLog, setCommandLog] = useState<string[]>([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [mistakeCount, setMistakeCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [inOrder, setInOrder] = useState(true);
  const [runStartedAt, setRunStartedAt] = useState(() => Date.now());
  const [completionInFlight, setCompletionInFlight] = useState(false);
  const [notice, setNotice] = useState<CompletionNotice | null>(null);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { kind: "info", text: "阅读任务目标后输入 Git 命令，系统会判断仓库状态是否推进。" },
  ]);

  const activeChallenge = CHALLENGES.find((challenge) => challenge.id === activeChallengeId) ?? CHALLENGES[0];
  const groupedChallenges = useMemo(() => {
    return CHALLENGES.reduce<Record<string, Challenge[]>>((groups, challenge) => {
      groups[challenge.chapter] = [...(groups[challenge.chapter] ?? []), challenge];
      return groups;
    }, {});
  }, []);
  const recommendedChallenge =
    CHALLENGES.find((challenge) => !profile.completedChallengeIds.includes(challenge.id)) ?? CHALLENGES.at(-1) ?? CHALLENGES[0];

  useEffect(() => saveProfile(profile), [profile]);

  const resetChallengeRun = (challengeId = activeChallengeId) => {
    const challenge = CHALLENGES.find((item) => item.id === challengeId) ?? CHALLENGES[0];
    setActiveChallengeId(challenge.id);
    setCompletedCommands([]);
    setCommandLog([]);
    setTerminalInput("");
    setMistakeCount(0);
    setHintCount(0);
    setInOrder(true);
    setRunStartedAt(Date.now());
    setCompletionInFlight(false);
    setNotice(null);
    setTerminalLines([{ kind: "info", text: `进入「${challenge.title}」，先读目标，再判断该输入什么命令。` }]);
  };

  const startChallenge = (challengeId: string) => {
    resetChallengeRun(challengeId);
    setPage("play");
  };

  const submitCommand = (rawValue = terminalInput) => {
    const visibleInput = rawValue.trim();
    if (!visibleInput) return;

    const evaluation = evaluateCommand(activeChallenge, completedCommands, visibleInput);
    setCompletedCommands(evaluation.completedCommands);
    setCommandLog((commands) => [...commands, visibleInput]);
    setMistakeCount((count) => count + evaluation.mistakeDelta);
    if (!evaluation.keepsOrder) setInOrder(false);
    setTerminalLines((lines) => [
      ...lines,
      { kind: "input", text: `$ ${visibleInput}` },
      { kind: evaluation.feedbackKind, text: evaluation.feedback },
    ]);

    setTerminalInput("");
  };

  const requestHint = (levelIndex = hintCount) => {
    const hint = getLayeredHint(activeChallenge, levelIndex);
    setHintCount((count) => count + 1);
    setTerminalLines((lines) => [...lines, { kind: "info", text: `提示 ${hint.level}/3：${hint.text}` }]);
  };

  const completeChallenge = async () => {
    if (completionInFlight) return;
    setCompletionInFlight(true);
    const result = createChallengeResult({
      profile,
      challenge: activeChallenge,
      mistakeCount,
      hintCount,
      inOrder,
      commandCount: Math.max(commandLog.length, activeChallenge.commands.length),
    });
    const bestScoreUpdated = result.score > (profile.bestScores[activeChallenge.id] ?? 0);
    const applied = applyChallengeResult(profile, result);
    const accessToken = loadAuthSession()?.accessToken ?? null;
    const syncStatus = await syncChallengeAttempt({
      result,
      commandLog,
      accessToken,
      durationSeconds: Math.max(1, Math.round((Date.now() - runStartedAt) / 1000)),
    });
    setProfile(applied.profile);
    setNotice({ result, unlockedTitles: applied.newlyUnlocked, bestScoreUpdated, syncStatus });
    setCompletionInFlight(false);
  };

  const chooseTitle = (titleId: string) => {
    if (!profile.unlockedTitleIds.includes(titleId)) return;

    setProfile((current) => ({ ...current, activeTitleId: titleId }));

    const session = loadAuthSession();
    if (session && isApiEnabled()) {
      updateCurrentTitle(session.accessToken, titleId).catch(() => {
        setAuthMessage("称号已本地更新，但云端同步失败。");
      });
    }
  };

  /**
   * 登录或注册成功后恢复云端档案。
   * 功能：写入 token，拉取 profile/progress/titles 并与本地合并。
   * 参数：session - 后端返回的登录会话。
   * 返回值：Promise。
   */
  const handleAuthSuccess = (session: { accessToken: string; user: AuthUser }) => {
    saveAuthSession(session);
    setAuthUser(session.user);
    setAuthMessage("登录成功，正在恢复云端进度…");

    if (!isApiEnabled()) {
      setAuthMessage("登录成功。当前未启用 API 同步，进度仍保存在本地。");
      return Promise.resolve();
    }

    return pullCloudProfile({ accessToken: session.accessToken })
      .then((cloudProfile) => {
        setProfile((current) => mergeProfilesPreferHigher(current, cloudProfile));
        setAuthMessage("云端进度已恢复。");
      })
      .catch(() => {
        setAuthMessage("登录成功，但暂时无法拉取云端进度。");
      });
  };

  /**
   * 提交登录或注册表单。
   * 功能：调用后端认证接口。
   * 参数：无。
   * 返回值：Promise。
   */
  const submitAuthForm = () => {
    if (authBusy) return Promise.resolve();
    setAuthBusy(true);
    setAuthMessage("");

    const task =
      authMode === "register"
        ? registerAccount(authEmail, authPassword, authDisplayName)
        : loginAccount(authEmail, authPassword);

    return task
      .then((session) => handleAuthSuccess(session))
      .catch((error: Error) => {
        setAuthMessage(error.message || "认证失败，请稍后重试。");
      })
      .finally(() => {
        setAuthBusy(false);
      });
  };

  /**
   * 退出登录并清除本地 token。
   * 功能：保留本地游戏进度，只移除云同步身份。
   * 参数：无。
   * 返回值：无。
   */
  const logoutAccount = () => {
    clearAuthSession();
    setAuthUser(null);
    setAuthMessage("已退出登录，本地进度仍保留在当前设备。");
  };

  const resetProfile = () => {
    clearProfile();
    setProfile(createInitialProfile());
    resetChallengeRun(CHALLENGES[0].id);
    setPage("home");
  };

  return (
    <main className="app-shell">
      <AppHeader page={page} setPage={setPage} />
      {page === "home" && (
        <HomePage
          profile={profile}
          recommendedChallenge={recommendedChallenge}
          onStart={() => startChallenge(recommendedChallenge.id)}
          onViewLevels={() => setPage("levels")}
        />
      )}
      {page === "levels" && (
        <LevelsPage groupedChallenges={groupedChallenges} profile={profile} onStart={startChallenge} />
      )}
      {page === "profile" && (
        <ProfilePage
          authBusy={authBusy}
          authDisplayName={authDisplayName}
          authEmail={authEmail}
          authMessage={authMessage}
          authMode={authMode}
          authPassword={authPassword}
          authUser={authUser}
          onAuthDisplayNameChange={setAuthDisplayName}
          onAuthEmailChange={setAuthEmail}
          onAuthModeChange={setAuthMode}
          onAuthPasswordChange={setAuthPassword}
          onChooseTitle={chooseTitle}
          onLogout={logoutAccount}
          onReset={resetProfile}
          onSubmitAuth={submitAuthForm}
          profile={profile}
        />
      )}
      {page === "play" && (
        <PlayPage
          challenge={activeChallenge}
          completedCommands={completedCommands}
          hintCount={hintCount}
          completionInFlight={completionInFlight}
          inOrder={inOrder}
          input={terminalInput}
          mistakeCount={mistakeCount}
          notice={notice}
          onBack={() => setPage("levels")}
          onComplete={completeChallenge}
          onHint={requestHint}
          onInput={setTerminalInput}
          onNext={(challengeId) => startChallenge(challengeId)}
          onReset={() => resetChallengeRun(activeChallenge.id)}
          onSubmit={submitCommand}
          terminalLines={terminalLines}
        />
      )}
    </main>
  );
}

function AppHeader({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  return (
    <header className="topbar">
      <button className="brand-button" type="button" onClick={() => setPage("home")}>
        <GitBranch aria-hidden="true" />
        <span>GitGame</span>
      </button>
      <nav aria-label="主导航">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button className={page === item.page ? "active" : ""} key={item.page} onClick={() => setPage(item.page)}>
              <Icon aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function HomePage({
  onStart,
  onViewLevels,
  profile,
  recommendedChallenge,
}: {
  onStart: () => void;
  onViewLevels: () => void;
  profile: PlayerProfile;
  recommendedChallenge: Challenge;
}) {
  const activeTitle = getTitleById(profile.activeTitleId);
  const levelInfo = getLevelInfo(profile.level);
  return (
    <section className="home-layout">
      <article className="surface hero-card">
        <div className="hero-grid">
          <div className="hero-copy-block">
            <p className="eyebrow">Git 等级挑战</p>
            <h1 className="hero-title">GitGame</h1>
            <p className="hero-copy">在命令行里修炼 Git，从第一枚 commit 到冲突化解，逐关突破工程师段位。</p>
            <div className="hero-actions">
              <button className="primary cta" type="button" onClick={onStart}>继续修炼</button>
              <button className="secondary cta" type="button" onClick={onViewLevels}>查看关卡</button>
            </div>
          </div>
          <PlayerSummary profile={profile} compact />
        </div>
      </article>
      <section className="insight-grid">
        <MetricCard label="当前段位" value={`Lv.${levelInfo.level} ${levelInfo.name}`} />
        <MetricCard label="当前称号" value={activeTitle.name} />
        <MetricCard label="推荐下一关" value={recommendedChallenge.title} />
      </section>
    </section>
  );
}

function LevelsPage({
  groupedChallenges,
  onStart,
  profile,
}: {
  groupedChallenges: Record<string, Challenge[]>;
  onStart: (challengeId: string) => void;
  profile: PlayerProfile;
}) {
  return (
    <section className="page-stack">
      <PageTitle eyebrow="关卡" title="按章节突破 Git 能力" copy="这里选择挑战，不展示答案；进入关卡后根据目标自己输入命令。" />
      <div className="chapter-grid">
        {Object.entries(groupedChallenges).map(([chapter, challenges]) => (
          <article className="surface challenge-map" key={chapter}>
            <header className="chapter-header">
              <h2>{chapter}</h2>
              <span>{challenges.length} 关</span>
            </header>
            <div className="challenge-list">
              {challenges.map((challenge) => (
                <ChallengeCard challenge={challenge} key={challenge.id} onStart={onStart} profile={profile} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChallengeCard({
  challenge,
  onStart,
  profile,
}: {
  challenge: Challenge;
  onStart: (challengeId: string) => void;
  profile: PlayerProfile;
}) {
  const Icon = kindIcon[challenge.kind];
  const locked = getLocked(challenge, profile);
  const completed = profile.completedChallengeIds.includes(challenge.id);
  const bestScore = profile.bestScores[challenge.id] ?? 0;
  const statusLabel = locked ? "锁定" : completed ? "已完成" : "可挑战";
  const statusClass = locked ? "locked" : completed ? "done" : "open";
  return (
    <button className={`challenge-card ${statusClass}`} disabled={locked} onClick={() => onStart(challenge.id)} type="button">
      <div className="challenge-icon-wrap">
        <Icon aria-hidden="true" />
      </div>
      <span className="challenge-body">
        <span className="challenge-head">
          <strong>{challenge.title}</strong>
          <span className={`challenge-badge ${statusClass}`}>{statusLabel}</span>
        </span>
        <small>{challenge.skill}</small>
        <small>
          {locked
            ? "完成上一关后解锁"
            : completed
              ? `最高分 ${bestScore} · 可再修炼刷新成绩`
              : `${challenge.difficulty} · 基础 ${challenge.baseXp} XP`}
        </small>
      </span>
      <ChevronRight aria-hidden="true" />
    </button>
  );
}

function ProfilePage({
  authBusy,
  authDisplayName,
  authEmail,
  authMessage,
  authMode,
  authPassword,
  authUser,
  onAuthDisplayNameChange,
  onAuthEmailChange,
  onAuthModeChange,
  onAuthPasswordChange,
  onChooseTitle,
  onLogout,
  onReset,
  onSubmitAuth,
  profile,
}: {
  authBusy: boolean;
  authDisplayName: string;
  authEmail: string;
  authMessage: string;
  authMode: "login" | "register";
  authPassword: string;
  authUser: AuthUser | null;
  onAuthDisplayNameChange: (value: string) => void;
  onAuthEmailChange: (value: string) => void;
  onAuthModeChange: (mode: "login" | "register") => void;
  onAuthPasswordChange: (value: string) => void;
  onChooseTitle: (titleId: string) => void;
  onLogout: () => void;
  onReset: () => void;
  onSubmitAuth: () => void;
  profile: PlayerProfile;
}) {
  const apiEnabled = isApiEnabled();

  return (
    <section className="profile-layout">
      <aside className="profile-sidebar">
        <PlayerSummary profile={profile} onReset={onReset} />
        <article className="surface auth-panel">
          <div className="section-title">
            <p className="eyebrow">云存档</p>
            <h2>{authUser ? "账号已连接" : "登录后同步进度"}</h2>
            <p>
              {apiEnabled
                ? "本地优先游玩，登录后在通关时自动同步 XP、关卡进度和称号。"
                : "当前未配置 VITE_API_BASE_URL，云同步功能处于关闭状态。"}
            </p>
          </div>
          {authUser ? (
            <div className="auth-session">
              <div className="auth-user-card">
                <div className="auth-avatar" aria-hidden="true">{authUser.displayName.slice(0, 1)}</div>
                <div>
                  <strong>{authUser.displayName}</strong>
                  <p className="muted">{authUser.email}</p>
                </div>
              </div>
              <button type="button" onClick={onLogout}>退出登录</button>
            </div>
          ) : (
            <form
              className="auth-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmitAuth();
              }}
            >
              <div className="auth-tabs">
                <button
                  className={authMode === "login" ? "active" : ""}
                  type="button"
                  onClick={() => onAuthModeChange("login")}
                >
                  登录
                </button>
                <button
                  className={authMode === "register" ? "active" : ""}
                  type="button"
                  onClick={() => onAuthModeChange("register")}
                >
                  注册
                </button>
              </div>
              {authMode === "register" && (
                <label>
                  昵称
                  <input
                    value={authDisplayName}
                    onChange={(event) => onAuthDisplayNameChange(event.target.value)}
                    placeholder="Git 少侠"
                    required
                  />
                </label>
              )}
              <label>
                邮箱
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => onAuthEmailChange(event.target.value)}
                  placeholder="player@example.com"
                  required
                />
              </label>
              <label>
                密码
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => onAuthPasswordChange(event.target.value)}
                  placeholder="至少 6 位"
                  minLength={6}
                  required
                />
              </label>
              <button className="primary auth-submit" type="submit" disabled={authBusy || !apiEnabled}>
                {authBusy ? "处理中…" : authMode === "register" ? "注册并登录" : "登录"}
              </button>
            </form>
          )}
          {authMessage && <p className="auth-message">{authMessage}</p>}
        </article>
      </aside>
      <article className="surface title-wall profile-main">
        <div className="section-title">
          <p className="eyebrow">个人中心</p>
          <h2>称号墙</h2>
          <p>已解锁称号可以设为当前展示称号，未解锁称号保留神秘感。</p>
        </div>
        <div className="titles-grid">
          {TITLE_RULES.map((title) => {
            const unlocked = profile.unlockedTitleIds.includes(title.id);
            const active = profile.activeTitleId === title.id;
            return (
              <button
                className={`title-card ${unlocked ? "unlocked" : "locked"} ${active ? "active" : ""}`}
                disabled={!unlocked}
                key={title.id}
                onClick={() => onChooseTitle(title.id)}
                type="button"
              >
                <span>{title.name}</span>
                <small>{unlocked ? title.flavorText : "尚未悟得此道"}</small>
              </button>
            );
          })}
        </div>
      </article>
    </section>
  );
}

function PlayerSummary({
  compact = false,
  onReset,
  profile,
}: {
  compact?: boolean;
  onReset?: () => void;
  profile: PlayerProfile;
}) {
  const activeTitle = getTitleById(profile.activeTitleId);
  const levelInfo = getLevelInfo(profile.level);
  const progress = getLevelProgress(profile.xp);
  return (
    <article className={`player-card surface ${compact ? "player-card-compact" : ""}`}>
      <div className="player-heading">
        <div className="avatar" aria-hidden="true"><Sparkles /></div>
        <div className="player-meta">
          <p className="muted">当前段位</p>
          <h2>Lv.{levelInfo.level} {levelInfo.name}</h2>
          <p className="title-line">{activeTitle.name}</p>
        </div>
        <div className="score-badge" aria-label={`总积分 ${profile.totalScore}`}>
          <small>积分</small>
          <strong>{profile.totalScore}</strong>
        </div>
      </div>
      {!compact && <p className="title-flavor">{activeTitle.flavorText}</p>}
      <div className="xp-row"><span>总 XP {profile.xp}</span><span>{progress.percent}%</span></div>
      <div className="progress-track" aria-label="等级经验进度"><div style={{ width: `${progress.percent}%` }} /></div>
      <div className="stat-strip">
        <span><Trophy aria-hidden="true" /> {profile.completedChallengeIds.length}/{CHALLENGES.length} 关</span>
        <span><Award aria-hidden="true" /> {profile.unlockedTitleIds.length}/{TITLE_RULES.length} 称号</span>
        {onReset && <button type="button" onClick={onReset}><RotateCcw aria-hidden="true" /> 重置</button>}
      </div>
    </article>
  );
}

function PlayPage(props: {
  challenge: Challenge;
  completedCommands: string[];
  completionInFlight: boolean;
  hintCount: number;
  inOrder: boolean;
  input: string;
  mistakeCount: number;
  notice: CompletionNotice | null;
  onBack: () => void;
  onComplete: () => void;
  onHint: (levelIndex?: number) => void;
  onInput: (value: string) => void;
  onNext: (challengeId: string) => void;
  onReset: () => void;
  onSubmit: (value?: string) => void;
  terminalLines: TerminalLine[];
}) {
  const nextChallenge = CHALLENGES[CHALLENGES.findIndex((item) => item.id === props.challenge.id) + 1];
  const done = props.challenge.commands.every((command) => props.completedCommands.includes(command));
  const firstOpenIndex = props.challenge.commands.findIndex((command) => !props.completedCommands.includes(command));
  const routePercent = Math.round((props.completedCommands.length / props.challenge.commands.length) * 100);
  const currentStateIndex = Math.min(props.completedCommands.length, props.challenge.repositoryStates.length - 1);

  return (
    <section className="play-layout command-mode">
      <article className="surface mission-panel command-brief">
        <button className="ghost-link" type="button" onClick={props.onBack}>返回关卡</button>
        <PageTitle eyebrow={props.challenge.chapter} title={props.challenge.title} copy={props.challenge.summary} />
        <div className="learning-card">
          <span>{props.challenge.skill}</span>
          <p>{props.challenge.concept}</p>
        </div>
        <div className="brief-meter" aria-label="执行路径进度">
          <span>{routePercent}%</span>
          <div className="progress-track"><div style={{ width: `${routePercent}%` }} /></div>
        </div>
        <ol className="objective-list compact-objectives">
          {props.challenge.objectives.map((objective, index) => {
            const complete = props.completedCommands.includes(props.challenge.commands[index]);
            const current = index === firstOpenIndex && !done;
            return (
              <li className={`${complete ? "done" : ""} ${current ? "current" : ""}`} key={objective}>
                <span>{complete ? <Check aria-hidden="true" /> : <CircleDot aria-hidden="true" />}</span>
                {objective}
              </li>
            );
          })}
        </ol>
        <div className="state-rail" aria-label="模拟仓库状态">
          {props.challenge.repositoryStates.map((state, index) => (
            <div className={`${index <= currentStateIndex ? "active" : ""} ${index === currentStateIndex ? "current" : ""}`} key={state}>
              <span>{index + 1}</span>
              <p>{state}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="surface command-console">
        <div className="console-topline">
          <div>
            <p className="eyebrow">命令行 · 校验反馈</p>
            <h2 className="console-title">输入 Git 命令，观察仓库状态变化</h2>
          </div>
          <div className="step-badge">STEP {String(Math.min(props.completedCommands.length + 1, props.challenge.commands.length)).padStart(2, "0")}</div>
        </div>

        <div className="terminal-form command-input hero-input">
          <label htmlFor="terminal-input">输入命令</label>
          <input
            id="terminal-input"
            onChange={(event) => props.onInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && props.onSubmit()}
            placeholder="git ..."
            value={props.input}
          />
          <button type="button" onClick={() => props.onSubmit()}>执行</button>
        </div>

        <div className="terminal-window validation-log" aria-live="polite">
          {props.terminalLines.map((line, index) => <p className={line.kind} key={`${line.text}-${index}`}>{line.text}</p>)}
        </div>

        <div className="hint-grid" aria-label="分层提示">
          {props.challenge.hintLevels.map((_hint, index) => (
            <button key={index} type="button" onClick={() => props.onHint(index)} disabled={done}>
              提示 {index + 1}
            </button>
          ))}
        </div>
        <div className="console-actions">
          <button type="button" onClick={props.onReset}>重练本关</button>
          <button className="primary" type="button" onClick={props.onComplete} disabled={!done || props.completionInFlight}>
            {props.completionInFlight ? "结算中" : "完成挑战"}
          </button>
        </div>
        <div className="run-stats"><span>误操作 {props.mistakeCount}</span><span>提示 {props.hintCount}</span><span>{props.inOrder ? "路径稳定" : "路径偏离"}</span></div>
      </article>

      {props.notice && <ResultModal notice={props.notice} challenge={props.challenge} nextChallenge={nextChallenge} onNext={props.onNext} />}
    </section>
  );
}

function ResultModal({
  challenge,
  nextChallenge,
  notice,
  onNext,
}: {
  challenge: Challenge;
  nextChallenge?: Challenge;
  notice: CompletionNotice;
  onNext: (challengeId: string) => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <p className="eyebrow">境界突破</p>
        <h2 id="result-title">{challenge.title} 已完成</h2>
        <div className="result-score">{notice.result.score}</div>
        <p>获得 XP：{notice.result.baseXp + notice.result.bonusXp}（基础 {notice.result.baseXp} / 精进 {notice.result.bonusXp}）</p>
        <p className="result-lesson">本关掌握：{challenge.concept}</p>
        <div className="result-flags">
          <span>{notice.bestScoreUpdated ? "刷新最佳成绩" : "保持当前最佳"}</span>
          <span>{notice.result.inOrder ? "路径顺序稳定" : "路径有偏离"}</span>
          <span>{notice.syncStatus.message}</span>
        </div>
        {notice.unlockedTitles.length > 0 && (
          <div className="new-titles">
            {notice.unlockedTitles.map((titleId) => <span key={titleId}>{getTitleById(titleId).name}</span>)}
          </div>
        )}
        {nextChallenge && <button className="primary" type="button" onClick={() => onNext(nextChallenge.id)}>下一关</button>}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <article className="surface metric-card"><p>{label}</p><strong>{value}</strong></article>;
}

function PageTitle({ copy, eyebrow, title }: { copy: string; eyebrow: string; title: string }) {
  return (
    <div className="section-title page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

export default App;
