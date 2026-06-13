import { Check, ChevronRight, CircleDot, Medal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CHALLENGES } from "../game/challenges";
import { evaluateCommand, getLayeredHint } from "../game/commandEngine";
import { syncChallengeAttempt } from "../game/cloudSync";
import { loadAuthSession } from "../game/authStorage";
import {
  applyChallengeResult,
  createChallengeResult,
} from "../game/growth";
import { getTitleById } from "../game/titles";
import type { Challenge, ChallengeResult, ChallengeSyncStatus, PlayerProfile } from "../game/types";

type TerminalLine = { kind: "input" | "success" | "warn" | "info"; text: string };
type CompletionNotice = {
  result: ChallengeResult;
  unlockedTitles: string[];
  bestScoreUpdated: boolean;
  syncStatus: ChallengeSyncStatus;
};

/**
 * 游戏页路由容器，根据 URL 中的 challengeId 加载关卡并管理本局状态。
 * 功能：解析路由参数、初始化终端、处理命令与结算。
 * 参数：profile - 玩家档案；setProfile - 更新玩家档案。
 * 返回值：游戏页 JSX，无效关卡时重定向到关卡列表。
 */
export function PlayPageRoute({
  profile,
  setProfile,
}: {
  profile: PlayerProfile;
  setProfile: (value: PlayerProfile | ((current: PlayerProfile) => PlayerProfile)) => void;
}) {
  const navigate = useNavigate();
  const { challengeId } = useParams();
  const challenge = CHALLENGES.find((item) => item.id === challengeId);

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

  /**
   * 重置当前关卡的练习进度。
   * 功能：清空命令记录与终端输出，回到关卡初始状态。
   * 参数：target - 当前关卡数据。
   * 返回值：无。
   */
  const resetChallengeRun = (target: Challenge) => {
    setCompletedCommands([]);
    setCommandLog([]);
    setTerminalInput("");
    setMistakeCount(0);
    setHintCount(0);
    setInOrder(true);
    setRunStartedAt(Date.now());
    setCompletionInFlight(false);
    setNotice(null);
    setTerminalLines([{ kind: "info", text: `进入「${target.title}」，先读目标，再判断该输入什么命令。` }]);
  };

  // URL 关卡变化时重新初始化本局
  useEffect(() => {
    if (challenge) {
      resetChallengeRun(challenge);
    }
  }, [challengeId]);

  if (!challenge) {
    return <Navigate replace to="/levels" />;
  }

  /**
   * 提交一条 Git 命令并更新终端反馈。
   * 功能：校验命令、记录误操作、追加终端输出。
   * 参数：rawValue - 用户输入，默认取当前输入框内容。
   * 返回值：无。
   */
  const submitCommand = (rawValue = terminalInput) => {
    const visibleInput = rawValue.trim();
    if (!visibleInput) return;

    const evaluation = evaluateCommand(challenge, completedCommands, visibleInput);
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

  /**
   * 请求分层提示并在终端展示。
   * 功能：按已用提示次数读取下一级提示文案。
   * 参数：levelIndex - 提示层级索引，默认取当前 hintCount。
   * 返回值：无。
   */
  const requestHint = (levelIndex = hintCount) => {
    const hint = getLayeredHint(challenge, levelIndex);
    setHintCount((count) => count + 1);
    setTerminalLines((lines) => [...lines, { kind: "info", text: `提示 ${hint.level}/3：${hint.text}` }]);
  };

  /**
   * 完成关卡并结算经验值、同步云端。
   * 功能：计算得分、更新档案、展示结算弹窗。
   * 参数：无。
   * 返回值：Promise。
   */
  const completeChallenge = () => {
    if (completionInFlight) return Promise.resolve();
    setCompletionInFlight(true);

    const result = createChallengeResult({
      profile,
      challenge,
      mistakeCount,
      hintCount,
      inOrder,
      commandCount: Math.max(commandLog.length, challenge.commands.length),
    });
    const bestScoreUpdated = result.score > (profile.bestScores[challenge.id] ?? 0);
    const applied = applyChallengeResult(profile, result);
    const accessToken = loadAuthSession()?.accessToken ?? null;

    return syncChallengeAttempt({
      result,
      commandLog,
      accessToken,
      durationSeconds: Math.max(1, Math.round((Date.now() - runStartedAt) / 1000)),
    })
      .then((syncStatus) => {
        setProfile(applied.profile);
        setNotice({ result, unlockedTitles: applied.newlyUnlocked, bestScoreUpdated, syncStatus });
      })
      .finally(() => {
        setCompletionInFlight(false);
      });
  };

  return (
    <PlayPage
      challenge={challenge}
      completedCommands={completedCommands}
      completionInFlight={completionInFlight}
      hintCount={hintCount}
      input={terminalInput}
      mistakeCount={mistakeCount}
      notice={notice}
      onBack={() => navigate("/levels")}
      onComplete={completeChallenge}
      onHint={requestHint}
      onInput={setTerminalInput}
      onNext={(nextId) => navigate(`/play/${nextId}`)}
      onReset={() => resetChallengeRun(challenge)}
      onSubmit={submitCommand}
      terminalLines={terminalLines}
    />
  );
}

function PlayPage(props: {
  challenge: Challenge;
  completedCommands: string[];
  completionInFlight: boolean;
  hintCount: number;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const nextChallenge = CHALLENGES[CHALLENGES.findIndex((item) => item.id === props.challenge.id) + 1];
  const done = props.challenge.commands.every((command) => props.completedCommands.includes(command));
  const firstOpenIndex = props.challenge.commands.findIndex((command) => !props.completedCommands.includes(command));
  const objectiveDone = props.completedCommands.length;
  const objectiveTotal = props.challenge.objectives.length;
  const routePercent = Math.round((objectiveDone / objectiveTotal) * 100);
  const currentStateIndex = Math.min(objectiveDone, props.challenge.repositoryStates.length - 1);
  const currentState = props.challenge.repositoryStates[currentStateIndex];

  useEffect(() => {
    inputRef.current?.focus();
  }, [props.challenge.id]);

  return (
    <section className="play-layout">
      <header className="play-page-head">
        <button className="ghost-link" type="button" onClick={props.onBack}>返回关卡</button>
        <div className="play-page-meta">
          <span className="tag">{props.challenge.chapter}</span>
          <span className="play-page-progress">{objectiveDone}/{objectiveTotal} 目标完成</span>
        </div>
      </header>

      <article className="surface mission-panel">
        <p className="eyebrow">{props.challenge.chapter}</p>
        <h2 className="mission-title">{props.challenge.title}</h2>
        <p className="mission-summary">{props.challenge.summary}</p>
        <p className="mission-skill">{props.challenge.skill}</p>
        <p className="mission-concept">{props.challenge.concept}</p>
        <div className="mission-progress">
          <span>{objectiveDone}/{objectiveTotal} 目标</span>
          <div className="progress-track">
            <div style={{ width: `${routePercent}%` }} />
          </div>
        </div>
        <div className="mission-state">
          <small>当前仓库状态</small>
          <p>{currentState}</p>
        </div>
        <ol className="objective-list">
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
      </article>

      <article className="surface command-console">
        <div className="terminal-shell">
          <div className="terminal-chrome" aria-hidden="true">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
            <span className="terminal-chrome-title">gitgame-terminal</span>
          </div>
          <div className="terminal-body">
            <div className="terminal-window validation-log" aria-live="polite">
              {props.terminalLines.map((line, index) => (
                <p
                  className={`${line.kind}${props.terminalLines.length === 1 && line.kind === "info" ? " terminal-placeholder" : ""}`}
                  key={`${line.text}-${index}`}
                >
                  {line.text}
                </p>
              ))}
            </div>
            <div className="terminal-prompt-line">
              <span className="terminal-prompt" aria-hidden="true">$</span>
              <input
                ref={inputRef}
                aria-label="输入 Git 命令"
                className="terminal-prompt-input"
                disabled={done}
                onChange={(event) => props.onInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    props.onSubmit();
                  }
                }}
                placeholder="git ..."
                value={props.input}
              />
            </div>
          </div>
        </div>

        <div className="play-toolbar">
          <div className="play-stats">
            <span>误操作 {props.mistakeCount}</span>
            <span>提示 {props.hintCount}</span>
          </div>
          <div className="hint-grid" aria-label="分层提示">
            {props.challenge.hintLevels.map((_hint, index) => (
              <button className="btn-ghost" key={index} type="button" onClick={() => props.onHint(index)} disabled={done}>
                提示 {index + 1}
              </button>
            ))}
          </div>
          <div className="console-actions">
            <button className="btn-ghost" type="button" onClick={props.onReset}>重练</button>
            <button className="primary" type="button" onClick={props.onComplete} disabled={!done || props.completionInFlight}>
              {props.completionInFlight ? "结算中" : "完成挑战"}
            </button>
          </div>
        </div>
      </article>

      {props.notice && (
        <ResultModal
          challenge={props.challenge}
          nextChallenge={nextChallenge}
          notice={props.notice}
          onNext={props.onNext}
        />
      )}
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
        <div className="result-modal-badge" aria-hidden="true"><Medal /></div>
        <p className="eyebrow">境界突破</p>
        <h2 id="result-title">{challenge.title}</h2>
        <p className="result-modal-sub">挑战已完成</p>
        <div className="result-score-wrap">
          <span className="result-score-label">本关得分</span>
          <div className="result-score">{notice.result.score}</div>
        </div>
        <div className="result-xp-row">
          <span>获得经验值</span>
          <strong>{notice.result.baseXp + notice.result.bonusXp}</strong>
          <small>基础 {notice.result.baseXp} · 精进 {notice.result.bonusXp}</small>
        </div>
        <p className="result-lesson">本关掌握：{challenge.concept}</p>
        <div className="result-flags">
          <span>{notice.bestScoreUpdated ? "刷新最佳成绩" : "保持当前最佳"}</span>
          <span>{notice.result.inOrder ? "路径顺序稳定" : "路径有偏离"}</span>
          <span>{notice.syncStatus.message}</span>
        </div>
        {notice.unlockedTitles.length > 0 && (
          <div className="new-titles">
            <p className="new-titles-label">新解锁道号</p>
            {notice.unlockedTitles.map((titleId) => <span key={titleId}>{getTitleById(titleId).name}</span>)}
          </div>
        )}
        {nextChallenge && (
          <button className="primary result-next" type="button" onClick={() => onNext(nextChallenge.id)}>
            下一关 · {nextChallenge.title}
            <ChevronRight aria-hidden="true" />
          </button>
        )}
      </section>
    </div>
  );
}
