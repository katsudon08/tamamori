function fnv1a(input: string): number {
    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193); // FNV prime
    }
    return hash >>> 0; // unsigned 32-bit
}

export function hashForBranch(
    userId: string,
    branchIndex: number,
): { angle: number; seed: number } {
    const angle = fnv1a(`${userId}:angle:${branchIndex}`) % 360;
    const seed = fnv1a(`${userId}:seed:${branchIndex}`);
    return { angle, seed };
}
