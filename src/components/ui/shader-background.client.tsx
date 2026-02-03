"use client";

import dynamic from "next/dynamic";

const ShaderBackground = dynamic<{
    // Empty props interface as the component takes no props
}>(() =>
    import("./shader-background").then((mod) => mod.ShaderBackground), {
    ssr: false,
});

export default ShaderBackground;
