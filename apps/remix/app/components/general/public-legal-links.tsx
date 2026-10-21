import { NEXT_PUBLIC_IMPRINT_URL } from '@documenso/lib/constants/app';
import { cn } from '@documenso/ui/lib/utils';
import { DropdownMenuItem, DropdownMenuSeparator } from '@documenso/ui/primitives/dropdown-menu';
import { Link } from 'react-router';
import { RecipientHelpDialog } from '~/components/dialogs/recipient-help-dialog';

export type PublicLegalLinksProps = {
  className?: string;
};

export const PublicLegalLinks = ({ className }: PublicLegalLinksProps) => {
  const links = getPublicLegalLinks();

  if (links.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-muted-foreground text-xs',
        className,
      )}
    >
      <RecipientHelpDialog />
      {links.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          target={link.target}
          rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
          className="duration-200 hover:text-foreground hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
};

export const PublicLegalLinksDropdownMenuItems = () => {
  const links = getPublicLegalLinks();

  if (links.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenuSeparator />

      {links.map((link) => (
        <DropdownMenuItem key={link.href} asChild className="text-muted-foreground text-xs">
          <Link to={link.href} target={link.target} rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}>
            {link.label}
          </Link>
        </DropdownMenuItem>
      ))}
    </>
  );
};

const getPublicLegalLinks = () => {
  const imprintUrl = NEXT_PUBLIC_IMPRINT_URL();

  // デンケイでは法務ページをアプリ内ルートとして提供する（常に表示）。
  const links = [
    { label: '利用規約', href: '/terms', target: undefined },
    { label: 'プライバシーポリシー', href: '/privacy', target: undefined },
    { label: '特定商取引法に基づく表記', href: '/tokushoho', target: undefined },
    imprintUrl ? { label: '運営者情報', href: imprintUrl, target: '_blank' as const } : null,
  ];

  return links.filter((link) => link !== null);
};
