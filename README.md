# 自作クイズアプリ

`index.html` を開くだけで動くクイズアプリです。フロントエンドは外部ライブラリなしの素のHTML/JS/CSSで、Cloudflare Pages Functions + KVを使ったクラウド機能（クイズセットの共有・進捗保存・ランキング）を追加しています。

## 主な機能

- クイズセットをCloudflare KVに保存し、トップページでカテゴリ（教科）ごとにグループ化された一覧から選んで開始（`/api/quizzes`, `/api/quiz/:id`）
- 名前の入力は不要。初回アクセス時にブラウザの`localStorage`へランダムなデバイスIDを自動生成して保存し、以後はそれをキーに進捗（正解数・不正解数・最終更新日時など）をKVに保存。同じブラウザなら自動的に続きから再開できる（進捗データは1週間操作がないとKVのTTLで自動的に消える）
- クイズセットごとの参加者を「参加者1」「参加者2」のように匿名化した正答率ランキングを見られる `/leaderboard.html`
- パスワード保護された管理画面 `/admin.html` からクイズセット（question/answerの配列＋カテゴリ）を追加・編集・削除
- JSONを直接貼り付け／`.json` ファイルをドラッグ&ドロップまたは選択して読み込み（この経路はKVを使わないローカル利用のみ。進捗は`localStorage`のみに保存）
- シャッフル出題
- 間違えた問題だけをもう一度出題する「復習モード」
- 回答モードを「自己採点」（答えを見て自分で正解/不正解を判定）と「入力して採点」（答えをテキスト入力すると完全一致で自動判定し、最終的な正解/不正解は自分で選べる）から選択可能

## 使い方

1. `index.html` をブラウザで開く
2. 次のいずれかの方法で問題を読み込む
   - 「クイズセットを選ぶ」一覧から、カテゴリの下に並んだクイズセットを選ぶ（KVに登録されている場合に表示。クリックすると名前入力なしですぐ開始／前回の続きがあれば自動で再開）
   - `.json` ファイルをドロップエリアにドラッグ&ドロップ、または「ファイルを選択」ボタンで選ぶ
   - テキストエリアにJSONを直接貼り付ける
3. 「クイズ開始」を押す（ファイル読み込み・クイズセット選択時は自動で開始します）
4. 回答モードが「自己採点」なら「答えを表示」→「正解した／不正解だった」、「入力して採点」なら答えを入力して「回答する」（完全一致で自動判定を表示）→「正解した／不正解だった」で最終判定して次の問題へ進む
5. 最後まで進むと結果画面が表示され、間違えた問題があれば「間違えた問題を復習する」から復習モードに入れる。クイズセットから開始した場合は「このクイズのランキングを見る」からそのクイズの結果一覧に飛べる

## JSONのフォーマット（貼り付け・ファイル読み込み・管理画面共通）

`question`（問題文）と `answer`（答え）を持つオブジェクトの配列です。両方とも文字列である必要があります。

```json
[
  { "question": "日本の首都は？", "answer": "東京" },
  { "question": "1年は何日？（うるう年を除く）", "answer": "365日" }
]
```

- 配列は1件以上必要です
- `question` / `answer` 以外のキーがあっても無視されます（エラーにはなりません）

## アーキテクチャ

```
index.html         トップページ（クイズ本体）
admin.html         クイズセットの追加・編集・削除（パスワード保護）
leaderboard.html    クイズセットごとのランキング
functions/
  _utils.js         KVキーの組み立て・認証チェックなど共通処理（URLルーティングの対象外）
  api/
    quizzes.js              GET  /api/quizzes            クイズセット一覧
    quiz/index.js            POST /api/quiz                クイズセット追加（管理者のみ。title/category/questions）
    quiz/[id].js              GET  /api/quiz/:id            クイズセット1件取得
                              PUT  /api/quiz/:id            クイズセット更新（管理者のみ）
                              DELETE /api/quiz/:id          クイズセット削除（管理者のみ）
    progress/[deviceId].js   GET  /api/progress/:deviceId?quizId=xxx  進捗取得
                              POST /api/progress/:deviceId  進捗保存（TTL 1週間）
    leaderboard/[quizId].js  GET  /api/leaderboard/:quizId  匿名化されたランキング取得
wrangler.toml       プロジェクト基本設定のみ（KVバインディング・環境変数はダッシュボード側で設定）
```

管理者判定は、リクエストヘッダー `X-Admin-Password` と環境変数 `ADMIN_PASSWORD` を比較するだけの簡易的なものです。`ADMIN_PASSWORD` が未設定の場合は常に401を返すため、設定を忘れると管理画面は動きません。HTTPS前提（Cloudflare Pagesは標準でHTTPS）で、パスワードを知っている人だけに管理画面のURLを共有する運用を想定しています。本格的な認可基盤ではないので、社外に公開する管理画面としては不十分な点に留意してください。

### KVに保存するデータ

