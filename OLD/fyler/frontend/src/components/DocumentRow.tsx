import type {CSSProperties} from 'react';
import {Group, Paper, Text, TextInput} from '@mantine/core';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {IconGripVertical} from '@tabler/icons-react';
import type {Doc} from '../domain';

export function DocumentRow(props: {
    doc: Doc;
    selected: boolean;
    onSelect: () => void;
    onPageSpecChange: (value: string) => void;
}) {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: props.doc.id});

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <Paper
            ref={setNodeRef}
            style={style}
            withBorder
            p="sm"
            radius="md"
            onClick={props.onSelect}
            bg={props.selected ? 'var(--mantine-color-blue-light)' : undefined}
        >
            <Group gap="sm" align="flex-start" wrap="nowrap">
                <div
                    {...attributes}
                    {...listeners}
                    onClick={e => e.stopPropagation()}
                    style={{cursor: 'grab', paddingTop: 4}}
                >
                    <IconGripVertical size={16}/>
                </div>

                <div style={{flex: 1, minWidth: 0}}>
                    <Group justify="space-between" gap="xs" wrap="nowrap">
                        <Text fw={600} size="sm" truncate>
                            {props.doc.name}
                        </Text>
                        <Text c="dimmed" size="xs">
                            {props.doc.pageCount} pag
                        </Text>
                    </Group>
                    <TextInput
                        mt="xs"
                        size="xs"
                        placeholder="Pagine (es. 1-3,5,8)"
                        value={props.doc.pageSpec}
                        onChange={e => props.onPageSpecChange(e.currentTarget.value)}
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            </Group>
        </Paper>
    );
}
