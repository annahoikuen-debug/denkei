import { useCurrentOrganisation } from '@documenso/lib/client-only/providers/organisation';
import { isFeatureEnabledForPlan, PLANS, resolvePlanIdFromOrganisation } from '@documenso/lib/constants/plans';
import { trpc } from '@documenso/trpc/react';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Card, CardContent } from '@documenso/ui/primitives/card';
import { SpinnerBox } from '@documenso/ui/primitives/spinner';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { Trans, useLingui } from '@lingui/react/macro';
import { ArrowRightIcon, CheckCircle2Icon, LockIcon, ShieldCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { PlanLimitUpgradeDialog } from '~/components/dialogs/plan-limit-upgrade-dialog';
import { EmailPreferencesForm, type TEmailPreferencesFormSchema } from '~/components/forms/email-preferences-form';
import { SettingsHeader } from '~/components/general/settings-header';
import { useCurrentTeam } from '~/providers/team';

export default function TeamEmailSettingsGeneral() {
  const { t } = useLingui();
  const { toast } = useToast();

  const team = useCurrentTeam();
  const organisation = useCurrentOrganisation();

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  // プラン判定
  const planId = resolvePlanIdFromOrganisation(organisation);
  const currentPlan = PLANS[planId];
  const hasCustomEmailAccess = isFeatureEnabledForPlan({ plan: planId, feature: 'customEmailSettings' });

  const { data: teamWithSettings, isLoading: isLoadingTeam } = trpc.team.get.useQuery({
    teamReference: team.url,
  });

  const { mutateAsync: updateTeamSettings } = trpc.team.settings.update.useMutation();

  const onEmailPreferencesSubmit = async (data: TEmailPreferencesFormSchema) => {
    if (!hasCustomEmailAccess && (data.emailReplyTo || data.emailId)) {
      setUpgradeDialogOpen(true);
      return;
    }

    try {
      const { emailId, emailReplyTo, emailDocumentSettings, includeSenderDetails } = data;

      await updateTeamSettings({
        teamId: team.id,
        data: {
          emailId: hasCustomEmailAccess ? emailId : null,
          emailReplyTo: hasCustomEmailAccess ? emailReplyTo : null,
          emailDocumentSettings,
          includeSenderDetails,
        },
      });

      toast({
        title: t`Email preferences updated`,
        description: t`Your email preferences have been updated`,
      });
    } catch (err) {
      toast({
        title: t`Something went wrong!`,
        description: t`We were unable to update your email preferences at this time, please try again later`,
        variant: 'destructive',
      });

      throw err;
    }
  };

  if (isLoadingTeam || !teamWithSettings) {
    return <SpinnerBox />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SettingsHeader
          title={t`Email Preferences`}
          subtitle={t`署名依頼メールの送信元表示や返信先(Reply-To)アドレスを設定します。`}
        />
        <div>
          {hasCustomEmailAccess ? (
            <Badge
              variant="default"
              className="border-emerald-600/40 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-700 dark:text-emerald-400"
            >
              <ShieldCheckIcon className="mr-1.5 h-4 w-4 text-emerald-600" />
              <span>{currentPlan.label} 特典利用中</span>
            </Badge>
          ) : (
            <Badge
              variant="warning"
              className="border-amber-600/40 bg-amber-500/10 px-3 py-1 font-bold text-amber-700 dark:text-amber-400"
            >
              <LockIcon className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
              <Trans>無料プラン（自社送信元ロック中）</Trans>
            </Badge>
          )}
        </div>
      </div>

      {/* 無料プラン向け アップセル誘導カード */}
      {!hasCustomEmailAccess && (
        <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-background to-amber-500/5 shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="font-bold">
                    <LockIcon className="mr-1 h-3.5 w-3.5" />
                    <Trans>有料プラン限定機能</Trans>
                  </Badge>
                  <span className="font-semibold text-muted-foreground text-xs">
                    <Trans>中小応援スタンダード以上で利用可能</Trans>
                  </span>
                </div>
                <h3 className="font-bold text-foreground text-lg">
                  <Trans>自社ブランド送信元＆返信先アドレス（Reply-To）設定</Trans>
                </h3>
                <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
                  <Trans>
                    取引先への署名依頼メールで、送信元に自社名を表示し、相手が返信した際の宛先を自社のメールアドレス（例:
                    info@yourcompany.co.jp）に指定する機能は、
                    <strong>中小応援スタンダードプラン（月額2,980円）</strong>以上でご利用いただけます。
                  </Trans>
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
                    <Trans>取引先の信頼感向上（不審メール扱いを防止）</Trans>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
                    <Trans>署名回収スピードの改善</Trans>
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 font-bold text-white shadow-md shadow-red-600/20 hover:from-red-700 hover:to-red-800 sm:w-auto"
                >
                  <Link to={`/t/${team.url}/settings/billing`}>
                    <span>
                      <Trans>スタンダードへアップグレード</Trans>
                    </span>
                    <ArrowRightIcon className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <section className={!hasCustomEmailAccess ? 'opacity-90' : ''}>
        <EmailPreferencesForm
          canInherit={true}
          settings={teamWithSettings.teamSettings}
          onFormSubmit={onEmailPreferencesSubmit}
        />
      </section>

      {/* アップグレード誘導ダイアログ */}
      <PlanLimitUpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        teamUrl={team.url}
        limitCount={3}
        currentPlanLabel={currentPlan.label}
      />
    </div>
  );
}
