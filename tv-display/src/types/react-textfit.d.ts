declare module 'react-textfit' {
  import { ComponentType, ReactNode } from 'react';

  interface TextfitProps {
    mode?: 'single' | 'multi';
    min?: number;
    max?: number;
    forceSingleModeWidth?: boolean;
    throttle?: number;
    onReady?: (fontSize: number) => void;
    children?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }

  export const Textfit: ComponentType<TextfitProps>;
}
