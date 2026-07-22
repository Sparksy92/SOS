/**
 * IdentificationKey Model & Decision Tree Traversal Utilities
 */
export function createIdentificationKey(data = {}) {
  return {
    id: data.id || `key_${Date.now()}`,
    module: data.module || 'mycology',
    region: data.region || 'global',
    title: data.title || 'Field Diagnostic Key',
    description: data.description || '',
    keyTree: data.keyTree || { root: 'start', nodes: {} },
    version: data.version || '1.0.0'
  };
}

export function getCurrentQuestionNode(keyTree, currentNodeId) {
  if (!keyTree || !keyTree.nodes) return null;
  const nodeId = currentNodeId || keyTree.root;
  return keyTree.nodes[nodeId] || null;
}
