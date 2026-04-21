// Public API
export { verifySignature, type VerifySignatureParams } from './lib/verify-signature';

export {
    slackEventSchema,
    type SlackEvent,
    type UrlVerification,
    type EventCallback,
    type MessageEvent,
    type ReactionAddedEvent,
} from './lib/slack-event-schema';

export { oauthCallbackParamsSchema, type OAuthCallbackParams } from './lib/slack-oauth-schema';

export { buildAuthorizationUrl, exchangeCodeForToken, fetchUserIdentity } from './api/slack-oauth';

export {
    getSession,
    getServerSession,
    getAuthenticatedSession,
    isAuthenticated,
    sessionOptions,
    defaultSession,
    type SessionData,
    type ReadonlySession,
    type AuthenticatedSession,
} from './model/session';
