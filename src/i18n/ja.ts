import { mergeTranslations, type Translation } from './types';
import { jaApp } from './app/ja';
import { dashboard } from './app/dashboard';
import { utilities } from './app/utilities';
import { growth } from './app/growth';
import { activity } from './app/activity';

/** Splash, intro, language and onboarding. App screens live in `app/ja.ts`. */
const firstRun: Translation = {
  common: { next: '次へ', back: '戻る', skip: 'スキップ', done: '完了', continue: '続ける', search: '検索' },
  splash: { tagline: 'もっと良く。もっと強く。' },
  intro: {
    slides: [
      { tag: 'パーソナル', title: 'あなたに合わせたトレーニング', body: '目標・経験・ライフスタイルから、毎回のワークアウトを組み立てます。' },
      { tag: 'ガイド付き', title: 'すべての動きをわかりやすく', body: '大切なポイントに絞った、見やすいデモ。' },
      { tag: '進捗', title: '成長がはっきり見える', body: '連続記録、データ、自己ベストをひとつの場所に。' },
      { tag: '継続', title: '小さな勝利を、毎週。', body: '勢いを保つウィークリーチャレンジ。' },
    ],
    start: 'はじめよう',
    visual: {
      goal: 'あなたの目標', goalValue: '筋肉をつける', schedule: '週4日', level: '中級',
      exercise: 'ゴブレットスクワット', reps: '回数', sets: 'セット', muscle: '部位', muscleValue: 'お尻・太もも', technique: 'フォーム', techniqueValue: 'ゆっくり下ろす',
      thisWeek: '今週', workouts: 'ワークアウト', minutes: '分', personalBest: '自己ベスト更新',
      challenge: '今週のチャレンジ', challengeValue: '4回中3回達成', streak: '日連続', badge: 'バッジ獲得', badgeValue: '早起きアスリート', complete: 'ワークアウト完了',
    },
  },
  language: { title: '言語を選択', body: 'いつでも変更できます。', search: '言語を検索', popular: '人気', all: 'すべての言語', results: '検索結果', noResults: '「{query}」に一致する言語はありません。', continueIn: '{language}で続ける' },
  onboarding: {
    stepOf: 'ステップ {current} / {total}',
    goal: {
      title: '何のためにトレーニングしますか？', subtitle: 'いま一番大切な目標を選んでください。', cta: 'これが私の目標',
      options: {
        'build-muscle': { title: '筋肉をつける', body: 'サイズとパワーを手に入れる。' },
        'lose-fat': { title: '脂肪を落とす', body: '引き締めて、身軽に。' },
        'get-stronger': { title: '強くなる', body: 'もっと重く、力強く。' },
        'stay-fit': { title: '健康を保つ', body: '毎日を気持ちよく。' },
        'improve-endurance': { title: '持久力を高める', body: '長く動けて、早く回復。' },
        'improve-mobility': { title: '柔軟性を高める', body: 'こわばりなく自由に動く。' },
      },
    },
    experience: {
      title: 'いまのレベルは？', subtitle: '正解も不正解もありません。ここから始めましょう。',
      options: {
        beginner: { title: '初心者', body: 'まだ基本を学んでいるところ。' },
        intermediate: { title: '中級者', body: '定期的にトレーニングしている。' },
        advanced: { title: '上級者', body: 'トレーニングは生活の一部。' },
      },
    },
    location: {
      title: '主にどこでトレーニングしますか？', subtitle: '場所に合わせてエクササイズを選びます。',
      options: {
        gym: { title: 'ジム', body: 'ラック、マシン、フリーウェイト。' },
        home: { title: '自宅', body: '自分の空間、自分のペースで。' },
        both: { title: '両方', body: '週ごとに使い分ける。' },
      },
    },
    days: {
      title: '週に何日トレーニングできますか？', subtitle: '完璧より、継続。', unit: '日 / 週', cta: '1週間を決定',
      weekdays: ['月', '火', '水', '木', '金', '土', '日'],
      feedback: { 2: '賢く、着実なスタート。', 3: 'バランス抜群。', 4: '本格的な習慣が身につきます。', 5: 'より早い成長にぴったり。', 6: 'アスリートモード。回復も組み込み済み。', 7: '毎日。アクティブリカバリー付き。' },
    },
    duration: {
      title: '1回にどれくらい時間がありますか？', subtitle: '1セッションあたり。1分も無駄にしません。', unit: '分',
      options: { '20-30': 'サクッと集中', '30-45': 'ちょうどいい', '45-60': 'しっかり', '60-90': 'フルセッション' },
    },
    equipment: {
      title: '使える器具は？', subtitle: '使えるものをすべて選んでください。', selected: '{count}個選択中',
      options: { dumbbells: 'ダンベル', barbell: 'バーベル', bench: 'ベンチ', 'cable-machine': 'ケーブルマシン', bands: 'チューブ', 'smith-machine': 'スミスマシン', 'pull-up-bar': '懸垂バー', machines: 'マシン', bodyweight: '自重', 'full-gym': 'フル設備のジム' },
    },
    age: { title: '年齢は？', subtitle: '最適な強度の設定に使います。', unit: '歳' },
    height: { title: '身長は？', subtitle: 'トレーニング負荷の調整に使います。', unit: 'cm' },
    weight: { title: '体重は？', subtitle: 'あなただけに表示されます。', unit: 'kg' },
    gender: {
      title: '性別は？', subtitle: 'プランのパーソナライズに役立ちます。', cta: 'プランを作成',
      options: { woman: '女性', man: '男性', 'non-binary': 'ノンバイナリー', unspecified: '回答しない' },
    },
    complete: {
      building: 'プランを作成中', checks: ['目標をマッチング', 'スケジュールを調整', 'エクササイズを選定'],
      title: 'プランが完成しました', body: '目標・スケジュール・器具に合わせて作成しました。',
      goal: '目標', schedule: 'スケジュール', session: 'セッション', location: '場所', perWeek: '週{count}日',
      cta: 'はじめよう', error: 'プランを保存できませんでした。接続を確認してください。', retry: '再試行',
    },
  },
};

export const ja = mergeTranslations(firstRun, jaApp, dashboard.ja, utilities.ja, growth.ja, activity.ja);
