import { BonsaiOverlayPanel } from "./BonsaiOverlayPanel";
import { BonsaiStatusPanel } from "./BonsaiStatusPanel";

import type { Bonsai } from "@/entities/bonsai";
import { BonsaiScene } from "@/entities/bonsai";
import { ErrorBoundary, ErrorFallback, EmptyState } from "@/shared/ui";

type BonsaiViewerUser = { display_name: string; avatar_url: string | null };

type BonsaiViewerProps = {
  bonsai: Bonsai;
  user: BonsaiViewerUser;
  nextStageThresholds: {
    min_messages: number;
    min_reactions: number;
    min_thanks: number;
  } | null;
  className?: string;
};

export function BonsaiViewer({ bonsai, user, nextStageThresholds, className }: BonsaiViewerProps) {
  const isBrandNew =
    bonsai.growth_stage === "seed" &&
    bonsai.total_messages === 0 &&
    bonsai.total_reactions === 0 &&
    bonsai.total_thanks === 0;

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <div className="absolute inset-0">
        <ErrorBoundary
          fallbackRender={({ reset }) => (
            <ErrorFallback
              title="3D描画エラー"
              message="WebGLの描画に失敗しました。ブラウザを再読み込みしてください。"
              onRetry={reset}
            />
          )}
        >
          <BonsaiScene visualState={bonsai.visual_state} className="h-full w-full" />
        </ErrorBoundary>
      </div>
      <BonsaiOverlayPanel>
        {isBrandNew ? (
          <EmptyState
            icon={<span>🌱</span>}
            title="ようこそ、たま森へ！"
            description="Slackで活動すると、あなたの盆栽が育ちます。メッセージを送ったり、リアクションをつけてみましょう！"
          />
        ) : (
          <BonsaiStatusPanel
            stage={bonsai.growth_stage}
            totalMessages={bonsai.total_messages}
            totalReactions={bonsai.total_reactions}
            totalThanks={bonsai.total_thanks}
            user={user}
            nextStageThresholds={nextStageThresholds}
          />
        )}
      </BonsaiOverlayPanel>
    </div>
  );
}
