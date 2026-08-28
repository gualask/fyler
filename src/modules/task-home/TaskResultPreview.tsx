function TransformationArrow() {
    return (
        <g className="stroke-ui-text-muted opacity-70" fill="none" strokeWidth="1.5">
            <path d="M112 41h25" strokeLinecap="round" />
            <path d="m132 36 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
    );
}

type DocumentLineProps = {
    x: number;
    y: number;
    width: number;
    height?: number;
    className: string;
};

function DocumentLine({ x, y, width, height = 3, className }: DocumentLineProps) {
    return <rect x={x} y={y} width={width} height={height} rx={height / 2} className={className} />;
}

function MergePreview() {
    return (
        <>
            <g strokeWidth="1.25">
                <g transform="translate(8 19) rotate(-7 16 22)">
                    <rect
                        width="32"
                        height="44"
                        rx="3"
                        className="fill-ui-surface-subtle stroke-ui-border-hover"
                    />
                    <rect x="5" y="6" width="22" height="17" rx="2" className="fill-ui-source" />
                    <path
                        d="m8 20 6-6 4 4 4-3 4 5"
                        className="stroke-ui-kind-image"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <circle cx="21" cy="11" r="2" className="fill-ui-kind-image" />
                </g>
                <g transform="translate(35 10)">
                    <rect
                        width="34"
                        height="48"
                        rx="3"
                        className="fill-ui-surface stroke-ui-border-hover"
                    />
                    <DocumentLine x={6} y={8} width={22} className="fill-ui-border-hover" />
                    <DocumentLine x={6} y={15} width={18} className="fill-ui-border" />
                    <DocumentLine x={6} y={22} width={21} className="fill-ui-border" />
                    <rect
                        x="6"
                        y="34"
                        width="15"
                        height="7"
                        rx="2"
                        className="fill-ui-kind-pdf opacity-80"
                    />
                </g>
                <g transform="translate(66 20) rotate(6 15 21)">
                    <rect
                        width="30"
                        height="42"
                        rx="3"
                        className="fill-ui-surface-subtle stroke-ui-border-hover"
                    />
                    <DocumentLine x={5} y={7} width={20} className="fill-ui-border-hover" />
                    <DocumentLine x={5} y={14} width={16} className="fill-ui-border" />
                    <DocumentLine x={5} y={21} width={19} className="fill-ui-border" />
                </g>
            </g>
            <TransformationArrow />
            <g strokeWidth="1.5">
                <path
                    d="M181 7h33l14 14v54h-47z"
                    className="fill-ui-accent-soft stroke-ui-accent-muted"
                    strokeLinejoin="round"
                />
                <path
                    d="M214 7v14h14"
                    className="stroke-ui-accent-muted"
                    fill="none"
                    strokeLinejoin="round"
                />
                <DocumentLine
                    x={188}
                    y={19}
                    width={20}
                    className="fill-ui-accent-muted opacity-45"
                />
                <DocumentLine
                    x={188}
                    y={27}
                    width={28}
                    className="fill-ui-accent-muted opacity-30"
                />
                <rect
                    x="188"
                    y="39"
                    width="23"
                    height="11"
                    rx="2.5"
                    className="fill-ui-surface stroke-ui-accent-muted"
                    strokeWidth="1"
                />
                <text
                    x="193"
                    y="47"
                    className="fill-ui-accent-on-soft"
                    fontSize="7"
                    fontWeight="700"
                    stroke="none"
                >
                    PDF
                </text>
                <path
                    d="M188 58h20M188 63h16"
                    className="stroke-ui-accent-muted opacity-35"
                    fill="none"
                    strokeLinecap="round"
                    strokeWidth="2"
                />
                <text
                    x="211"
                    y="69"
                    className="fill-ui-accent-on-soft"
                    fontSize="7"
                    fontWeight="700"
                    stroke="none"
                >
                    1/3
                </text>
            </g>
        </>
    );
}

