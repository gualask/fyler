type DevFixtureKind = 'runtime' | 'workflow' | 'component' | 'index';

type DevFixtureVariant = {
    label: string;
    href: string;
};

export type DevFixtureContract = {
    key: string;
    title: string;
    description: string;
    kind: DevFixtureKind;
    assertions: string[];
    limitations: string[];
    variants: DevFixtureVariant[];
};

declare global {
    interface Window {
        __FYLER_DEV_FIXTURE__?: DevFixtureContract;
    }
}
