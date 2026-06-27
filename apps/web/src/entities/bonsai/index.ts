// Public API
export { growthStageSchema, branchSchema, visualStateSchema, bonsaiSchema } from "./model/types";
export { useBonsai, useAllBonsai } from "./api/bonsai-swr";
export { StageIndicator } from "./ui/StageIndicator";
export { BonsaiProgressBar } from "./ui/BonsaiProgressBar";
export { BonsaiScene } from "./ui/BonsaiScene";
export { Bonsai as Bonsai3D } from "./ui/Bonsai";

export type { GrowthStage, Branch, BonsaiVisualState, Bonsai } from "./model/types";
