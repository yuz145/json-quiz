#!/usr/bin/env node
// Cloudflare KV (QUIZ_KV) → D1 (json-quiz-db) 移行スクリプト
//
// 前提:
//   - wrangler にログイン済みで、対象アカウントにアクセスできること
//   - schema.sql が対象のD1データベースに適用済みであること
//
// 使い方:
//   node migrate-kv-to-d1.js
//
// 環境変数で上書き可能:
//   QUIZ_KV_NAMESPACE_ID  移行元のKV Namespace ID（デフォルト: 本プロジェクトのjson-quiz-kv）
//   D1_DATABASE_NAME      移行先のD1データベース名（デフォルト: json-quiz-db）

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const KV_NAMESPACE_ID = process.env.QUIZ_KV_NAMESPACE_ID || 'cf70c3bdac08400c90968a12f5c8e64d';
const D1_DATABASE_NAME = process.env.D1_DATABASE_NAME || 'json-quiz-db';

function runWrangler(args) {
  return execFileSync('wrangler', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 });
}

function listKvKeys(prefix) {
  const args = ['kv', 'key', 'list', '--namespace-id', KV_NAMESPACE_ID, '--remote'];
  if (prefix) args.push('--prefix', prefix);
  const out = runWrangler(args);
  return JSON.parse(out).map(k => k.name);
}

function getKvValue(key) {
  return runWrangler(['kv', 'key', 'get', '--namespace-id', KV_NAMESPACE_ID, '--remote', key]);
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function d1QueryCount(sql) {
  const out = runWrangler(['d1', 'execute', D1_DATABASE_NAME, '--remote', '--command', sql, '--json']);
  return JSON.parse(out)[0].results[0].c;
}

function main() {
  console.log('KVのキー一覧を取得しています...');
  const allKeys = listKvKeys();
  const quizKeys = allKeys.filter(k => k.startsWith('quiz:'));
  const progressKeys = allKeys.filter(k => k.startsWith('progress:'));
  console.log(`対象: quiz:* ${quizKeys.length}件, progress:* ${progressKeys.length}件`);
  console.log(`(index:quizzes / index:progress:* はD1側でSELECTにより代替するため移行対象外)`);

  const statements = [];
  let skipped = 0;

  for (const key of quizKeys) {
    const id = key.slice('quiz:'.length);
    let data;
    try {
      data = JSON.parse(getKvValue(key));
    } catch (e) {
      console.error(`スキップ: ${key} の取得/パースに失敗しました: ${e.message}`);
      skipped++;
      continue;
    }
    const category = (typeof data.category === 'string' && data.category.trim()) ? data.category.trim() : '未分類';
    const questionsJson = JSON.stringify(data.questions || []);
    const now = new Date().toISOString();
    statements.push(
      `INSERT OR REPLACE INTO quizzes (id, title, category, questions, created_at, updated_at) VALUES (` +
      `${sqlString(data.id || id)}, ${sqlString(data.title || '')}, ${sqlString(category)}, ` +
      `${sqlString(questionsJson)}, ${sqlString(data.createdAt || now)}, ${sqlString(data.updatedAt || now)});`
    );
  }

  for (const key of progressKeys) {
    const rest = key.slice('progress:'.length);
    const sepIdx = rest.indexOf(':');
    const quizId = rest.slice(0, sepIdx);
    const deviceId = rest.slice(sepIdx + 1);
    let data;
    try {
      data = JSON.parse(getKvValue(key));
    } catch (e) {
      console.error(`スキップ: ${key} の取得/パースに失敗しました: ${e.message}`);
      skipped++;
      continue;
    }
    const now = new Date().toISOString();
    statements.push(
      `INSERT OR REPLACE INTO progress (quiz_id, device_id, ip, idx, order_json, correct, wrong, wrong_indices_json, mode, answer_mode, shuffle_on, completed, updated_at) VALUES (` +
      `${sqlString(data.quizId || quizId)}, ${sqlString(data.deviceId || deviceId)}, ${sqlString(data.ip || null)}, ` +
      `${Number.isInteger(data.idx) ? data.idx : 0}, ${sqlString(JSON.stringify(data.order || []))}, ` +
      `${Number.isInteger(data.correct) ? data.correct : 0}, ${Number.isInteger(data.wrong) ? data.wrong : 0}, ` +
      `${sqlString(JSON.stringify(data.wrongIndices || []))}, ${sqlString(data.mode || 'normal')}, ` +
      `${sqlString(data.answerMode || 'self')}, ${data.shuffleOn ? 1 : 0}, ${data.completed ? 1 : 0}, ` +
      `${sqlString(data.updatedAt || now)});`
    );
  }

  if (skipped > 0) {
    console.warn(`${skipped}件のキーをスキップしました（上記エラー参照）。`);
  }

  if (statements.length === 0) {
    console.log('移行対象のデータがありません。終了します。');
    return;
  }

  const sqlFile = path.join(os.tmpdir(), `kv-to-d1-migration-${Date.now()}.sql`);
  fs.writeFileSync(sqlFile, statements.join('\n'), 'utf8');
  console.log(`${statements.length}件のINSERT文を生成し、D1に投入します...`);

  runWrangler(['d1', 'execute', D1_DATABASE_NAME, '--remote', '--file', sqlFile, '-y']);
  fs.unlinkSync(sqlFile);
  console.log('D1への投入が完了しました。');

  const quizCountD1 = d1QueryCount('SELECT COUNT(*) as c FROM quizzes;');
  const progressCountD1 = d1QueryCount('SELECT COUNT(*) as c FROM progress;');

  console.log('--- 移行結果の件数確認 ---');
  console.log(`quizzes:  KV=${quizKeys.length}件 / D1=${quizCountD1}件 -> ${quizKeys.length === quizCountD1 ? '一致 OK' : '不一致 NG'}`);
  console.log(`progress: KV=${progressKeys.length}件 / D1=${progressCountD1}件 -> ${progressKeys.length === progressCountD1 ? '一致 OK' : '不一致 NG'}`);
}

main();
