# クイズ

`index.html` を開くだけで動くクイズアプリです。フロントエンドは外部ライブラリなしの素のHTML/JS/CSSで、Cloudflare Pages Functions + D1を使ったクラウド機能（クイズセットの共有・進捗保存）を追加しています。

## 主な機能

- クイズセットをCloudflare D1データベースに保存し、トップページでカテゴリ（教科）ごとにグループ化された一覧から選んで開始（`/api/quizzes`, `/api/quiz/:id`）
- クイズセットごとの最高達成度（正解数・満点達成バッジ）および全クイズセットを合わせた「全体の達成度」プログレスカードを自動記録・表示。最高正解数はD1側（`progress.best_correct`）で保持されるため、後から低いスコアで再挑戦しても過去のベスト記録は上書きされません
- 「続きから再開する」ボタンを押した場合のみ途中から再開し、クイズセット一覧からの開始は常にフレッシュな「最初から」スタート
- 名前の入力は不要。初回アクセス時にブラウザの`localStorage`へランダムなデバイスIDを自動生成して保存し、以後はそれをキーに進捗をD1に保存
- パスワード保護された管理画面 `/admin.html` からクイズセット（question/answerの配列＋カテゴリ）を追加・編集・削除
- 管理画面にて各ユーザーの接続IP・端末識別ID・クイズごとの解答進捗/スコア/最終アクセス日時を一覧確認可能（`GET /api/admin/progress`）
- 管理画面の「参加者管理」で接続IPごとにニックネームを設定可能。設定すると解答ログにニックネームが併記される。「詳細を見る」を開くと、その回答者の接続時の位置情報（国・地域・都市）と、ボタン押下時にオンデマンドで取得する逆引きDNS（rDNS）結果を確認できる（すべて管理画面専用。一般ユーザー向けページには一切表示しない）
- シャッフル出題、回答形式切り替え（「答えを見る」/「文字入力」）を大型トグルボタンで設定。設定はブラウザに保存され次回アクセス時も引き継がれる
- 「文字入力」モードでは、完全一致の自動判定を色付きバッジ（緑=一致／赤=不一致）で分かりやすく表示。一致した場合は「正解した」ボタンを押さずに自動的に正解として確定し、不一致の場合は「不正解」を既定の結果として即座に確定した上で、誤判定を訂正したいときだけ小さな「正解として記録する」ボタンで例外的に正解へ上書きできる
- デプロイのたびに `APP_VERSION` を更新すると、既存ユーザーのブラウザで開いたときに1回だけ自動的にページを再読み込みし、古いキャッシュのまま使い続けてしまうのを防ぐ
- 結果画面に解答した全問題の一覧（問題文・正答・自分の解答・正解/不正解を色分け表示）を表示
- クイズの実行中いつでも「問題一覧を見る」から全問題（question/answer）を確認可能。答えはタップするまで非表示（ネタバレ防止）
- スマートフォン表示の全画面レスポンシブ最適化（適切なタップエリア、フォームズーム防止、iPhoneのDynamic Island/ノッチ対応など）
- 間違えた問題だけをもう一度出題する「復習モード」
- サーバーへの進捗保存は「3問解答するごと」「タブを閉じる/切り替えるなどページを離れる瞬間（`navigator.sendBeacon`）」「クイズ終了時」のハイブリッド方式。毎問ごとの書き込みを避けつつ、途中離脱時も直近の状態を取りこぼさない
- トップページ右上の🔔ボタンから「お知らせ」を確認可能（`GET /api/announcement`）。管理画面の「お知らせ編集」セクションから内容を更新でき（`PUT /api/announcement`、管理者のみ）、内容が更新された（かつ一度も開いていない）場合のみ🔔に赤い未読ドットが表示される。一度でも開けば既読になり、次に内容が更新されるまでドットは出ない。管理画面の「大事なお知らせ」トグルをONにすると、まだ見ていないデバイスに限りトップページを開いた瞬間に自動でお知らせモーダルが表示される（一度見れば赤点と同様に既読扱いになり、次に内容が更新されるまで再表示されない）。「赤点をつける」トグルで、その更新が🔔の未読ドット表示対象かどうかを個別に制御できる（両トグルは独立）

## 使い方

1. `index.html` をブラウザで開く
2. 出題設定の選択
   - 大型トグルボタンで「シャッフル ON/OFF」や「回答形式（答えを見る / 文字入力）」を設定
