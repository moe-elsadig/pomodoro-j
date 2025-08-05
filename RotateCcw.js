import React from "react";

const RotateCcw = ({ size = 24, className = "", ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <polyline points="1,4 1,10 7,10" />
        <path d="M3.51,15a9,9,0,0,0,14.85-3.36,9,9,0,0,0-4.34-9.58A9,9,0,0,0,1,10" />
    </svg>
);

export default RotateCcw;
