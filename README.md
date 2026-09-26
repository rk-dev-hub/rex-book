# RexBook

サロン・パーソナルジムなどの来店予約制ビジネス向けの、**顧客が自分で予約する Web アプリ**です。
店舗側の顧客・予約管理システム [RexCarte](https://github.com/rk-dev-hub/rex-carte) と同じデータ・同じ予約ルールを使い、
顧客はスマートフォンから空き枠を選んで予約・キャンセルができます。**予約はチケット（単発 = 1 回、回数券 = 複数回）を 1 回分使って行い**、チケットは店頭で購入してスタッフが付与します（将来は決済でオンライン購入できるようにする予定です）。

## 主な機能

- **店舗に顧客として登録済みの人だけが使える。ログインしないと何も見られない**（店舗・チケット・空き枠も含む）。ログインは、店舗の顧客レコードに登録されたメールアドレス宛に届く 6 桁のコード（パスワードなし）。未登録のメールアドレスにはコードが送られない
- 顧客として登録されている店舗の予約情報を表示。複数店舗に登録されている場合は、セレクターで切り替える（予約・保有チケット・予約状況は店舗ごと）
- **予約トップに、お名前と「予約する」ボタン・今後のご予約（横スクロール）・予約カレンダー・マイチケット**を表示。予約ボタンからは必ず「チケットを選択」から始まる。チケットが無い顧客には、店舗での購入を案内する。マイページ・プロフィール編集は持たない（お名前・電話番号は店舗が管理し、顧客は変更できない）
- 担当（指名 / 指名なし）と日時の選択。日付は 2 週間分のタブと、**月カレンダー（予約できる先の期間、既定 60 日まで）**
- 予約の確定・確認メール・予約トップでの確認・キャンセル（期限内）。保有チケットの「予約に使える回数」を表示し、予約時点では残回数を減らさない
- ヘッダーとタブのタイトルに、導入先の**事業者名・アイコン**を表示し、顧客に送るメール（ログインコード・予約確定・キャンセル）の送信者・文面も変えられる。**設定は RexCarte の管理画面「事業者設定」で行う**（RexBook には設定画面がない）
- 予約の可否は **RexCarte の API が判断する**。このアプリは画面の表示と中継だけを行い、営業時間・シフト・空きを独自に計算しない。予約できない理由（休日・埋まり・時間外）は顧客に区別して見せない

## セットアップ

Node.js 22 以上（ネイティブ開発のみ）と Docker / Docker Compose が必要です。このアプリは RexCarte の API・DB を使うため、**先に RexCarte を起動**します。

[RexCarte](https://github.com/rk-dev-hub/rex-carte) と本リポジトリは、**同じ階層のフォルダ**に clone してください（例: `rex-carte/` と `rex-book/` を並べる）。

```bash
git clone https://github.com/rk-dev-hub/rex-carte.git
git clone https://github.com/rk-dev-hub/rex-book.git
```

### お試し起動（Docker Compose のみ）

```bash
# 1. RexCarte（API・DB・Mailpit）を起動し、デモデータを投入する
cd ../rex-carte
docker compose --profile app up -d
docker compose exec backend python -m scripts.seed_demo    # 既存データはすべて削除される

# 2. このリポジトリを起動する
cd ../rex-book
docker compose --profile app up
```

| | URL |
| --- | --- |
| 顧客向け予約アプリ（このアプリ） | http://localhost:3100 |
| 送信メールの確認（Mailpit） | http://localhost:8025 |
| RexCarte 管理画面 | http://127.0.0.1:5173（admin@example.com / admin12345） |

> 他のプロジェクトが `5173` を IPv6 で使っていると、`localhost:5173` がそちらに繋がります。その場合は `127.0.0.1` で開いてください。

**デモの顧客**（`seed_demo` が、店舗の顧客レコードとして登録します。ログインはメールに届くコードで行い、コードは Mailpit で確認します。**登録のないメールアドレスにはコードは届きません**）

| メールアドレス | 内容 |
| --- | --- |
| `customer@example.com` | 渋谷店の顧客。**ダイエット1ヶ月コース（回数券）とトレーニング＋ストレッチ1回（単発）**を持つ（チケットを選び直せる） |
| `member@example.com` | 渋谷店の顧客。**パーソナルトレーニング1回（単発）**を 2 枚持つ |
| `nocourse@example.com` / `noticket@example.com` | 渋谷店の顧客。チケットなし（店舗での購入の案内が出る。E2E は `nocourse` にチケットを付与して予約を試す） |
| `multi@example.com` | **渋谷店（パーソナルトレーニング1回）と新宿店（パートナーストレッチ1回）**の 2 店舗に登録（店舗の切り替えを試せる） |
| `nophone@example.com` | 渋谷店の顧客。電話番号が未登録（予約できず、店舗への問い合わせを案内する。お客様自身では登録できない） |

停止するには `Ctrl+C`、コンテナごと削除するには `docker compose --profile app down` を実行してください。

### ネイティブ開発

```bash
cp .env.example .env     # REXCARTE_API_URL などを確認
npm install
npm run dev              # http://localhost:3100
```

## テスト

```bash
npm run typecheck    # 型チェック（next typegen + tsc）
npm run lint         # ESLint
npm run test         # Vitest（単体テスト。予約ステップの URL 状態・カレンダー・遷移先の検証・Origin 検証・日時など純粋関数）
npm run build        # 本番ビルド
```

### E2E テスト（Playwright）

スマートフォン端末（Pixel 7）で、実際に RexCarte・Mailpit と繋いで確認します。

```bash
# 前提: RexCarte を起動して seed_demo を投入済みで、このアプリが http://localhost:3100 で動いている（上の手順）
npx playwright install chromium     # 初回のみ
npm run test:e2e
```

| テスト | 確認すること |
| --- | --- |
| `booking-flow` | チケットをまだ持たない顧客が、店頭購入のチケット（単発）をスタッフに付与してもらい、画面からログイン（コードは Mailpit から取得）→ 予約トップ（お名前・予約ボタン）→ チケットを選択 → 日時を選択（担当は既定で指名なし）→ 予約内容の確認 → 確認ダイアログで確定 → 予約トップの今後のご予約・予約カレンダーに表示 → キャンセルまで、画面操作だけで通せる。確認メール・キャンセルメールが届く |
| `default-course` | 予約ボタンからはチケットの選択から始まる（自動では選ばれない）。マイチケットは「5/5（有効期限 …）」の形式。「チケット変更」で選び直せる。回数券で予約すると使える回数が減り、キャンセルすると戻る |
| `calendar` | 2 週間より先の日付を、カレンダーで選んで確認画面まで進める。移動できるのは今日の月から予約できる最後の日の月まで。日付を切り替えてもスクロール位置が戻らない |
| `multi-store` | 2 店舗に登録された顧客が、ホームと予約画面で店舗を切り替えられる（店舗ごとにチケット・予約が違う）。予約トップは選んだ店舗の分だけ表示する |
| `conflict` | 確認画面を開いている間に店舗が同じ枠へ電話予約を入れると、確定は共通の文言で断られ（理由・スタッフ名を出さない）、日時を選び直すと埋まった時刻が消えている。定休日は理由を出さず「予約できる時刻がありません」とだけ表示する |
| `branding` | RexCarte の事業者設定（事業者名・アイコン・送信者名・返信先・ログインコードの文面）が、ログイン前のヘッダー・タブのタイトルと、届くログインコードのメールに反映される |
| `tickets` | チケットを持たない顧客には購入の案内が出て予約できない。電話番号が店舗に未登録の顧客は、予約できず、プロフィールの画面・API もない |
| `security` | 未ログインはどの画面もログインへ誘導され、店舗の情報は出ない。**顧客として登録されていないメールアドレスにはコードが届かず、ログインもできない**。状態を変える API は Origin なし・別オリジン・JSON 以外を拒否する（CSRF 対策）。顧客トークンは httpOnly の Cookie にだけあり、JavaScript から読めない。使えない店舗・他人の予約は「ページが見つかりません」 |

注意:

- テストが作った予約は、失敗しても店舗側の API で取り消して後片付けします（枠やチケットの回数を次の実行に残しません）。
- RexCarte は**ログインコードの送信**と**店舗・空き枠の API**を回数制限しています（製品の仕様）。E2E は保存済みのログイン状態（`tests/e2e/.auth/`）を再利用して回数を抑えていますが、**続けて何度も実行する場合は少し間隔を空けてください**。
- 接続先は環境変数 `APP_URL`・`REXCARTE_API_URL`・`MAILPIT_URL`、店舗側の管理者は `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` で変更できます（既定値はローカルの Docker 用）。

## 本番環境の設定

- 環境変数（`.env.example` を参照）: `REXCARTE_API_URL`（RexCarte の API）、`APP_URL`（このアプリの URL。Origin の検証に使う）、`SESSION_COOKIE_SECURE=true`（HTTPS で配信する場合は必ず true）
- RexCarte 側で、このアプリのサーバーを信頼できる送信元として設定する（利用者ごとの回数制限を正しく効かせるため）
- RexCarte 側のメール送信（`MAIL_BACKEND=resend`）と `REXBOOK_APP_URL` の設定（[RexCarte の README](https://github.com/rk-dev-hub/rex-carte#本番環境の設定)）

## ディレクトリ構成

```
src/app/         画面（Server Components）と BFF の Route Handler（src/app/api/）
src/components/  共通 UI・フォーム
src/lib/         RexCarte クライアント・セッション・入力検証・予約ステップの URL 状態など
tests/unit/      Vitest（純粋関数）
tests/e2e/       Playwright（helpers/ に Mailpit・RexCarte 操作の共通処理）
docs/            要件・設計
```

## ドキュメント

| ドキュメント | 内容 |
| --- | --- |
| [docs/01-requirements.md](docs/01-requirements.md) | 要件定義（機能・非機能） |
| [docs/02-architecture.md](docs/02-architecture.md) | 構成・技術選定・認証方式・ディレクトリ構成 |
| [docs/04-availability-spec.md](docs/04-availability-spec.md) | 空き枠算出と同時予約制御の仕様（実装の中核） |
| [docs/05-screens.md](docs/05-screens.md) | 画面一覧・画面遷移 |
| [docs/07-testing.md](docs/07-testing.md) | テスト方針・デモデータ |

## 技術スタック

- 顧客向けフロント: Next.js 16（App Router）/ React 19 / TypeScript / Tailwind CSS v4 / Zod / Vitest / Playwright
- API・DB: RexCarte のバックエンド（FastAPI / SQLAlchemy / PostgreSQL）に顧客向け API を追加
- ローカル実行: Docker Compose だけで起動できる

## 著作権

Copyright (c) 2026 rk-dev-hub. All rights reserved.

動作確認・評価を目的とした、ローカル環境での閲覧・起動・実行は自由です。複製・改変・再配布・商用利用は許可していません。
