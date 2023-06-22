const SHORTNUM_SI_FORMAT = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 3,
  //@ts-ignore
  notation: "compact",
  compactDisplay: "short",
});

export default function numToSI(value: number): string {
  return SHORTNUM_SI_FORMAT.format(value);
}
