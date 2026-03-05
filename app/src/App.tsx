import { useState, useMemo, useRef } from 'react';
import { QUESTIONS } from './questions';
import type { FermiQuestion, Category } from './questions';

type Phase = 'home' | 'question' | 'revealed' | 'summary';

interface UserAnswer {
  question: FermiQuestion;
  userInput: string;
  userValue: number;
  logError: number; // |log10(user/answer)|
  grade: Grade;
}

type Grade = 'perfect' | 'excellent' | 'good' | 'ok' | 'off';

function gradeByLogError(logError: number): Grade {
  if (logError < 0.15) return 'perfect';    // 42% 以内
  if (logError < 0.5) return 'excellent';   // 3倍以内
  if (logError < 1.0) return 'good';        // 10倍以内
  if (logError < 2.0) return 'ok';          // 100倍以内
  return 'off';
}

const GRADE_INFO: Record<Grade, { label: string; emoji: string; color: string }> = {
  perfect:   { label: 'ドンピシャ！', emoji: '🎯', color: '#ffd700' },
  excellent: { label: '優秀',         emoji: '⭐', color: '#4caf50' },
  good:      { label: 'まあまあ',     emoji: '👍', color: '#4fc3f7' },
  ok:        { label: 'ちょっと外れ', emoji: '🤔', color: '#ff9f43' },
  off:       { label: '大外れ',       emoji: '💨', color: '#f44336' },
};

function formatLargeNumber(n: number): string {
  if (n >= 1e16) return (n / 1e16).toFixed(2) + '京';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + '兆';
  if (n >= 1e8)  return (n / 1e8).toFixed(2) + '億';
  if (n >= 1e4)  return (n / 1e4).toFixed(2) + '万';
  return n.toFixed(2);
}

const ALL_CATEGORIES: Category[] = ['ビジネス', '科学', '日常生活', '地理', 'テクノロジー', '人体'];

const CATEGORY_EMOJIS: Record<Category, string> = {
  'ビジネス': '💼', '科学': '🔬', '日常生活': '🏠', '地理': '🌍', 'テクノロジー': '💻', '人体': '🧬',
};

