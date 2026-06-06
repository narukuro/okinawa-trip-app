import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ===== 診断データ =====
// 各設問は3つの選択肢を持ち、それぞれ giver / taker / matcher のいずれかに対応する。
// 回答を集計し、最も多かったタイプを診断結果として表示する。
const QUESTIONS = [
  {
    text: '同僚が仕事で困っています。あなたは？',
    options: [
      { label: '自分の手を止めてでも、まず助ける', type: 'giver' },
      { label: '自分の仕事に支障がない範囲で手伝う', type: 'matcher' },
      { label: '基本は自分の担当に集中する', type: 'taker' },
    ],
  },
  {
    text: '誰かに親切にしてもらったとき、まず思うのは？',
    options: [
      { label: 'うれしい。自分も誰かに親切にしよう', type: 'giver' },
      { label: 'お返しをしないと、と感じる', type: 'matcher' },
      { label: 'ラッキー、得した', type: 'taker' },
    ],
  },
  {
    text: 'チームで成果が出ました。手柄は？',
    options: [
      { label: 'みんなのおかげ、と仲間を立てる', type: 'giver' },
      { label: '貢献した人それぞれが評価されるべき', type: 'matcher' },
      { label: '自分の働きをしっかりアピールしたい', type: 'taker' },
    ],
  },
  {
    text: '知らない人から助けを求められたら？',
    options: [
      { label: '見返りがなくても進んで力を貸す', type: 'giver' },
      { label: '相手や状況によって判断する', type: 'matcher' },
      { label: '自分にメリットがあれば動く', type: 'taker' },
    ],
  },
  {
    text: '人を紹介・推薦するときの基準は？',
    options: [
      { label: 'その人のためになるなら積極的に繋ぐ', type: 'giver' },
      { label: 'お互いにメリットがありそうなら繋ぐ', type: 'matcher' },
      { label: '自分に返ってくるものがあるかで決める', type: 'taker' },
    ],
  },
  {
    text: '会議で発言するとき意識するのは？',
    options: [
      { label: '全体やメンバーにとって良いことか', type: 'giver' },
      { label: '公平か、バランスが取れているか', type: 'matcher' },
      { label: '自分の立場や評価が上がるか', type: 'taker' },
    ],
  },
  {
    text: '友人へのプレゼント選び。あなたは？',
    options: [
      { label: '相手が喜ぶ顔を想像して全力で選ぶ', type: 'giver' },
      { label: 'もらった額と釣り合う範囲で選ぶ', type: 'matcher' },
      { label: '予算や手間をなるべく抑えたい', type: 'taker' },
    ],
  },
  {
    text: '自分の知識やノウハウを共有することについて',
    options: [
      { label: '惜しまず公開して周りの役に立ちたい', type: 'giver' },
      { label: '相手も共有してくれるなら出す', type: 'matcher' },
      { label: '自分の強みなので簡単には教えない', type: 'taker' },
    ],
  },
  {
    text: '交渉ごとであなたが大事にするのは？',
    options: [
      { label: '相手も満足できる着地点', type: 'giver' },
      { label: 'お互いフェアな条件', type: 'matcher' },
      { label: '自分が最大限得をすること', type: 'taker' },
    ],
  },
  {
    text: 'SNSやチャットへの反応で多いのは？',
    options: [
      { label: '人の投稿を応援・称賛することが多い', type: 'giver' },
      { label: '反応をくれた人にはきちんと返す', type: 'matcher' },
      { label: '自分の発信が中心で反応は控えめ', type: 'taker' },
    ],
  },
  {
    text: '後輩や新人へのサポートについて',
    options: [
      { label: '時間を割いて丁寧に面倒を見る', type: 'giver' },
      { label: '聞かれたら、できる範囲で答える', type: 'matcher' },
      { label: '自分の業務優先で必要最低限', type: 'taker' },
    ],
  },
  {
    text: '「持ちつ持たれつ」という言葉について',
    options: [
      { label: 'まず自分が持つ側でありたい', type: 'giver' },
      { label: 'まさに理想。バランスが大事', type: 'matcher' },
      { label: 'できれば持たれる側でいたい', type: 'taker' },
    ],
  },
];

const RESULTS = {
  giver: {
    emoji: '🤝',
    title: 'ギバー（Giver）',
    subtitle: '惜しみなく与える人',
    color: '#16a34a',
    bg: '#dcfce7',
    description:
      '見返りを期待せず、まず相手に与えることを大切にするタイプ。周囲からの信頼が厚く、長い目で見ると大きな成功をつかみやすいと言われます。一方で、与えすぎて自分が疲れてしまわないよう、上手に線を引くことも大切です。',
  },
  taker: {
    emoji: '🎯',
    title: 'テイカー（Taker）',
    subtitle: '自分の利益を優先する人',
    color: '#dc2626',
    bg: '#fee2e2',
    description:
      '自分のメリットや成果を起点に動く、目的意識の強いタイプ。短期的に成果を出しやすい反面、信頼が積み上がりにくい面も。ときには見返りを求めず与えてみると、人間関係がぐっと広がるかもしれません。',
  },
  matcher: {
    emoji: '⚖️',
    title: 'マッチャー（Matcher）',
    subtitle: '釣り合いを大切にする人',
    color: '#2563eb',
    bg: '#dbeafe',
    description:
      'ギブとテイクのバランスを取り、「公平さ」を重視するタイプ。多くの人がこのタイプと言われます。困っている人は助け、助けてくれた人には恩を返す——安定した信頼関係を築けるのが強みです。',
  },
};

