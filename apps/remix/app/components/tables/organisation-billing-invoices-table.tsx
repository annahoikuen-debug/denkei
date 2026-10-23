import { useCurrentOrganisation } from '@documenso/lib/client-only/providers/organisation';
import { calculateConsumptionTax, DEFAULT_ISSUER } from '@documenso/lib/universal/qualified-invoice';
import { trpc } from '@documenso/trpc/react';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import type { DataTableColumnDef } from '@documenso/ui/primitives/data-table';
import { DataTable } from '@documenso/ui/primitives/data-table';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';
import { Skeleton } from '@documenso/ui/primitives/skeleton';
import { TableCell } from '@documenso/ui/primitives/table';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { File, FileText, Printer } from 'lucide-react';
import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

export type OrganisationBillingInvoicesTableProps = {
  organisationId: string;
  subscriptionExists: boolean;
};

export const OrganisationBillingInvoicesTable = ({
  organisationId,
  subscriptionExists,
}: OrganisationBillingInvoicesTableProps) => {
  const { _ } = useLingui();
  const organisation = useCurrentOrganisation();
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const { data, isLoading, isLoadingError } = trpc.enterprise.billing.invoices.get.useQuery(
    {
      organisationId,
    },
    {
      placeholderData: (previousData) => previousData,
    },
  );

  const formatCurrency = (currency: string, amount: number) => {
    const isJpy = currency.toLowerCase() === 'jpy';
    if (isJpy) {
      return `¥${Math.round(amount).toLocaleString('ja-JP')}`;
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    });

    return formatter.format(amount);
  };

  const results = {
    data: data || [],
    perPage: 100,
    currentPage: 1,
    totalPages: 1,
  };

  const columns = useMemo(() => {
    return [
      {
        header: _(msg`Invoice`),
        accessorKey: 'created',
        cell: ({ row }) => (
          <div className="flex max-w-xs items-center gap-2">
            <File className="h-6 w-6" />

            <div className="font-semibold text-foreground/80 text-sm">
              {DateTime.fromSeconds(row.original.created).toFormat('MMMM yyyy')}
            </div>
          </div>
        ),
      },
      {
        header: _(msg`Status`),
        accessorKey: 'status',
        cell: ({ row }) => {
          const { status } = row.original;

          if (!status) {
            return 'N/A';
          }

          return status.charAt(0).toUpperCase() + status.slice(1);
        },
      },
      {
        header: _(msg`Amount`),
        accessorKey: 'total',
        cell: ({ row }) => {
          const isJpy = row.original.currency.toLowerCase() === 'jpy';
          const amount = isJpy ? row.original.total : row.original.total / 100;
          return formatCurrency(row.original.currency, amount);
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedInvoice(row.original)}
              data-testid={`qualified-invoice-${row.original.id}`}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
              <Trans>適格請求書</Trans>
            </Button>

            <Button variant="outline" size="sm" asChild disabled={typeof row.original.hosted_invoice_url !== 'string'}>
              <Link to={row.original.hosted_invoice_url ?? ''} target="_blank">
                <Trans>View</Trans>
              </Link>
            </Button>

            <Button variant="outline" size="sm" asChild disabled={typeof row.original.invoice_pdf !== 'string'}>
              <Link to={row.original.invoice_pdf ?? ''} target="_blank">
                <Trans>Download</Trans>
              </Link>
            </Button>
          </div>
        ),
      },
    ] satisfies DataTableColumnDef<(typeof results)['data'][number]>[];
  }, []);

  if (results.data.length === 0 && !subscriptionExists) {
    return null;
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={results.data}
        perPage={results.perPage}
        currentPage={results.currentPage}
        totalPages={results.totalPages}
        error={{
          enable: isLoadingError,
        }}
        skeleton={{
          enable: isLoading,
          rows: 3,
          component: (
            <>
              <TableCell className="w-1/3 py-4 pr-4">
                <div className="flex w-full flex-row items-center">
                  <Skeleton className="h-7 w-7 flex-shrink-0 rounded" />

                  <div className="ml-2 flex flex-grow flex-col">
                    <Skeleton className="h-4 w-1/2 max-w-[8rem]" />
                    <Skeleton className="mt-1 h-4 w-2/3 max-w-[12rem]" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20 rounded-full" />
              </TableCell>
              <TableCell>
                <div className="flex flex-row justify-end space-x-2">
                  <Skeleton className="h-10 w-20 rounded" />
                  <Skeleton className="h-10 w-16 rounded" />
                </div>
              </TableCell>
            </>
          ),
        }}
      />

      <Dialog open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 font-bold text-xl">
                <FileText className="h-5 w-5 text-primary" />
                <Trans>適格請求書（インボイス）</Trans>
              </DialogTitle>
              <Badge variant="secondary">
                <Trans>登録番号: T1010001999999</Trans>
              </Badge>
            </div>
          </DialogHeader>

          {selectedInvoice &&
            (() => {
              const isJpy = selectedInvoice.currency?.toLowerCase() === 'jpy';
              const gross = isJpy ? selectedInvoice.total : Math.round(selectedInvoice.total / 100);
              const tax = calculateConsumptionTax(gross);
              const invoiceDate = DateTime.fromSeconds(selectedInvoice.created).toFormat('yyyy年MM月dd日');
              const invoiceNo = selectedInvoice.number || selectedInvoice.id;

              return (
                <div className="space-y-6 pt-2 print:p-0" id="qualified-invoice-print-area">
                  <div className="flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row">
                    <div>
                      <div className="border-foreground/40 border-b pb-1 font-bold text-lg">
                        {organisation.name} <span className="font-normal text-sm">御中</span>
                      </div>
                      <p className="mt-2 text-muted-foreground text-xs">
                        <Trans>下記の通りご請求申し上げます。</Trans>
                      </p>
                    </div>
                    <div className="space-y-1 text-right text-xs">
                      <div className="font-semibold text-sm">{DEFAULT_ISSUER.name}</div>
                      <div className="text-muted-foreground">登録番号: {DEFAULT_ISSUER.registrationNumber}</div>
                      <div className="text-muted-foreground">{DEFAULT_ISSUER.address}</div>
                      <div className="pt-2 text-muted-foreground">
                        請求番号: <strong>{invoiceNo}</strong>
                      </div>
                      <div className="text-muted-foreground">発行日: {invoiceDate}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <span className="font-medium text-foreground text-sm">
                      <Trans>ご請求金額 (税込)</Trans>
                    </span>
                    <span className="font-bold text-2xl text-foreground">¥{gross.toLocaleString('ja-JP')}</span>
                  </div>

                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="p-2.5 text-left font-medium">品目 / 摘要</th>
                        <th className="p-2.5 text-center font-medium">税率</th>
                        <th className="p-2.5 text-right font-medium">税抜金額</th>
                        <th className="p-2.5 text-right font-medium">消費税額 (10%)</th>
                        <th className="p-2.5 text-right font-medium">税込金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2.5 font-medium">
                          {gross >= 29000
                            ? 'デンケイ スタンダード年一括利用料 (100件/月・実質2ヶ月無料)'
                            : 'デンケイ スタンダード月額利用料 (100件/月)'}
                        </td>
                        <td className="p-2.5 text-center">10%</td>
                        <td className="p-2.5 text-right">¥{tax.netAmountJpy.toLocaleString('ja-JP')}</td>
                        <td className="p-2.5 text-right">¥{tax.taxAmountJpy.toLocaleString('ja-JP')}</td>
                        <td className="p-2.5 text-right font-semibold">¥{gross.toLocaleString('ja-JP')}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="ml-auto w-72 space-y-1 text-xs">
                    <div className="flex justify-between border-border/50 border-b py-1">
                      <span className="text-muted-foreground">10%対象金額 (税抜):</span>
                      <span className="font-medium">¥{tax.netAmountJpy.toLocaleString('ja-JP')}</span>
                    </div>
                    <div className="flex justify-between border-border/50 border-b py-1">
                      <span className="text-muted-foreground">消費税額等 (10%):</span>
                      <span className="font-medium">¥{tax.taxAmountJpy.toLocaleString('ja-JP')}</span>
                    </div>
                    <div className="flex justify-between border-border border-t py-1.5 font-bold text-sm">
                      <span>合計金額 (税込):</span>
                      <span className="text-primary">¥{gross.toLocaleString('ja-JP')}</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
                    <Trans>
                      ※ 本請求書は消費税法第57条の4に定める適格請求書（インボイス）の要件を満たしています。
                      <br />※ 電子帳簿保存法（電子取引データ保存）に基づき、適切に保存してください。
                    </Trans>
                  </div>
                </div>
              );
            })()}

          <DialogFooter className="mt-4 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                <Trans>閉じる</Trans>
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={() => {
                window.print();
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              <Trans>印刷 / PDF保存</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
