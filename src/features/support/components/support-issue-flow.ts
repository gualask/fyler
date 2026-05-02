export async function openSupportIssue({
    title,
    body,
    copyDiagnostics,
    openGitHubIssue,
}: {
    title: string;
    body: string;
    copyDiagnostics: () => Promise<void>;
    openGitHubIssue: (params: {
        title: string;
        body: string;
    }) => Promise<'prefilled' | 'blank_fallback'>;
}): Promise<{
    diagnosticsCopied: boolean;
    openResult: 'prefilled' | 'blank_fallback';
}> {
    let diagnosticsCopied = true;

    try {
        await copyDiagnostics();
    } catch {
        diagnosticsCopied = false;
    }

    const openResult = await openGitHubIssue({ title, body });
    return {
        diagnosticsCopied,
        openResult,
    };
}
