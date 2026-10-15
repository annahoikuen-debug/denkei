import { Input } from '@documenso/ui/primitives/input';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { useQueryStates } from 'nuqs';
import { useState, useEffect } from 'react';

import { documentsSearchParams } from '~/utils/documents-search-params';

export const DocumentElectronicLedgerFilters = () => {
  const { _ } = useLingui();

  const [{ contractType, counterpartyName, contractAmount, contractDateFrom, contractDateTo }, setSearchParams] =
    useQueryStates(
      {
        contractType: documentsSearchParams.contractType,
        counterpartyName: documentsSearchParams.counterpartyName,
        contractAmount: documentsSearchParams.contractAmount,
        contractDateFrom: documentsSearchParams.contractDateFrom,
        contractDateTo: documentsSearchParams.contractDateTo,
      },
      { history: 'push' },
    );

  const [localContractType, setLocalContractType] = useState(contractType ?? '');
  const [localCounterpartyName, setLocalCounterpartyName] = useState(counterpartyName ?? '');
  const [localContractAmount, setLocalContractAmount] = useState(contractAmount ?? '');
  const [localContractDateFrom, setLocalContractDateFrom] = useState(contractDateFrom ?? '');
  const [localContractDateTo, setLocalContractDateTo] = useState(contractDateTo ?? '');

  const debouncedSetParams = () => {
    void setSearchParams({
      contractType: localContractType || null,
      counterpartyName: localCounterpartyName || null,
      contractAmount: localContractAmount || null,
      contractDateFrom: localContractDateFrom || null,
      contractDateTo: localContractDateTo || null,
    });
  };

  useEffect(() => {
    const timer = setTimeout(debouncedSetParams, 500);
    return () => clearTimeout(timer);
  }, [localContractType, localCounterpartyName, localContractAmount, localContractDateFrom, localContractDateTo, debouncedSetParams]);

  const hasFilters = Boolean(contractType || counterpartyName || contractAmount || contractDateFrom || contractDateTo);

  const onResetFilters = () => {
    setLocalContractType('');
    setLocalCounterpartyName('');
    setLocalContractAmount('');
    setLocalContractDateFrom('');
    setLocalContractDateTo('');
    void setSearchParams({
      contractType: null,
      counterpartyName: null,
      contractAmount: null,
      contractDateFrom: null,
      contractDateTo: null,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-4">
      <div className="w-48">
        <Input
          type="text"
          placeholder={_(msg`契約種別`)}
          value={localContractType}
          onChange={(e) => setLocalContractType(e.target.value)}
        />
      </div>

      <div className="w-48">
        <Input
          type="text"
          placeholder={_(msg`取引先名`)}
          value={localCounterpartyName}
          onChange={(e) => setLocalCounterpartyName(e.target.value)}
        />
      </div>

      <div className="w-40">
        <Input
          type="text"
          placeholder={_(msg`金額(円)`)}
          value={localContractAmount}
          onChange={(e) => setLocalContractAmount(e.target.value)}
        />
      </div>

      <div className="w-40">
        <Input
          type="date"
          value={localContractDateFrom}
          onChange={(e) => setLocalContractDateFrom(e.target.value)}
        />
      </div>

      <div className="w-40">
        <Input
          type="date"
          value={localContractDateTo}
          onChange={(e) => setLocalContractDateTo(e.target.value)}
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          className="px-2 text-muted-foreground lg:px-3"
          onClick={onResetFilters}
        >
          <span className="flex items-center gap-1">
            {_(msg`Reset`)}
          </span>
        </button>
      )}
    </div>
  );
};