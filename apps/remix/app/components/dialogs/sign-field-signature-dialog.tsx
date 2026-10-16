import { Button } from '@documenso/ui/primitives/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@documenso/ui/primitives/dialog';
import { SignaturePad } from '@documenso/ui/primitives/signature-pad';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { createCallable } from 'react-call';

import { DocumentSigningDisclosure } from '../general/document-signing/document-signing-disclosure';

export type SignFieldSignatureDialogProps = {
  initialSignature?: string;
  fullName?: string;
  typedSignatureEnabled?: boolean;
  uploadSignatureEnabled?: boolean;
  drawSignatureEnabled?: boolean;
};

export const SignFieldSignatureDialog = createCallable<SignFieldSignatureDialogProps, string | null>(
  ({ call, fullName, typedSignatureEnabled, uploadSignatureEnabled, drawSignatureEnabled, initialSignature }) => {
    const [localSignature, setLocalSignature] = useState(initialSignature);

    return (
      <Dialog open={true} onOpenChange={(value) => (!value ? call.end(null) : null)}>
        <DialogContent position="center" className="max-h-[92dvh] w-[95vw] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
          <div>
            <DialogHeader className="pb-2">
              <DialogTitle className="font-bold text-lg sm:text-xl">
                <Trans>Sign Signature Field</Trans>
              </DialogTitle>
            </DialogHeader>

            <SignaturePad
              fullName={fullName}
              value={localSignature ?? ''}
              onChange={({ value }) => setLocalSignature(value)}
              typedSignatureEnabled={typedSignatureEnabled}
              uploadSignatureEnabled={uploadSignatureEnabled}
              drawSignatureEnabled={drawSignatureEnabled}
            />
          </div>

          <DocumentSigningDisclosure />

          <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full sm:h-9 sm:w-auto"
              onClick={() => call.end(null)}
            >
              <Trans>Cancel</Trans>
            </Button>

            <Button
              type="button"
              disabled={!localSignature}
              className="h-11 w-full font-semibold text-base sm:h-9 sm:w-auto"
              onClick={() => call.end(localSignature || null)}
            >
              <Trans>Sign</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);
