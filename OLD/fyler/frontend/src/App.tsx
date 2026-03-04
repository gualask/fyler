import {useCallback, useMemo, useState} from 'react';
import {
    AppShell,
    Button,
    Divider,
    Group,
    ScrollArea,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import {IconDownload, IconFilePlus, IconFileTypePdf, IconTrash} from '@tabler/icons-react';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';

import type {Doc, MergeRequest} from './domain';
import {getPDFPreviewUrl, mergePDFs, openPDFsDialog, savePDFDialog} from './platform';
import {DocumentRow} from './components/DocumentRow';
import {PdfPreview} from './components/PdfPreview';

function App() {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');

    const selectedDoc = useMemo(() => docs.find(d => d.id === selectedId) ?? null, [docs, selectedId]);
    const selectedPreviewUrl = useMemo(
        () => (selectedDoc ? getPDFPreviewUrl(selectedDoc.path) : null),
        [selectedDoc?.path],
    );

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
    );

    const addPDFs = useCallback(async () => {
        try {
            setError(null);
            const newDocs = await openPDFsDialog();
            if (newDocs.length === 0) return;

            setDocs(prev => [...prev, ...newDocs]);
            setSelectedId(prev => prev ?? newDocs[0].id);
        } catch (e: any) {
            setError(e?.message ?? String(e));
        }
    }, []);

    const removeSelected = useCallback(() => {
        setDocs(prev => {
            const next = prev.filter(d => d.id !== selectedId);
            setSelectedId(next.length ? next[0].id : null);
            return next;
        });
    }, [selectedId]);

    const updatePageSpec = useCallback((id: string, pageSpec: string) => {
        setDocs(prev => prev.map(d => (d.id === id ? {...d, pageSpec} : d)));
    }, []);

    const onDragEnd = useCallback((event: any) => {
        const {active, over} = event;
        if (!over || active.id === over.id) return;
        setDocs(items => {
            const oldIndex = items.findIndex(i => i.id === active.id);
            const newIndex = items.findIndex(i => i.id === over.id);
            return arrayMove(items, oldIndex, newIndex);
        });
    }, []);

    const exportMerged = useCallback(async () => {
        if (docs.length === 0) return;

        try {
            setError(null);
            const outputPath = await savePDFDialog('merged.pdf');
            if (!outputPath) return;

            const req: MergeRequest = {
                inputs: docs.map(d => ({path: d.path, pageSpec: d.pageSpec})),
                outputPath,
            };
            await mergePDFs(req);
        } catch (e: any) {
            setError(e?.message ?? String(e));
        }
    }, [docs]);

    return (
        <AppShell padding="md" header={{height: 60}} footer={{height: 32}}>
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group gap="sm">
                        <IconFileTypePdf size={20}/>
                        <Title order={4}>Fyler</Title>
                    </Group>
                    <Group gap="sm">
                        <Button leftSection={<IconFilePlus size={16}/>} variant="light" onClick={addPDFs}>
                            Aggiungi PDF
                        </Button>
                        <Button
                            leftSection={<IconTrash size={16}/>}
                            variant="light"
                            color="red"
                            disabled={!selectedId}
                            onClick={removeSelected}
                        >
                            Rimuovi
                        </Button>
                        <Button leftSection={<IconDownload size={16}/>} disabled={docs.length === 0} onClick={exportMerged}>
                            Esporta PDF
                        </Button>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Main style={{display: 'flex', height: '100dvh', boxSizing: 'border-box', overflow: 'hidden'}}>
                <Group align="stretch" gap="md" wrap="nowrap" style={{flex: 1, minHeight: 0, overflow: 'hidden'}}>
                    <Stack style={{width: 420, minHeight: 0}} gap="xs">
                        <Group justify="space-between">
                            <Text fw={600}>Documenti</Text>
                            <Text c="dimmed" size="sm">
                                {docs.length} file
                            </Text>
                        </Group>
                        {error ? (
                            <Text c="red" size="sm">
                                {error}
                            </Text>
                        ) : null}
                        <Divider/>
                        <ScrollArea style={{flex: 1, minHeight: 0}} type="auto">
                            {docs.length === 0 ? (
                                <Text c="dimmed" size="sm">
                                    Aggiungi uno o più PDF per iniziare.
                                </Text>
                            ) : (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                                    <SortableContext items={docs.map(d => d.id)} strategy={verticalListSortingStrategy}>
                                        <Stack gap="xs">
                                            {docs.map(d => (
                                                <DocumentRow
                                                    key={d.id}
                                                    doc={d}
                                                    selected={d.id === selectedId}
                                                    onSelect={() => setSelectedId(d.id)}
                                                    onPageSpecChange={v => updatePageSpec(d.id, v)}
                                                />
                                            ))}
                                        </Stack>
                                    </SortableContext>
                                </DndContext>
                            )}
                        </ScrollArea>
                    </Stack>

                    <Stack style={{flex: 1, minWidth: 0, minHeight: 0}} gap="xs">
                        <Group justify="space-between">
                            <Text fw={600}>Anteprima</Text>
                            <Text c="dimmed" size="sm" truncate>
                                {selectedDoc ? selectedDoc.name : 'Nessun documento selezionato'}
                            </Text>
                        </Group>
                        <Divider/>
                        <div style={{flex: 1, minHeight: 0, overflow: 'hidden'}}>
                            {selectedDoc ? (
                                <PdfPreview key={selectedDoc.id} url={selectedPreviewUrl!} onStatus={setStatus}/>
                            ) : (
                                <Text c="dimmed" size="sm">
                                    Seleziona un documento per visualizzare l'anteprima.
                                </Text>
                            )}
                        </div>
                    </Stack>
                </Group>
            </AppShell.Main>

            <AppShell.Footer>
                <Group h="100%" px="md" justify="space-between">
                    <Text size="xs" c="dimmed" truncate>
                        {status || 'Pronto'}
                    </Text>
                </Group>
            </AppShell.Footer>
        </AppShell>
    );
}

export default App;
