import { useSupportDiagnostics } from './components/support-diagnostics.hook';

export { SupportDialog } from './components/support-dialog/SupportDialog';
export { useSupportDiagnostics };
export type SupportDiagnosticsApi = ReturnType<typeof useSupportDiagnostics>;
