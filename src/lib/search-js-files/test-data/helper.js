// Helper module with various exports
export function helper() {
  return 'helper';
}

export function anotherHelper(x, y) {
  return x + y;
}

export const HELPER_CONSTANT = 'constant';

// Default export
export default {
  helper,
  anotherHelper,
};
