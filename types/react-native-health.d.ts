/**
 * Minimal ambient declaration for `react-native-health`.
 *
 * The full SDK is only loaded at runtime on iOS (dynamic import); this stub
 * exists so `tsc --noEmit` can resolve the literal module specifier.
 */

declare module 'react-native-health' {
  interface AppleHealthKitConstants {
    Permissions: Record<string, string>;
    [key: string]: unknown;
  }

  interface AppleHealthKitModule {
    Constants: AppleHealthKitConstants;
    initHealthKit: (opts: unknown, cb: (err: unknown) => void) => void;
    [key: string]: unknown;
  }

  const AppleHealthKit: AppleHealthKitModule;
  export default AppleHealthKit;
}