3. 問題の開始
   - 「クイズセットを選ぶ」一覧からカテゴリの下に並んだクイズセットを選ぶ（常に最初から開始。各セットの達成度バッジ・全体達成度カードが表示されます）
   - 前回の途中の続きから再開したい場合は、画面上部の「続きから再開する」ボタンを押す
4. 回答モードが「自己採点」なら「答えを表示」→「正解した／不正解だった」、「入力して採点」なら答えを入力して「回答する」で完全一致の自動判定（一致=正解／不一致=不正解）が確定し、そのまま次の問題へ進む。不一致の判定を訂正したい場合のみ「正解として記録する」を押す
5. 最後まで進むと結果画面が表示され、解答した全問題の一覧（正解/不正解を色分け）を確認できる。間違えた問題があれば「間違えた問題を復習する」から復習モードに入れる

### キーボードだけでの操作

マウス・タップなしでも一連の操作をキーボードだけで完結できます。

| 状態 | キー | 動作 |
| --- | --- | --- |
| 「文字入力」モードで回答を入力中 | `Enter` | 回答を送信（`Space`はそのまま文字として入力されます。日本語入力中のIME変換確定のEnterは無視されます） |
| 送信後、完全一致（自動判定） | `Enter` | 次の問題へ（正解として確定済み） |
| 送信後、不一致（自動判定） | `Enter` | 「不正解」のまま次の問題へ（例外的に正解へ上書きしたい場合のみ「正解として記録する」ボタンをクリック） |
| 「自己採点」モードでまだ答えを表示していない | `Enter` | 「答えを表示」を実行 |
| 答えを表示した後（自動判定なし） | `Enter` または `J` | 正解として確定して次の問題へ |
| 同上 | `F` または `Space` | 不正解として確定して次の問題へ |

回答入力中以外は `Space` によるページスクロールを止めているので、キーボードだけでテンポよく進められます。

## JSONのフォーマット（管理画面での登録用）

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
admin.html         クイズセットの追加・編集・削除、ユーザー解答/アクセスログ確認（パスワード保護）
schema.sql          D1データベースのテーブル定義
migrate-kv-to-d1.js  旧KV実装からD1へのデータ移行スクリプト（移行済みなら通常は再実行不要）
functions/
  _utils.js         認証チェック・共通レスポンス生成・進捗クリーンアップなど共通処理（URLルーティングの対象外）
  api/
    quizzes.js              GET  /api/quizzes            クイズセット一覧（?deviceId=xxx を付けるとそのデバイスのbestCorrect/attemptedも返す）
    quiz/index.js            POST /api/quiz                クイズセット追加（管理者のみ。title/category/questions）
    quiz/[id].js              GET  /api/quiz/:id            クイズセット1件取得
                              PUT  /api/quiz/:id            クイズセット更新（管理者のみ）
                              DELETE /api/quiz/:id          クイズセット削除（管理者のみ。紐づく進捗も削除）
    progress/[deviceId].js   GET  /api/progress/:deviceId  進捗取得
                              POST /api/progress/:deviceId  進捗・接続IP・位置情報保存（1ヶ月相当のTTLを疑似実装）
    nicknames.js              GET  /api/nicknames           管理者専用: 記録済みIP一覧＋ニックネーム＋最新の位置情報取得
                              POST /api/nicknames           管理者専用: IPにニックネームを設定（空文字で解除）
    admin/auth.js            POST /api/admin/auth         管理者パスワード事前検証
    admin/progress.js        GET  /api/admin/progress     管理者専用: ユーザー解答・IPアクセスログ一覧取得
                              DELETE /api/admin/progress  管理者専用: 全アクセス・解答ログを一括全削除
    admin/rdns.js             GET  /api/admin/rdns?ip=xxx  管理者専用: 外部DNS-over-HTTPS APIでIPアドレスを逆引き（オンデマンド）
    announcement.js           GET  /api/announcement       トップページの🔔から見る「お知らせ」取得（認証不要）
                              PUT  /api/announcement       お知らせ内容を更新（管理者のみ）
