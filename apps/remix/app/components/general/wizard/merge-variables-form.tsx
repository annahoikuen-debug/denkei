import type { TMergeVariableList, TMergeVariableValues } from '@documenso/lib/types/merge-variables';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';

/**
 * フェーズ3 ステップ7: テンプレート差し込み変数の動的入力フォーム
 *
 * テンプレートに定義された変数一覧(mergeVariables)から、
 * 型(text/number/currency/date/wareki)に応じた入力フィールドを自動生成する。
 */

export type MergeVariablesFormProps = {
  variables: TMergeVariableList;
  values: TMergeVariableValues;
  onChange: (values: TMergeVariableValues) => void;
  errors?: Record<string, string>;
};

export const MergeVariablesForm = ({ variables, values, onChange, errors = {} }: MergeVariablesFormProps) => {
  const { _ } = useLingui();

  if (variables.length === 0) {
    return null;
  }

  const handleInputChange = (name: string, val: string) => {
    onChange({
      ...values,
      [name]: val,
    });
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4" data-testid="wizard-merge-variables">
      <div>
        <h3 className="font-medium text-foreground text-sm">
          <Trans>差し込み変数の入力</Trans>
        </h3>
        <p className="mt-0.5 text-muted-foreground text-xs">
          <Trans>このテンプレートで定義されている変数の値を入力してください。契約書PDF内に自動反映されます。</Trans>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {variables.map((variable) => {
          const value = values[variable.name] ?? '';
          const error = errors[variable.name];

          const isDateType = variable.type === 'date' || variable.type === 'wareki';
          const isNumberType = variable.type === 'number' || variable.type === 'currency';

          let placeholder = _(msg`入力してください`);
          if (variable.type === 'currency') {
            placeholder = _(msg`例: 500000 (¥500,000表記)`);
          } else if (variable.type === 'wareki') {
            placeholder = _(msg`例: 2026-10-15 (令和8年10月15日表記)`);
          } else if (variable.type === 'date') {
            placeholder = _(msg`例: 2026-10-15`);
          } else if (variable.type === 'number') {
            placeholder = _(msg`例: 10`);
          }

          return (
            <div key={variable.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={`var-${variable.name}`} className="font-medium text-xs">
                  {variable.label || variable.name}
                  {variable.required && <span className="ml-1 text-destructive">*</span>}
                </Label>
                <span className="text-[10px] text-muted-foreground uppercase">
                  {variable.type === 'currency'
                    ? _(msg`金額`)
                    : variable.type === 'wareki'
                      ? _(msg`和暦`)
                      : variable.type === 'number'
                        ? _(msg`数値`)
                        : variable.type === 'date'
                          ? _(msg`日付`)
                          : _(msg`テキスト`)}
                </span>
              </div>

              <Input
                id={`var-${variable.name}`}
                data-testid={`var-input-${variable.name}`}
                type={isDateType ? 'date' : isNumberType ? 'number' : 'text'}
                placeholder={placeholder}
                value={value}
                onChange={(e) => handleInputChange(variable.name, e.target.value)}
                className={error ? 'border-destructive' : ''}
              />

              {error && <p className="text-[11px] text-destructive">{error}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
