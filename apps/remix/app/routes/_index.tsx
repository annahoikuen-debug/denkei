import { extractCookieFromHeaders } from '@documenso/auth/server/lib/utils/cookies';
import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import { PREFERRED_TEAM_URL_COOKIE } from '@documenso/lib/constants/cookies';
import { getTeams } from '@documenso/lib/server-only/team/get-teams';
import { formatDocumentsPath } from '@documenso/lib/utils/teams';
import { ZTeamUrlSchema } from '@documenso/trpc/server/team-router/schema';
import { redirect } from 'react-router';

import { LandingPage } from '~/components/general/landing-page';

import type { Route } from './+types/_index';

export function meta() {
  return [
    { title: 'デンケイ (Denkei) | 中小企業特化・月額2,980円の電子契約サービス' },
    {
      name: 'description',
      content:
        'タイムスタンプ不要で電帳法に完全適合。月額2,980円で100件まで定額。国税庁準拠の事務処理規程キット同梱、スマホ親指10秒で本物の認印（電子印影）を押印。日本のビジネスに一番割り切れる電子契約サービス。',
    },
    { property: 'og:title', content: 'デンケイ (Denkei) - 中小企業特化・月額2,980円の電子契約' },
    {
      property: 'og:description',
      content: 'タイムスタンプ不要・月額2,980円で100件定額。国税庁公認の事務処理規程同梱、スマホ10秒で認印押印。',
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalSession(request);

  // Embed sessions are rejected by the authenticated tree, so treat them as signed out here.
  if (session.isAuthenticated && !session.session.isEmbed) {
    const teamUrlCookie = extractCookieFromHeaders(PREFERRED_TEAM_URL_COOKIE, request.headers);

    const preferredTeamUrl =
      teamUrlCookie && ZTeamUrlSchema.safeParse(teamUrlCookie).success ? teamUrlCookie : undefined;

    const teams = await getTeams({ userId: session.user.id });

    let currentTeam = teams.find((team) => team.url === preferredTeamUrl);

    if (!currentTeam && teams.length === 1) {
      currentTeam = teams[0];
    }

    if (!currentTeam) {
      throw redirect('/inbox');
    }

    throw redirect(formatDocumentsPath(currentTeam.url));
  }

  return { isAuthenticated: false };
}

export default function Index() {
  return <LandingPage />;
}