function IdCard({ x, y }: { x: number; y: number }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <rect
                width="43"
                height="27"
                rx="4"
                className="fill-ui-surface-subtle stroke-ui-border-hover"
                strokeWidth="1.25"
            />
            <circle cx="10" cy="12" r="4" className="fill-ui-border-hover" />
            <path d="M5 22c1.5-4 8.5-4 10 0" className="fill-ui-border-hover" />
            <DocumentLine x={20} y={8} width={17} className="fill-ui-border-hover" />
            <DocumentLine x={20} y={15} width={13} className="fill-ui-border" />
        </g>
    );
}

function CompositionPreview() {
    return (
        <>
            <IdCard x={5} y={12} />
            <g transform="translate(54 43)">
                <rect
                    width="43"
                    height="27"
                    rx="4"
                    className="fill-ui-surface-subtle stroke-ui-border-hover"
                    strokeWidth="1.25"
                />
                <DocumentLine x={6} y={7} width={31} className="fill-ui-border-hover" />
                <DocumentLine x={6} y={14} width={24} className="fill-ui-border" />
            </g>
            <TransformationArrow />
            <g>
                <rect
                    x="177"
                    y="5"
                    width="50"
                    height="72"
                    rx="4"
                    className="fill-ui-accent-soft stroke-ui-accent-muted"
                    strokeWidth="1.5"
                />
                <g transform="translate(184 16) scale(.82)">
                    <IdCard x={0} y={0} />
                </g>
                <g transform="translate(184 45)">
                    <rect
                        width="35"
                        height="20"
                        rx="3"
                        className="fill-ui-surface stroke-ui-accent-muted"
                        strokeWidth="1"
                    />
                    <DocumentLine
                        x={5}
                        y={6}
                        width={25}
                        height={2.5}
                        className="fill-ui-accent-muted opacity-55"
                    />
                    <DocumentLine
                        x={5}
                        y={12}
                        width={19}
                        height={2.5}
                        className="fill-ui-accent-muted opacity-35"
                    />
                </g>
            </g>
        </>
    );
}

function FileSizeRow({
    x,
    y,
    value,
    scale = 1,
    output = false,
}: {
    x: number;
    y: number;
    value: string;
    scale?: number;
    output?: boolean;
}) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <path
                d="M5 1h66l10 10v18H5z"
                className={
                    output
                        ? 'fill-ui-accent-soft stroke-ui-accent-muted'
                        : 'fill-ui-surface-subtle stroke-ui-border-hover'
                }
                strokeWidth="1.25"
                strokeLinejoin="round"
            />
            <path
                d="M71 1v10h10"
                className={output ? 'stroke-ui-accent-muted' : 'stroke-ui-border-hover'}
                fill="none"
                strokeWidth="1.25"
                strokeLinejoin="round"
            />
            <rect
                x="12"
                y="10"
                width="10"
                height="10"
                rx="2"
                className={output ? 'fill-ui-accent-muted opacity-70' : 'fill-ui-border-hover'}
            />
            <text
                x="29"
                y="18"
                className={output ? 'fill-ui-accent-on-soft' : 'fill-ui-text-muted'}
                fontSize="8"
                fontWeight="700"
            >
                {value}
            </text>
        </g>
    );
}

function CompressionPreview() {
    return (
        <>
            <FileSizeRow x={4} y={7} value="8 MB" />
            <FileSizeRow x={4} y={45} value="6 MB" />
            <TransformationArrow />
            <FileSizeRow x={170} y={10} value="2 MB" scale={0.86} output />
            <FileSizeRow x={170} y={47} value="1 MB" scale={0.86} output />
        </>
    );
}

export function TaskResultPreview({ kind }: { kind: 'merge' | 'composition' | 'compression' }) {
    return (
        <span
            aria-hidden="true"
            data-task-preview={kind}
            className="flex h-[82px] w-[260px] shrink-0 items-center justify-center"
        >
            <svg
                viewBox="0 0 260 82"
                className="h-[82px] w-[260px] overflow-visible"
                focusable="false"
            >
                {kind === 'merge' ? <MergePreview /> : null}
                {kind === 'composition' ? <CompositionPreview /> : null}
                {kind === 'compression' ? <CompressionPreview /> : null}
            </svg>
        </span>
    );
}
