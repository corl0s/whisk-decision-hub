// Pure-JS LightGBM tree walker for the dump_model() format.
// Handles numeric (<=) and categorical (==) splits with '||'-joined thresholds.

export type Node = {
  split_feature?: number;
  threshold?: number | string;
  decision_type?: "<=" | "==";
  default_left?: boolean;
  left_child?: Node;
  right_child?: Node;
  leaf_value?: number;
  internal_value?: number;
};

export interface QuantityModel {
  version: string;
  objective: string;
  feature_names: string[];
  n_trees: number;
  neighborhood_categories: string[];
  categorical_features: string[];
  trees: Node[];
}

function walk(node: Node, x: (number | null)[]): { value: number; path: number[] } {
  const path: number[] = [];
  let n: Node = node;
  while (true) {
    if (n.leaf_value !== undefined) {
      return { value: n.leaf_value, path };
    }
    const f = n.split_feature!;
    const v = x[f];
    let goLeft: boolean;
    if (v === null || v === undefined || Number.isNaN(v as number)) {
      goLeft = !!n.default_left;
    } else if (n.decision_type === "<=") {
      goLeft = (v as number) <= (n.threshold as number);
    } else {
      // categorical: threshold is "a||b||c", node sends matching → left
      const cats = String(n.threshold).split("||").map(Number);
      goLeft = cats.includes(v as number);
    }
    path.push(f);
    n = (goLeft ? n.left_child : n.right_child)!;
  }
}

export function predict(model: QuantityModel, x: (number | null)[]): { value: number; featureUsage: Record<number, number> } {
  let sum = 0;
  const featureUsage: Record<number, number> = {};
  for (const tree of model.trees) {
    const { value, path } = walk(tree, x);
    sum += value;
    for (const f of path) featureUsage[f] = (featureUsage[f] ?? 0) + 1;
  }
  return { value: sum, featureUsage };
}
