type LandingContentProps = {
  error?: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "認証に失敗しました。もう一度お試しください。",
  session_expired: "セッションの有効期限が切れました。もう一度ログインしてください。",
};

export function LandingContent({ error }: LandingContentProps) {
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <h1 className="font-brush text-6xl text-main">たま森</h1>
      <p className="text-lg text-sub">Slack連携の盆栽育成Webアプリ</p>

      <a
        href="/api/auth/slack"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-main px-6 py-3 text-lg font-medium text-white transition-opacity hover:opacity-90"
      >
        Sign in with Slack
      </a>

      {errorMessage && (
        <p role="alert" className="text-sm text-accent">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
