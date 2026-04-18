// Pure-JS LightGBM tree-walker + SHAP-like contributions.
// Walks the JSON-exported trees from train_model.py.
//
// Each tree node is either:
//   { v: leaf_value }                                  // leaf
//   { f, t, op, default_left, l, r }                   // numeric split
//   { f, cat: number[], l, r }                         // categorical "==" split
//
// Contributions: at every split we walk through, attribute the
// (chosen_branch_mean - other_branch_mean) delta to that feature.
// This is a fast approximation of TreeSHAP — sums across trees give
// per-feature impact on the final prediction.

export interface TreeNode {
  v?: number;
  f?: number;
  t?: number;
  op?: string;
  default_left?: boolean;
  cat?: number[];
  l?: TreeNode;
  r?: TreeNode;
}

export interface ModelArtifact {
  version: string;
  trained_at: string;
  objective: string;
  n_trees: number;
  feature_names: string[];
  items: Array<{ id: string; category: string; idx: number; cat_idx: number }>;
  categories: string[];
  metrics?: { val_mae?: number; val_mape_pct?: number; n_train?: number };
  trees: TreeNode[];
}

// Mean of all leaf values reachable below this node (subtree expectation).
// Cached per node by reference using a WeakMap.
const subtreeMeanCache = new WeakMap<TreeNode, number>();
function subtreeMean(node: TreeNode): number {
  if (node.v !== undefined) return node.v;
  const cached = subtreeMeanCache.get(node);
  if (cached !== undefined) return cached;
  const m = (subtreeMean(node.l!) + subtreeMean(node.r!)) / 2;
  subtreeMeanCache.set(node, m);
  return m;
}

interface InferenceResult {
  value: number;
  contributions: Record<string, number>; // feature_name -> delta
}

export function runInference(
  model: ModelArtifact,
  features: number[],
  withContributions: boolean,
): InferenceResult {
  const names = model.feature_names;
  let total = 0;
  const contrib: Record<string, number> = {};

  for (const tree of model.trees) {
    let node = tree;
    while (node.v === undefined) {
      const fv = features[node.f!];
      let goLeft: boolean;
      if (node.cat) {
        // Categorical "==": go LEFT if feature value is in the category set
        goLeft = node.cat.includes(Math.trunc(fv));
      } else {
        // Numeric split: LightGBM convention is `<= threshold` -> left
        goLeft = fv <= node.t!;
        if (Number.isNaN(fv)) goLeft = node.default_left ?? true;
      }
      const chosen = goLeft ? node.l! : node.r!;
      const other  = goLeft ? node.r! : node.l!;
      if (withContributions) {
        const delta = subtreeMean(chosen) - subtreeMean(other);
        const fname = names[node.f!] ?? `f${node.f!}`;
        contrib[fname] = (contrib[fname] ?? 0) + delta * 0.5;
      }
      node = chosen;
    }
    total += node.v!;
  }
  return { value: total, contributions: contrib };
}