```

このプロジェクトはKVを使用せず、Cloudflare D1（SQLiteベースのマネージドDB）にデータを保存します。D1バインディング（`DB`）は`wrangler.toml`に定義していますが、Gitに接続した本番のPagesプロジェクトではCloudflareダッシュボードのプロジェクト設定画面（Settings → Functions → D1 database bindings）側の設定が優先されます。環境変数（`ADMIN_PASSWORD`）もダッシュボード（Settings → Environment variables）で設定します。

管理者判定は、リクエストヘッダー `X-Admin-Password` と環境変数 `ADMIN_PASSWORD` を比較するだけの簡易的なものです。`ADMIN_PASSWORD` が未設定の場合は常に401を返すため、設定を忘れると管理画面は動きません。HTTPS前提（Cloudflare Pagesは標準でHTTPS）で、パスワードを知っている人だけに管理画面のURLを共有する運用を想定しています。本格的な認可基盤ではないので、社外に公開する管理画面としては不十分な点に留意してください。

### D1のテーブル構成（`schema.sql`）

| テーブル | 内容 |
| --- | --- |
| `quizzes` | クイズセット本体。`id`（主キー）, `title`, `category`, `questions`（JSON文字列）, `created_at`, `updated_at` |
| `progress` | デバイスごとの進捗。`(quiz_id, device_id)` の複合主キー。`ip`, `country`, `region`, `city`, `idx`, `order_json`, `correct`, `best_correct`, `wrong`, `wrong_indices_json`, `mode`, `answer_mode`, `shuffle_on`, `completed`, `updated_at` |
| `ip_nicknames` | IPアドレスに管理者が付けたニックネーム。`ip`（主キー）, `nickname`, `updated_at` |
| `announcement` | トップページの🔔から見る「お知らせ」。常に1行のみ（`id`は1固定）。`content`, `important`（開いた瞬間に自動表示するか）, `show_dot`（未読ドットを出すか）, `updated_at` |

- `category` を省略してクイズセットを作成・更新した場合は `未分類` として扱われます
- クイズセット一覧の「問題数」は保存された値ではなく、取得時に `json_array_length(questions)` で都度計算しています
- クイズセットを削除すると、そのクイズに紐づく `progress` 行も併せて削除されます（DBのFOREIGN KEY制約に頼らず、削除処理内で明示的に行っています）
- KVの `expirationTtl` に相当する仕組みがD1には無いため、`POST /api/progress/:deviceId` が呼ばれるたびに「1ヶ月（30日）以上 `updated_at` が更新されていない `progress` 行」を削除する簡易的なクリーンアップを実行しています（`functions/_utils.js` の `cleanupOldProgress`）。アクセスが全く無いクイズの古い進捗はこの方式では削除されませんが、実用上は許容範囲としています
- `country` / `region` / `city` はCloudflareエッジが自動的に付与する `request.cf` から取得したもので、外部APIへの問い合わせは発生しません（ローカル開発の `wrangler pages dev` でも疑似的な値が入ります）。これらの列と `ip_nicknames` テーブルの内容は管理者専用API（`/api/nicknames`, `/api/admin/*`）でのみ取得可能で、`/api/progress/:deviceId` や `/api/quiz*` など一般ユーザー向けのレスポンスには含まれません
- `correct` は「直近の解答結果」、`best_correct` は「これまでの最高正解数」。`POST /api/progress/:deviceId` を呼ぶたびに `best_correct = MAX(既存のbest_correct, 今回のcorrect)` で更新されるため、後から低いスコアで再挑戦しても下がりません
- `schema.sql` は `CREATE TABLE IF NOT EXISTS` ベースなので、新規にテーブル列を追加した場合、**既存の本番D1には自動反映されません**。列追加のたびに `wrangler d1 execute <DB名> --remote --command="ALTER TABLE ... ADD COLUMN ..."` を手動で実行してから新しいコードをデプロイしてください（実行を忘れると該当列を使うAPIが失敗します）

## ローカルでの動作確認

Cloudflare PagesのFunctions/D1はローカルでも `wrangler pages dev` でシミュレートできます（Cloudflareアカウント不要）。`wrangler.toml` にD1バインディングを定義済みなので、初回だけローカルD1にスキーマを流し込めばそのまま動きます。

```bash
npm install -g wrangler   # 未インストールの場合
echo "ADMIN_PASSWORD=好きなパスワード" > .dev.vars
wrangler d1 execute DB --local --file=schema.sql
wrangler pages dev . --port 8788
```

- `wrangler.toml` に `[[d1_databases]]` でバインディング名 `DB` を定義済みなので、ローカル実行時は追加の `--d1` オプションは不要です
- `.dev.vars` はローカル専用の秘密情報なので `.gitignore` 済みです。コミットしないでください
- `http://localhost:8788/` でトップページ、`/admin.html` で管理画面が確認できます
- ローカルのD1データは `.wrangler/` 以下に保存されます（こちらも `.gitignore` 済み）

## Cloudflare Pagesへのデプロイ

### 1. Gitリポジトリ連携（初回のみ）

GitHubリポジトリをpushした上で、Cloudflareダッシュボードの **Workers & Pages → Pages → Gitに接続** からこのリポジトリを選択してください（すでに連携済みの場合はこの手順は不要です）。ビルドコマンドは空欄、ビルド出力ディレクトリはルート（`/`）のままで問題ありません（静的ファイル + Functionsなのでビルド不要）。

### 2. D1データベースの作成とバインディング（手動設定が必要）

1. Cloudflareダッシュボードで **Workers & Pages → D1 SQL Database** を開き、**Create database** から新しいデータベース（例: `json-quiz-db`）を作成する
2. ローカルから `wrangler d1 execute json-quiz-db --remote --file=schema.sql` を実行し、`schema.sql` のテーブル定義を反映する
3. 対象のPagesプロジェクト（`json-quiz`）の **Settings → Functions → D1 database bindings** を開く
4. **Add binding** で、変数名（Variable name）に `DB`、参照先に手順1で作ったデータベースを選んで保存する
   - 変数名は必ず `DB` にしてください（コード側でこの名前を直接参照しています）
   - Production環境・Preview環境それぞれに設定できます。両方使う場合は両方に同じ（または別々の）データベースを設定してください

### 3. 環境変数 `ADMIN_PASSWORD` の設定（手動設定が必要）

1. 同じPagesプロジェクトの **Settings → Environment variables**（または **Variables and Secrets**）を開く
2. **Add variable** で 変数名 `ADMIN_PASSWORD` 、値に管理画面用パスワードを入力
3. **Encrypt**（Secretとして扱うオプション）が選べる場合はONにしておく
4. Production環境・Preview環境それぞれに設定する（設定を忘れた環境では管理画面が常に401になります）

### 4. 反映

D1バインディングと環境変数の追加・変更は、既存のデプロイには自動反映されないことがあります。設定後に一度 **Deployments** タブから最新デプロイを **Retry deployment** するか、何かpushして再デプロイしてください。

設定が完了すると、`https://<プロジェクト名>.pages.dev/` でクイズセット一覧・進捗保存・管理画面がすべて動作します。

### デプロイのたびに `APP_VERSION` を更新する

`index.html` の `<script>` 冒頭にある `APP_VERSION`（例: `"2026-07-25-1"`）は、ページの動作に影響するコードを変更してデプロイするたびに新しい値へ変更してください。ブラウザに保存されている前回のバージョンと異なる場合、そのユーザーのページは自動的に1回だけ `location.reload()` されます。これにより、古いキャッシュのままのユーザーが新しいコードを確実に読み込めるようになります。初回訪問者（保存済みバージョンが無い場合）はリロードされず、そのままバージョンだけ記録されます。

### 既存KVデータの移行について

以前このプロジェクトはCloudflare KVでデータを保存していました。KVからD1への移行は `migrate-kv-to-d1.js` で実施済みです（再実行する場合は、移行元のKV Namespace IDと移行先のD1データベース名を環境変数 `QUIZ_KV_NAMESPACE_ID` / `D1_DATABASE_NAME` で指定し、`node migrate-kv-to-d1.js` を実行してください。移行前後の件数が一致するかのログが出力されます）。

## GitHub Pagesで公開する場合の制限

GitHub PagesはFunctions/D1のようなサーバー機能を持たない静的ホスティングです。`index.html` 単体は置けますが、`/api/*` が存在しないため「クイズセットを選ぶ」一覧・管理画面は動作しません。クラウド機能を使う場合はCloudflare Pagesを利用してください。

## データの保存について

- クイズセットの進捗・成績は、ブラウザの`localStorage`に自動生成されたデバイスIDとクイズセットIDをキーとしてCloudflare D1に保存されます（`localStorage`にも同時に保存され、同じブラウザでのリロード時はそちらを優先して即座に再開できます）。D1側の進捗は1ヶ月操作がないと自動的に削除されます（`POST /api/progress/:deviceId` 呼び出し時のクリーンアップ処理による）
- デバイスIDは端末・ブラウザごとに別々に発行されるため、同じ人でも別のブラウザやシークレットモード、別の端末からは別デバイス（＝新規参加者）として扱われます
- 接続IP・位置情報（国/地域/都市）・ニックネーム・逆引きDNS結果は、パスワード保護された管理画面（`/admin.html`）でのみ確認できます。`index.html` などの一般ユーザー向けページやAPIレスポンスには含まれません
