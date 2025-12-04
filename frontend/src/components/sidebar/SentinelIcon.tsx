import type { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

/**
 * Sentinel brand icon - anchor motif
 * Represents HMCS Chippawa naval reserve unit
 */
export const SentinelIcon: React.FC<IconSvgProps> = ({
  size = 24,
  width,
  height,
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size || width}
    height={size || height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 6v16" />
    <path d="m19 13 2-1a9 9 0 0 1-18 0l2 1" />
    <path d="M9 11h6" />
    <circle cx="12" cy="4" r="2" />
  </svg>
);

export default SentinelIcon;
