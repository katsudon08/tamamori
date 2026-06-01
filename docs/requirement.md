# 要件定義

## 背景・目的

リモートワークでは、雑談やちょっとした相談が起きにくく、チームメンバーの作業状況や気付きが見えにくくなりがちである。

その問題を補う取り組みとして、個人の作業内容や気付き、ちょっとした雑談を社内のチャットツールにリアルタイムで投稿し、チーム内で共有する**分報**という文化がある。

ただ、忙しいと投稿を後回しにしてしまったり、何を書くか考えているうちにタイミングを逃してしまったりすることがある。結果として、分報は有用だと分かっていても、継続するには心理的なハードルが残る。

そこで、自分のチャットツールでの発言を元に**盆栽**を育て、それをチームメンバー間で共有することで、日々の発信をゆるやかに可視化する。

盆栽には、**ゆっくり育てること**や**日々の積み重ねが見える**ことといったメタファーがある。

発言量を競わせるのではなく、日々の小さな発信が盆栽の成長として見えることで、分報を書くきっかけを生み、チーム内の状況共有や雑談・相談の心理的ハードルを下げることを目的とする。

## 対象ユーザー

分報や日々の状況共有を行っている、または促進したいチームのメンバー

初期対応は**Slack**を利用しているチームを対象とし、将来的に対応チャットツールを拡張する。

## ワークフロー

```mermaid
%%{init: {"flowchart": {"curve": "stepAfter"}}}%%
flowchart TD
    subgraph Team["チームメンバー"]
        direction TB
        UserPost["チャットツールに発言する"]
    end

    subgraph Chat["チャットツール（外部）"]
        direction TB
        ChatEvent["発言イベントを生成する"]
        WebhookPush["Webhookでイベントを送信する"]
    end

    subgraph Backend["バックエンド"]
        direction TB
        Receive["イベントを受信する"]
        Validate{"イベント検証に成功？"}
        Reject["イベントを破棄する"]
        Finish["処理を終了する"]
        Record["発言を活動として記録する"]
        Growth["盆栽の成長状態を計算する"]
    end

    subgraph Store["データストア"]
        direction TB
        ActivityDb[("活動ログDB")]
        BonsaiDb[("盆栽状態DB")]
    end

    subgraph Frontend["フロントエンド"]
        direction TB
        FetchState["盆栽状態を購読する"]
        Render["画面上の盆栽に反映する"]
    end

    UserPost --> ChatEvent
    ChatEvent --> WebhookPush
    WebhookPush -->|Webhook push| Receive
    Receive --> Validate
    Validate -->|失敗| Reject
    Reject --> Finish
    Validate -->|成功| Record
    Record --> Growth
    Record -->|保存| ActivityDb
    Growth -->|更新| BonsaiDb
    BonsaiDb -.->|WebSocket Subscription| FetchState
    FetchState --> Render
```
