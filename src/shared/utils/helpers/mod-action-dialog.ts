const dialogTypes = [
  "showBanDialog",
  "showRemoveDialog",
  "showPurgeDialog",
  "showReportDialog",
] as const;

export type DialogType = (typeof dialogTypes)[number];

export type DialogState = { [key in DialogType]: boolean };

export function getDialogShowToggleFn<T extends DialogState>(
  dialogType: DialogType,
  stateOverride: Partial<T> = {},
) {
  return (prev: T) => ({
    ...prev,
    [dialogType]: !prev[dialogType],
    ...dialogTypes
      .filter(dt => dt !== dialogType)
      .reduce(
        (acc, dt) => ({
          ...acc,
          [dt]: false,
        }),
        {},
      ),
    ...stateOverride,
  });
}

export function getHideAllState(): DialogState {
  return {
    showBanDialog: false,
    showPurgeDialog: false,
    showRemoveDialog: false,
    showReportDialog: false,
  };
}