| キー | 内容 | TTL |
| --- | --- | --- |
| `index:quizzes` | クイズセット一覧（`[{id, title, category, count, updatedAt}]`） | なし |
| `quiz:<id>` | クイズセット本体（`{id, title, category, questions, createdAt, updatedAt}`） | なし |
| `progress:<quizId>:<deviceId>` | デバイスごとの進捗（`{deviceId, quizId, idx, order, correct, wrong, wrongIndices, mode, answerMode, shuffleOn, completed, updatedAt}`） | 604800秒（1週間、保存のたびに更新） |
| `index:progress:<quizId>` | そのクイズセットに回答したことがあるデバイスIDの一覧（ランキング表示用。TTL切れで消えたデバイスIDは参照時に自動的に取り除かれる） | なし |

`category` を省略してクイズセットを作成・更新した場合は `未分類` として扱われます（既存のクイズセットも一覧・編集画面上は `未分類` として表示されます）。

進捗データにはCloudflare KVの `expirationTtl` を使っているため、1週間操作がないデバイスの進捗は自動的に消えます。ランキングはデバイスIDを直接表示せず、KVに記録されている順（＝そのクイズに最初に参加した順）に「参加者1」「参加者2」...と匿名化して表示します。

## ローカルでの動作確認

Cloudflare PagesのFunctions/KVはローカルでも `wrangler pages dev` でシミュレートできます（Cloudflareアカウント不要）。

```bash
npm install -g wrangler   # 未インストールの場合
echo "ADMIN_PASSWORD=好きなパスワード" > .dev.vars
wrangler pages dev . --kv QUIZ_KV --port 8788
```

- `.dev.vars` はローカル専用の秘密情報なので `.gitignore` 済みです。コミットしないでください
- `http://localhost:8788/` でトップページ、`/admin.html` で管理画面、`/leaderboard.html` でランキングが確認できます
- ローカルのKVデータは `.wrangler/` 以下に保存されます（こちらも `.gitignore` 済み）

## Cloudflare Pagesへのデプロイ

### 1. Gitリポジトリ連携（初回のみ）

GitHubリポジトリをpushした上で、Cloudflareダッシュボードの **Workers & Pages → Pages → Gitに接続** からこのリポジトリを選択してください（すでに連携済みの場合はこの手順は不要です）。ビルドコマンドは空欄、ビルド出力ディレクトリはルート（`/`）のままで問題ありません（静的ファイル + Functionsなのでビルド不要）。

### 2. KV Namespaceの作成とバインディング（手動設定が必要）

1. Cloudflareダッシュボードで **Workers & Pages → KV** を開き、**Create a namespace** から新しいNamespace（例: `json-quiz-kv`）を作成する
2. 対象のPagesプロジェクト（`json-quiz`）の **Settings → Functions → KV namespace bindings** を開く
3. **Add binding** で、変数名（Variable name）に `QUIZ_KV`、参照先に手順1で作ったNamespaceを選んで保存する
   - 変数名は必ず `QUIZ_KV` にしてください（コード側でこの名前を直接参照しています）
   - Production環境・Preview環境それぞれに設定できます。両方使う場合は両方に同じ（または別々の）Namespaceを設定してください

### 3. 環境変数 `ADMIN_PASSWORD` の設定（手動設定が必要）

1. 同じPagesプロジェクトの **Settings → Environment variables**（または **Variables and Secrets**）を開く
2. **Add variable** で 変数名 `ADMIN_PASSWORD` 、値に管理画面用パスワードを入力
3. **Encrypt**（Secretとして扱うオプション）が選べる場合はONにしておく
4. Production環境・Preview環境それぞれに設定する（設定を忘れた環境では管理画面が常に401になります）

### 4. 反映

KVバインディングと環境変数の追加・変更は、既存のデプロイには自動反映されないことがあります。設定後に一度 **Deployments** タブから最新デプロイを **Retry deployment** するか、何かpushして再デプロイしてください。

設定が完了すると、`https://<プロジェクト名>.pages.dev/` でクイズセット一覧・進捗保存・ランキング・管理画面がすべて動作します。

## GitHub Pagesで公開する場合の制限

GitHub PagesはFunctions/KVのようなサーバー機能を持たない静的ホスティングです。`index.html` 単体は置けますが、`/api/*` が存在しないため「クイズセットを選ぶ」一覧・ランキング・管理画面は動作しません（一覧取得が失敗するだけで、テキスト貼り付け／ファイル読み込みによるローカル利用は引き続き可能です）。クラウド機能を使う場合はCloudflare Pagesを利用してください。

## データの保存について

- クイズセットから開始した場合の進捗・成績は、ブラウザの`localStorage`に自動生成されたデバイスIDとクイズセットIDをキーとしてCloudflare KVに保存されます（`localStorage`にも同時に保存され、同じブラウザでのリロード時はそちらを優先して即座に再開できます）。KV側の進捗は1週間操作がないと自動的に消えます
- テキスト貼り付け・ファイル読み込みで開始した場合は、進捗は各ブラウザの `localStorage` にのみ保存されます（サーバーには送信されません）
- デバイスIDは端末・ブラウザごとに別々に発行されるため、同じ人でも別のブラウザやシークレットモード、別の端末からは別デバイス（＝新規参加者）として扱われます