export default function App() {
  const [step, setStep] = useState(-1); // -1: スタート画面, 0..n-1: 設問, >=n: 結果
  const [answers, setAnswers] = useState([]);

  const total = QUESTIONS.length;

  const resultType = useMemo(() => {
    if (answers.length < total) return null;
    const count = { giver: 0, taker: 0, matcher: 0 };
    answers.forEach((t) => (count[t] += 1));
    // 同数の場合は matcher → giver → taker の優先で決定
    const order = ['matcher', 'giver', 'taker'];
    return order.reduce((best, t) => (count[t] > count[best] ? t : best), order[0]);
  }, [answers, total]);

  const start = () => {
    setAnswers([]);
    setStep(0);
  };

  const choose = (type) => {
    setAnswers([...answers, type]);
    setStep(step + 1);
  };

  const back = () => {
    if (step <= 0) {
      setStep(-1);
      return;
    }
    setAnswers(answers.slice(0, -1));
    setStep(step - 1);
  };

  // ===== スタート画面 =====
  if (step === -1) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.startWrap}>
          <Text style={styles.startEmoji}>🤝</Text>
          <Text style={styles.startTitle}>ギバー診断</Text>
          <Text style={styles.startLead}>
            あなたは{'\n'}
            <Text style={{ color: RESULTS.giver.color, fontWeight: '800' }}>ギバー</Text>・
            <Text style={{ color: RESULTS.taker.color, fontWeight: '800' }}>テイカー</Text>・
            <Text style={{ color: RESULTS.matcher.color, fontWeight: '800' }}>マッチャー</Text>
            ？
          </Text>
          <Text style={styles.startDesc}>
            全{total}問の質問に答えると、あなたの「人との関わり方タイプ」がわかります。
            直感で選んでみてください。
          </Text>
          <Pressable style={styles.primaryBtn} onPress={start}>
            <Text style={styles.primaryBtnText}>診断をはじめる</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ===== 結果画面 =====
  if (step >= total && resultType) {
    const r = RESULTS[resultType];
    const count = { giver: 0, taker: 0, matcher: 0 };
    answers.forEach((t) => (count[t] += 1));
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: r.bg }]}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <Text style={styles.resultLabel}>あなたのタイプは…</Text>
          <Text style={styles.resultEmoji}>{r.emoji}</Text>
          <Text style={[styles.resultTitle, { color: r.color }]}>{r.title}</Text>
          <Text style={styles.resultSubtitle}>{r.subtitle}</Text>

          <View style={styles.card}>
            <Text style={styles.resultDesc}>{r.description}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.breakdownTitle}>回答の内訳</Text>
            {['giver', 'matcher', 'taker'].map((t) => (
              <View key={t} style={styles.barRow}>
                <Text style={styles.barLabel}>{RESULTS[t].title.split('（')[0]}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(count[t] / total) * 100}%`,
                        backgroundColor: RESULTS[t].color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barCount}>{count[t]}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.primaryBtn} onPress={start}>
            <Text style={styles.primaryBtnText}>もう一度診断する</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===== 設問画面 =====
  const q = QUESTIONS[step];
  const progress = (step / total) * 100;
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.quizHeader}>
        <Pressable onPress={back} hitSlop={12}>
          <Text style={styles.backText}>‹ 戻る</Text>
        </Pressable>
        <Text style={styles.counter}>
          {step + 1} / {total}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.quizScroll}>
        <Text style={styles.qNumber}>Q{step + 1}</Text>
        <Text style={styles.qText}>{q.text}</Text>

        <View style={styles.options}>
          {q.options.map((opt, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [styles.optionBtn, pressed && styles.optionBtnPressed]}
              onPress={() => choose(opt.type)}
            >
              <Text style={styles.optionText}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  // スタート
  startWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  startEmoji: { fontSize: 72, marginBottom: 8 },
  startTitle: { fontSize: 34, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  startLead: {
    fontSize: 22,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 20,
  },
  startDesc: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  primaryBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 999,
    alignSelf: 'stretch',
    marginHorizontal: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  // 設問
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backText: { fontSize: 16, color: '#64748b', fontWeight: '600' },
  counter: { fontSize: 16, color: '#94a3b8', fontWeight: '700' },
  progressTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 20,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#0f172a', borderRadius: 999 },
  quizScroll: { padding: 24, paddingTop: 32 },
  qNumber: { fontSize: 15, fontWeight: '800', color: '#94a3b8', marginBottom: 8 },
  qText: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 33,
    marginBottom: 32,
  },
  options: { gap: 14 },
  optionBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  optionBtnPressed: { backgroundColor: '#f1f5f9', borderColor: '#0f172a' },
  optionText: { fontSize: 16, color: '#1e293b', lineHeight: 24, fontWeight: '600' },
  // 結果
  resultScroll: { padding: 24, paddingTop: 24, alignItems: 'center' },
  resultLabel: { fontSize: 16, color: '#475569', fontWeight: '600', marginBottom: 8 },
  resultEmoji: { fontSize: 80, marginBottom: 4 },
  resultTitle: { fontSize: 30, fontWeight: '800', marginBottom: 4 },
  resultSubtitle: { fontSize: 16, color: '#475569', fontWeight: '600', marginBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    alignSelf: 'stretch',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  resultDesc: { fontSize: 15, color: '#334155', lineHeight: 26 },
  breakdownTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  barLabel: { width: 64, fontSize: 14, color: '#475569', fontWeight: '700' },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  barFill: { height: '100%', borderRadius: 999 },
  barCount: { width: 20, fontSize: 14, color: '#475569', fontWeight: '700', textAlign: 'right' },
});
