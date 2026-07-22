// user_id から個体差シードを決定論的に算出する (visual.md §5: seed は user_id から算出、保存しない)
// FNV-1a 32bit ハッシュ。userId はすべて引数で受け取る（ADR-008: domain は純粋。Math.random() を呼ばない）

// FNV-1a 32bit の規格定数（変更するとハッシュが別物になる不変値）
const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;

export function seed(userId: string): number {
  let h = FNV_OFFSET_BASIS;
  for (let i = 0; i < userId.length; i++) {
    // user_id は uuid = ASCII のため charCodeAt で十分
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  // uint32 (0..4294967295) に丸めて返す
  return h >>> 0;
}
