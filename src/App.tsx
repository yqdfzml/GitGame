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
import {
  applyChallengeResult,
  createChallengeResult,
  createInitialProfile,
  getLevelInfo,
  getLevelProgress,
} from "./game/growth";
import { clearProfile, loadProfile, saveProfile } from "./game/storage";
import { getTitleById, TITLE_RULES } from "./game/titles";
import type { Challenge, ChallengeResult, PlayerProfile } from "./game/types";

type Page = "home" | "levels" | "play" | "profile";
type TerminalLine = { kind: "input" | "success" | "warn" | "info"; text: string };
type CompletionNotice = { result: ChallengeResult; unlockedTitles: string[] };

const normalizeCommand = (value: string) =>
  value.trim().replaceAll('"', "").replaceAll("'", "").replace(/\s+/g, " ");

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
  const [activeChallengeId, setActiveChallengeId] = useState(CHALLENGES[0].id);
  const [completedCommands, setCompletedCommands] = useState<string[]>([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [mistakeCount, setMistakeCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [inOrder, setInOrder] = useState(true);
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

  useEffect(() => saveProfile(profile), [profile]);

  const resetChallengeRun = (challengeId = activeChallengeId) => {
    const challenge = CHALLENGES.find((item) => item.id === challengeId) ?? CHALLENGES[0];
    setActiveChallengeId(challenge.id);
    setCompletedCommands([]);
    setTerminalInput("");
    setMistakeCount(0);
    setHintCount(0);
    setInOrder(true);
    setNotice(null);
    setTerminalLines([{ kind: "info", text: `进入「${challenge.title}」，先读目标，再判断该输入什么命令。` }]);
  };

  const startChallenge = (challengeId: string) => {
    resetChallengeRun(challengeId);
    setPage("play");
  };

  const submitCommand = (rawValue = terminalInput) => {
    const visibleInput = rawValue.trim();
    const command = normalizeCommand(rawValue);
    if (!command) return;

    const expected = activeChallenge.commands[completedCommands.length];
    const commandIndex = activeChallenge.commands.findIndex((item) => normalizeCommand(item) === command);
    const alreadyDone = completedCommands.includes(activeChallenge.commands[commandIndex]);

    if (normalizeCommand(expected) === command) {
      setCompletedCommands((commands) => [...commands, expected]);
      setTerminalLines((lines) => [
        ...lines,
        { kind: "input", text: `$ ${visibleInput}` },
        { kind: "success", text: "校验通过：仓库状态沿推荐路径推进。" },
      ]);
    } else if (commandIndex >= 0 && !alreadyDone) {
      const commandToRecord = activeChallenge.commands[commandIndex];
      setCompletedCommands((commands) => [...commands, commandToRecord]);
      setInOrder(false);
      setTerminalLines((lines) => [
        ...lines,
        { kind: "input", text: `$ ${visibleInput}` },
        { kind: "warn", text: "命令可用：已记录到执行路径，但顺序偏离推荐路线。" },
      ]);
    } else if (commandIndex >= 0 && alreadyDone) {
      setMistakeCount((count) => count + 1);
      setTerminalLines((lines) => [
        ...lines,
        { kind: "input", text: `$ ${visibleInput}` },
        { kind: "warn", text: "这一步已经完成：请继续判断下一条会改变状态的命令。" },
      ]);
    } else {
      setMistakeCount((count) => count + 1);
      setTerminalLines((lines) => [
        ...lines,
        { kind: "input", text: `$ ${visibleInput}` },
        { kind: "warn", text: "校验未通过：这条命令没有改变当前目标状态。" },
      ]);
    }

    setTerminalInput("");
  };

  const requestHint = () => {
    const hint = activeChallenge.hints[Math.min(hintCount, activeChallenge.hints.length - 1)];
    setHintCount((count) => count + 1);
    setTerminalLines((lines) => [...lines, { kind: "info", text: `提示：${hint}` }]);
  };

  const completeChallenge = () => {
    const result = createChallengeResult({ profile, challenge: activeChallenge, mistakeCount, hintCount, inOrder });
    const applied = applyChallengeResult(profile, result);
    setProfile(applied.profile);
    setNotice({ result, unlockedTitles: applied.newlyUnlocked });
  };

  const chooseTitle = (titleId: string) => {
    if (profile.unlockedTitleIds.includes(titleId)) {
      setProfile((current) => ({ ...current, activeTitleId: titleId }));
    }
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
      {page === "home" && <HomePage profile={profile} onStart={() => setPage("levels")} />}
      {page === "levels" && (
        <LevelsPage groupedChallenges={groupedChallenges} profile={profile} onStart={startChallenge} />
      )}
      {page === "profile" && <ProfilePage profile={profile} onChooseTitle={chooseTitle} onReset={resetProfile} />}
      {page === "play" && (
        <PlayPage
          challenge={activeChallenge}
          completedCommands={completedCommands}
          hintCount={hintCount}
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

function HomePage({ profile, onStart }: { profile: PlayerProfile; onStart: () => void }) {
  const activeTitle = getTitleById(profile.activeTitleId);
  const levelInfo = getLevelInfo(profile.level);
  const progress = getLevelProgress(profile.xp);
  return (
    <section className="home-layout">
      <article className="hero-panel split-hero">
        <div>
          <p className="eyebrow">Git 等级挑战</p>
          <h1>GitGame</h1>
          <p className="hero-copy">关卡负责训练 Git 能力，个人中心负责记录你的工程师段位与修仙称号。</p>
          <button className="primary cta" type="button" onClick={onStart}>进入关卡</button>
        </div>
        <PlayerSummary profile={profile} />
      </article>
      <section className="insight-grid">
        <MetricCard label="当前段位" value={`Lv.${levelInfo.level} ${levelInfo.name}`} />
        <MetricCard label="当前称号" value={activeTitle.name} />
        <MetricCard label="经验进度" value={`${progress.current}/${progress.required} XP`} />
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
            <h2>{chapter}</h2>
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
  return (
    <button className="challenge-card" disabled={locked} onClick={() => onStart(challenge.id)} type="button">
      <Icon aria-hidden="true" />
      <span>
        <strong>{challenge.title}</strong>
        <small>{locked ? "先完成上一关" : `${challenge.difficulty} · 最高分 ${profile.bestScores[challenge.id] ?? 0}`}</small>
      </span>
      <ChevronRight aria-hidden="true" />
    </button>
  );
}

function ProfilePage({
  onChooseTitle,
  onReset,
  profile,
}: {
  onChooseTitle: (titleId: string) => void;
  onReset: () => void;
  profile: PlayerProfile;
}) {
  return (
    <section className="profile-layout">
      <PlayerSummary profile={profile} onReset={onReset} />
      <article className="surface title-wall">
        <PageTitle eyebrow="个人中心" title="称号墙" copy="已解锁称号可以设为当前展示称号，未解锁称号保留神秘感。" />
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

function PlayerSummary({ onReset, profile }: { onReset?: () => void; profile: PlayerProfile }) {
  const activeTitle = getTitleById(profile.activeTitleId);
  const levelInfo = getLevelInfo(profile.level);
  const progress = getLevelProgress(profile.xp);
  return (
    <article className="player-card surface">
      <div className="player-heading">
        <div className="avatar" aria-hidden="true"><Sparkles /></div>
        <div>
          <p className="muted">当前段位</p>
          <h2>Lv.{levelInfo.level} {levelInfo.name}</h2>
          <p className="title-line">{activeTitle.name} · {activeTitle.flavorText}</p>
        </div>
        <strong>{profile.totalScore}</strong>
      </div>
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
  hintCount: number;
  inOrder: boolean;
  input: string;
  mistakeCount: number;
  notice: CompletionNotice | null;
  onBack: () => void;
  onComplete: () => void;
  onHint: () => void;
  onInput: (value: string) => void;
  onNext: (challengeId: string) => void;
  onReset: () => void;
  onSubmit: (value?: string) => void;
  terminalLines: TerminalLine[];
}) {
  const nextChallenge = CHALLENGES[CHALLENGES.findIndex((item) => item.id === props.challenge.id) + 1];
  const done = props.challenge.commands.every((command) => props.completedCommands.includes(command));
  const routePercent = Math.round((props.completedCommands.length / props.challenge.commands.length) * 100);

  return (
    <section className="play-layout command-mode">
      <article className="surface mission-panel command-brief">
        <button className="ghost-link" type="button" onClick={props.onBack}>返回关卡</button>
        <PageTitle eyebrow={props.challenge.chapter} title={props.challenge.title} copy={props.challenge.summary} />
        <div className="brief-meter" aria-label="执行路径进度">
          <span>{routePercent}%</span>
          <div className="progress-track"><div style={{ width: `${routePercent}%` }} /></div>
        </div>
        <ol className="objective-list compact-objectives">
          {props.challenge.objectives.map((objective, index) => {
            const complete = index < props.completedCommands.length;
            const current = index === props.completedCommands.length && !done;
            return (
              <li className={`${complete ? "done" : ""} ${current ? "current" : ""}`} key={objective}>
                <span>{complete ? <Check aria-hidden="true" /> : <CircleDot aria-hidden="true" />}</span>
                {objective}
              </li>
            );
          })}
        </ol>
      </article>

      <article className="surface command-console">
        <div className="console-topline">
          <div>
            <p className="eyebrow">命令行 · 校验反馈</p>
            <h2>直接输入 Git 命令，系统只反馈状态变化。</h2>
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

        <div className="console-actions">
          <button type="button" onClick={props.onHint} disabled={done}>概念提示</button>
          <button type="button" onClick={props.onReset}>重练本关</button>
          <button className="primary" type="button" onClick={props.onComplete} disabled={!done}>完成挑战</button>
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
        <p>获得 XP：{notice.result.baseXp + notice.result.bonusXp}</p>
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
  return <div className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>;
}

export default App;
