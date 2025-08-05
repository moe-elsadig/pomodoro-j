import React from "react";

const Play = ({ size = 24, className = "", ...props }) => (
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
        <polygon points="5,3 19,12 5,21" />
    </svg>
);

export default Play;