export default function App() {
  const [phase, setPhase] = useState<Phase>('home');
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(new Set(ALL_CATEGORIES));
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState<FermiQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [inputStr, setInputStr] = useState('');
  const [mantissa, setMantissa] = useState('1');
  const [exponent, setExponent] = useState('0');
  const [useScientific, setUseScientific] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [showSteps, setShowSteps] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredPool = useMemo(() =>
    QUESTIONS.filter(q => selectedCategories.has(q.category)),
  [selectedCategories]);

  const startGame = () => {
    const shuffled = [...filteredPool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));
    setQuestions(selected);
    setCurrentIdx(0);
    setAnswers([]);
    setInputStr('');
    setMantissa('1');
    setExponent('0');
    setHintLevel(0);
    setShowSteps(false);
    setPhase('question');
  };

  const computeUserValue = (): number => {
    if (useScientific) {
      const m = parseFloat(mantissa) || 1;
      const e = parseInt(exponent) || 0;
      return m * Math.pow(10, e);
    }
    return parseFloat(inputStr) || 0;
  };

  const submitAnswer = () => {
    const userVal = computeUserValue();
    if (userVal <= 0) return;
    const q = questions[currentIdx];
    const logError = Math.abs(Math.log10(userVal / q.answer));
    const grade = gradeByLogError(logError);
    const ans: UserAnswer = {
      question: q, userInput: useScientific ? `${mantissa}×10^${exponent}` : inputStr,
      userValue: userVal, logError, grade,
    };
    setAnswers(prev => [...prev, ans]);
    setPhase('revealed');
    setShowSteps(false);
  };

  const nextQuestion = () => {
    setInputStr('');
    setMantissa('1');
    setExponent('0');
    setHintLevel(0);
    setShowSteps(false);
    if (currentIdx + 1 >= questions.length) {
      setPhase('summary');
    } else {
      setCurrentIdx(i => i + 1);
      setPhase('question');
    }
  };

  const toggleCategory = (cat: Category) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) { if (next.size > 1) next.delete(cat); }
      else next.add(cat);
      return next;
    });
  };

  const bg = 'linear-gradient(135deg, #1a1a0a 0%, #0a1a0a 50%, #1a0a0a 100%)';
  const font = "'Segoe UI','Hiragino Sans',sans-serif";

  // HOME
  if (phase === 'home') return (
    <div style={{ minHeight: '100vh', background: bg, color: 'white', fontFamily: font, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontSize: '16px' }}>
      <div style={{ maxWidth: '550px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: '12px' }}>🧪</div>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 900, margin: '0 0 10px', background: 'linear-gradient(135deg, #ffd700, #ff9f43)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          フェルミ推定チャレンジ
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '28px', fontSize: '15px' }}>
          「日本のコンビニは何店舗？」「一生で歩く距離は？」<br />
          <strong style={{ color: '#ffd700' }}>正確な数字より「桁の感覚」</strong>を鍛えよう。
        </p>

        {/* Categories */}
        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>カテゴリ</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ALL_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => toggleCategory(cat)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
                  border: `2px solid ${selectedCategories.has(cat) ? '#ffd700' : 'rgba(255,255,255,0.2)'}`,
                  background: selectedCategories.has(cat) ? 'rgba(255,215,0,0.15)' : 'transparent',
                  color: selectedCategories.has(cat) ? '#ffd700' : 'rgba(255,255,255,0.5)',
                  fontWeight: selectedCategories.has(cat) ? 700 : 400,
                  cursor: 'pointer', fontFamily: font,
                }}>
                {CATEGORY_EMOJIS[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        <div style={{ textAlign: 'left', marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>問題数（利用可能: {filteredPool.length}問）</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[5, 10, 15, 20].map(n => (
              <button key={n} onClick={() => setQuestionCount(n)}
                style={{
                  padding: '6px 16px', borderRadius: '8px', fontSize: '14px',
                  border: `1px solid ${questionCount === n ? '#ffd700' : 'rgba(255,255,255,0.2)'}`,
                  background: questionCount === n ? 'rgba(255,215,0,0.15)' : 'transparent',
                  color: questionCount === n ? '#ffd700' : 'rgba(255,255,255,0.5)',
                  fontWeight: questionCount === n ? 700 : 400, cursor: 'pointer', fontFamily: font,
                }}>{n}問</button>
            ))}
          </div>
        </div>

        <button onClick={startGame} disabled={filteredPool.length === 0}
          style={{
            padding: '14px 48px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #ffd700, #ff9f43)',
            color: '#000', fontSize: '18px', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(255,215,0,0.35)', fontFamily: font,
          }}>
          🧪 チャレンジ開始！
        </button>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '14px' }}>
          全30問 · 6カテゴリ · 桁評価スコアリング
        </p>
      </div>
    </div>
  );

  // SUMMARY
  if (phase === 'summary') {
    const grades = answers.map(a => a.grade);
    const gradeCount = (g: Grade) => grades.filter(x => x === g).length;
    const avgLogError = answers.reduce((s, a) => s + a.logError, 0) / answers.length;
    const overallGrade = gradeByLogError(avgLogError);
    const info = GRADE_INFO[overallGrade];
    return (
      <div style={{ minHeight: '100vh', background: bg, color: 'white', fontFamily: font, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '60px' }}>{info.emoji}</div>
            <h2 style={{ fontSize: '26px', fontWeight: 900, color: info.color, marginBottom: '6px' }}>{info.label}</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              平均誤差：{avgLogError.toFixed(2)} 桁 (10^{avgLogError.toFixed(2)}≈{Math.pow(10, avgLogError).toFixed(1)}倍の誤差)
            </p>
          </div>

          {/* Grade breakdown */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            {(['perfect', 'excellent', 'good', 'ok', 'off'] as Grade[]).map(g => {
              const cnt = gradeCount(g);
              if (cnt === 0) return null;
              const gi = GRADE_INFO[g];
              return (
                <div key={g} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px' }}>{gi.emoji}</div>
                  <div style={{ color: gi.color, fontWeight: 700, fontSize: '18px' }}>{cnt}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{gi.label}</div>
                </div>
              );
            })}
          </div>

          {/* Answer list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', maxHeight: '50vh', overflowY: 'auto' }}>
            {answers.map((ans, i) => {
              const gi = GRADE_INFO[ans.grade];
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px', border: `1px solid rgba(255,255,255,0.08)` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', marginBottom: '4px' }}>{ans.question.emoji} {ans.question.question}</div>
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>あなた: </span>
                        <span style={{ color: gi.color }}>{formatLargeNumber(ans.userValue)}{ans.question.unit}</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>→</span>
                        <span style={{ color: '#4caf50' }}>正解: {formatLargeNumber(ans.question.answer)}{ans.question.unit}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '18px' }}>{gi.emoji}</div>
                      <div style={{ fontSize: '11px', color: gi.color }}>{ans.logError.toFixed(1)}桁</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setPhase('home')} style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
              color: 'white', fontSize: '15px', cursor: 'pointer', fontFamily: font,
            }}>🏠 ホーム</button>
            <button onClick={startGame} style={{
              flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #ffd700, #ff9f43)',
              color: '#000', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: font,
            }}>🔁 もう一度</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const currentAnswer = answers[answers.length - 1];

  // QUESTION & REVEALED
  return (
    <div style={{ minHeight: '100vh', background: bg, color: 'white', fontFamily: font, padding: '16px', fontSize: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Progress */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            <span>問題 {currentIdx + 1} / {questions.length}</span>
            <span>{CATEGORY_EMOJIS[q.category]} {q.category}</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
            <div style={{ height: '100%', width: `${(currentIdx / questions.length) * 100}%`, background: '#ffd700', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Question card */}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '16px', border: '1px solid rgba(255,215,0,0.2)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px', textAlign: 'center' }}>{q.emoji}</div>
          <h2 style={{ fontSize: 'clamp(16px, 3.5vw, 20px)', fontWeight: 700, lineHeight: 1.5, textAlign: 'center', marginBottom: '8px' }}>
            {q.question}
          </h2>
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            単位: <strong style={{ color: '#ffd700' }}>{q.unit}</strong>
          </div>
        </div>

        {/* Hints */}
        {hintLevel >= 1 && phase === 'question' && (
          <div style={{ background: 'rgba(255,159,67,0.1)', border: '1px solid rgba(255,159,67,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '12px', fontSize: '14px', color: '#ff9f43' }}>
            💡 ヒント1: {q.hint1}
          </div>
        )}
        {hintLevel >= 2 && phase === 'question' && (
          <div style={{ background: 'rgba(255,159,67,0.1)', border: '1px solid rgba(255,159,67,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '12px', fontSize: '14px', color: '#ff9f43' }}>
            💡 ヒント2: {q.hint2}
          </div>
        )}

        {/* Input */}
        {phase === 'question' && (
          <>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button onClick={() => setUseScientific(false)} style={{
                  flex: 1, padding: '6px', borderRadius: '8px', fontSize: '13px',
                  border: `1px solid ${!useScientific ? '#ffd700' : 'rgba(255,255,255,0.2)'}`,
                  background: !useScientific ? 'rgba(255,215,0,0.15)' : 'transparent',
                  color: !useScientific ? '#ffd700' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: font,
                }}>普通入力</button>
                <button onClick={() => setUseScientific(true)} style={{
                  flex: 1, padding: '6px', borderRadius: '8px', fontSize: '13px',
                  border: `1px solid ${useScientific ? '#ffd700' : 'rgba(255,255,255,0.2)'}`,
                  background: useScientific ? 'rgba(255,215,0,0.15)' : 'transparent',
                  color: useScientific ? '#ffd700' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: font,
                }}>指数入力 (×10ⁿ)</button>
              </div>

              {!useScientific ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    ref={inputRef}
                    type="number"
                    value={inputStr}
                    onChange={e => setInputStr(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && inputStr) submitAnswer(); }}
                    placeholder="数値を入力..."
                    style={{
                      flex: 1, padding: '12px 16px', borderRadius: '10px', fontSize: '18px',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,215,0,0.3)',
                      color: 'white', outline: 'none', fontFamily: font,
                    }}
                  />
                  <span style={{ color: '#ffd700', fontSize: '14px', whiteSpace: 'nowrap' }}>{q.unit}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <input type="number" value={mantissa} onChange={e => setMantissa(e.target.value)}
                    placeholder="1.5"
                    style={{ width: '80px', padding: '10px 12px', borderRadius: '8px', fontSize: '16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,215,0,0.3)', color: 'white', outline: 'none', fontFamily: font }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>×10^</span>
                  <input type="number" value={exponent} onChange={e => setExponent(e.target.value)}
                    placeholder="6"
                    style={{ width: '70px', padding: '10px 12px', borderRadius: '8px', fontSize: '16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,215,0,0.3)', color: 'white', outline: 'none', fontFamily: font }} />
                  <span style={{ color: '#ffd700', fontSize: '13px' }}>{q.unit}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                    = {formatLargeNumber(computeUserValue())}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {hintLevel < 2 && (
                <button onClick={() => setHintLevel(h => h + 1)} style={{
                  padding: '10px 16px', borderRadius: '10px',
                  border: '1px solid rgba(255,159,67,0.4)', background: 'rgba(255,159,67,0.1)',
                  color: '#ff9f43', fontSize: '14px', cursor: 'pointer', fontFamily: font,
                }}>💡 ヒント{hintLevel + 1}</button>
              )}
              <button onClick={submitAnswer} disabled={(!inputStr && !useScientific) || computeUserValue() <= 0}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #ffd700, #ff9f43)',
                  color: '#000', fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: font,
                  opacity: ((!inputStr && !useScientific) || computeUserValue() <= 0) ? 0.5 : 1,
                }}>答えを送信</button>
            </div>
          </>
        )}

        {/* Revealed */}
        {phase === 'revealed' && currentAnswer && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            {/* Result card */}
            <div style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '20px',
              marginBottom: '14px', border: `1px solid ${GRADE_INFO[currentAnswer.grade].color}40`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>{GRADE_INFO[currentAnswer.grade].emoji}</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: GRADE_INFO[currentAnswer.grade].color, marginBottom: '12px' }}>
                {GRADE_INFO[currentAnswer.grade].label}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>あなたの答え</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: GRADE_INFO[currentAnswer.grade].color }}>
                    {formatLargeNumber(currentAnswer.userValue)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>正解</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#4caf50' }}>
                    {formatLargeNumber(q.answer)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                誤差: 約 {Math.pow(10, currentAnswer.logError).toFixed(1)}倍 ({currentAnswer.logError.toFixed(2)}桁)
              </div>
            </div>

            {/* Thinking steps */}
            <button onClick={() => setShowSteps(s => !s)} style={{
              width: '100%', padding: '10px', borderRadius: '10px', marginBottom: '8px',
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.7)', fontSize: '14px', cursor: 'pointer', fontFamily: font,
            }}>
              {showSteps ? '▲ 思考ステップを閉じる' : '▼ 思考ステップを見る'}
            </button>

            {showSteps && (
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#ffd700' }}>フェルミ推定の考え方：</div>
                {q.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                    <span style={{ color: '#ffd700', fontWeight: 700, flexShrink: 0 }}>Step {i + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: 'rgba(79,195,247,0.08)', borderRadius: '10px', padding: '12px', marginBottom: '14px', fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
              💡 <strong style={{ color: '#4fc3f7' }}>豆知識:</strong> {q.funFact}
            </div>

            <button onClick={nextQuestion} style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #ffd700, #ff9f43)',
              color: '#000', fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: font,
            }}>
              {currentIdx + 1 < questions.length ? '次の問題へ →' : '結果を見る 🏆'}
            </button>
          </div>
        )}

        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
      </div>
    </div>
  );
}
